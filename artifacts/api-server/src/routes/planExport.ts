import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  coursePlanItemsTable,
  coursePlanExtrasTable,
} from "@workspace/db";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, isAssignedCoordinator } from "../lib/authz";

const router: IRouter = Router();

type Session = {
  hour: number;
  day: number;
  title: string;
  description: string | null;
  preWork: string | null;
  caseStudy: string | null;
  postWork: string | null;
  date: string | null;
  time: string | null;
  links: string[];
};

async function loadPlan(courseId: number) {
  const course = await getCourse(courseId);
  if (!course) return null;
  const items = await db
    .select()
    .from(coursePlanItemsTable)
    .where(eq(coursePlanItemsTable.courseId, courseId))
    .orderBy(asc(coursePlanItemsTable.hourNumber));
  const extras = await db
    .select()
    .from(coursePlanExtrasTable)
    .where(eq(coursePlanExtrasTable.courseId, courseId));
  const linksByHour = new Map(extras.map((e) => [e.hourNumber, e.links ?? []]));
  const dates = course.planDayDates ?? {};
  const times = course.planDayTimes ?? {};
  const hoursPerDay = course.planHoursPerDay || 1;
  const sessions: Session[] = items.map((it) => {
    const day = Math.ceil(it.hourNumber / hoursPerDay);
    return {
      hour: it.hourNumber,
      day,
      title: it.title,
      description: it.description,
      preWork: it.preWork,
      caseStudy: it.caseStudy,
      postWork: it.postWork,
      date: dates[String(day)] || null,
      time: times[String(day)] || course.planStartTime || null,
      links: linksByHour.get(it.hourNumber) ?? [],
    };
  });
  return { course, sessions };
}

function fileBase(title: string): string {
  return (title || "course").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "course";
}

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------
function runsFromText(text: string): TextRun[] {
  const lines = text.split(/\r?\n/);
  return lines.map((ln, i) => new TextRun(i === 0 ? ln : { text: ln, break: 1 }));
}

async function buildDocx(title: string, sessions: Session[]): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Course Plan", heading: HeadingLevel.HEADING_2 }),
  ];
  if (sessions.length === 0) {
    children.push(new Paragraph({ text: "No sessions have been planned yet." }));
  }
  for (const s of sessions) {
    const meta = s.date ? ` — ${s.date}${s.time ? ` ${s.time}` : ""}` : "";
    children.push(
      new Paragraph({
        text: `Session ${s.hour}${meta}`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240 },
      }),
    );
    children.push(new Paragraph({ children: [new TextRun({ text: s.title || "(untitled)", bold: true })] }));
    const field = (label: string, val: string | null) => {
      if (val && val.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${label}: `, bold: true }), ...runsFromText(val.trim())],
            spacing: { before: 60 },
          }),
        );
      }
    };
    field("Description", s.description);
    field("Pre-work", s.preWork);
    field("Case study", s.caseStudy);
    field("Post-work", s.postWork);
    if (s.links.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Links: ", bold: true }), new TextRun(s.links.join("  •  "))],
          spacing: { before: 60 },
        }),
      );
    }
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// PDF (pdf-lib). Standard fonts use WinAnsi encoding, so sanitize text to a
// safe subset to avoid encode errors on stray Unicode.
// ---------------------------------------------------------------------------
function sanitize(t: string | null | undefined): string {
  return (t || "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/\t/g, "  ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x0A\x20-\x7E]/g, "");
}

async function buildPdf(title: string, sessions: Session[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595.28,
    pageH = 841.89, // A4
    margin = 50,
    maxW = pageW - margin * 2;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensure = (h: number) => {
    if (y - h < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };
  const wrap = (text: string, f: typeof font, size: number): string[] => {
    const out: string[] = [];
    for (const word of text.split(/\s+/)) {
      if (!out.length) { out.push(word); continue; }
      const cur = out[out.length - 1];
      const test = `${cur} ${word}`;
      if (f.widthOfTextAtSize(test, size) > maxW) out.push(word);
      else out[out.length - 1] = test;
    }
    return out.length ? out : [""];
  };
  const line = (text: string, f: typeof font, size: number, color = rgb(0, 0, 0), indent = 0) => {
    ensure(size + 4);
    page.drawText(text, { x: margin + indent, y: y - size, size, font: f, color });
    y -= size + 4;
  };
  const para = (text: string, size: number, indent = 0) => {
    for (const raw of sanitize(text).split(/\n/)) {
      if (!raw.trim()) { y -= size * 0.5; continue; }
      for (const l of wrap(raw, font, size)) line(l, font, size, rgb(0.15, 0.15, 0.15), indent);
    }
  };

  line(sanitize(title), bold, 20);
  y -= 4;
  line("Course Plan", font, 11, rgb(0.4, 0.4, 0.4));
  y -= 8;
  if (sessions.length === 0) line("No sessions have been planned yet.", font, 11, rgb(0.3, 0.3, 0.3));

  for (const s of sessions) {
    ensure(46);
    y -= 8;
    const meta = s.date ? `   ·   ${s.date}${s.time ? ` ${s.time}` : ""}` : "";
    line(sanitize(`Session ${s.hour}${meta}`), bold, 11, rgb(0.25, 0.25, 0.25));
    line(sanitize(s.title || "(untitled)"), bold, 13);
    const field = (label: string, val: string | null) => {
      if (val && val.trim()) {
        line(label, bold, 9, rgb(0.35, 0.35, 0.35));
        para(val.trim(), 10, 10);
      }
    };
    field("Description", s.description);
    field("Pre-work", s.preWork);
    field("Case study", s.caseStudy);
    field("Post-work", s.postWork);
    if (s.links.length) {
      line("Links", bold, 9, rgb(0.35, 0.35, 0.35));
      for (const l of s.links) para(l, 9, 10);
    }
  }
  return pdf.save();
}

async function authorize(courseId: number, req: Request, res: Response) {
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return null;
  }
  const data = await loadPlan(courseId);
  if (!data) {
    res.status(404).json({ error: "Course not found" });
    return null;
  }
  const user = req.localUser!;
  const allowed =
    isCourseTeacher(data.course, user) ||
    user.role === "dean" ||
    (await isAssignedCoordinator(courseId, user));
  if (!allowed) {
    res.status(403).json({ error: "Only the course teacher or oversight can export the plan" });
    return null;
  }
  return data;
}

router.get("/courses/:courseId/plan/export.docx", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const data = await authorize(courseId, req, res);
  if (!data) return;
  const buf = await buildDocx(data.course.title, data.sessions);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase(data.course.title)}_plan.docx"`);
  res.send(buf);
});

router.get("/courses/:courseId/plan/export.pdf", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const data = await authorize(courseId, req, res);
  if (!data) return;
  const bytes = await buildPdf(data.course.title, data.sessions);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase(data.course.title)}_plan.pdf"`);
  res.send(Buffer.from(bytes));
});

export default router;
