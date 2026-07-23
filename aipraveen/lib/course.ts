/**
 * Studio Course curriculum + learning content (verbatim from prototype).
 * Modules are 00-indexed as in the design.
 */
import { formatINR, renewalPrice } from "./format";
import { DEFAULT_RENEW_PERCENT } from "./catalog";

const STUDIO_RENEW = formatINR(renewalPrice(4999, DEFAULT_RENEW_PERCENT)); // ₹2,250

export interface Lesson {
  title: string;
  dur: string;
  desc?: string;
}
export interface Module {
  num: string; // "00"
  title: string;
  dur: string;
  lessons: Lesson[];
}

export const CURRICULUM: Module[] = [
  {
    num: "00",
    title: "Foundations: how builders think with AI",
    dur: "3 SESSIONS · 4.5 HRS",
    lessons: [
      {
        title: "What AI can actually build today",
        dur: "52 MIN",
        desc: "A tour of what non-programmers are shipping with AI right now — and the honest boundaries of what they aren't.",
      },
      {
        title: "The idea-to-spec workflow",
        dur: "58 MIN",
        desc: 'Turn "I wish there was an app for..." into a one-page spec an AI can build from. This workflow is the spine of the whole course.',
      },
      {
        title: "Your toolchain, set up end to end",
        dur: "65 MIN",
        desc: "Set up every tool you'll use for the rest of the course. By the end of this session, your environment builds and deploys.",
      },
    ],
  },
  {
    num: "01",
    title: "Studio I: your first working prototype",
    dur: "5 SESSIONS · 7.5 HRS",
    lessons: [
      {
        title: "From spec to first screen",
        dur: "90 MIN",
        desc: "Take the spec from Module 00 and get a first real screen on the screen. We build together, mistake by mistake.",
      },
      {
        title: "Data in, data out",
        dur: "88 MIN",
        desc: "Wire your prototype to real inputs and outputs. Forms in, results out, nothing hard-coded.",
      },
      {
        title: "Making it not ugly",
        dur: "92 MIN",
        desc: "Design passes that make your prototype presentable without a designer. Practical, not precious.",
      },
    ],
  },
  {
    num: "02",
    title: "Studio II: real data, real users",
    dur: "5 SESSIONS · 7.5 HRS",
    lessons: [
      {
        title: "Accounts and access",
        dur: "85 MIN",
        desc: "Add sign-in and roles so the right people see the right things.",
      },
      {
        title: "Connecting live data sources",
        dur: "95 MIN",
        desc: "Connect a spreadsheet, then an API. Your app now reflects the real world.",
      },
      {
        title: "The feedback loop",
        dur: "80 MIN",
        desc: "Put your prototype in front of three real users and turn what they say into your next build list.",
      },
    ],
  },
  {
    num: "03",
    title: "Studio III: polish and reliability",
    dur: "4 SESSIONS · 6 HRS",
    lessons: [
      { title: "Error states people forgive", dur: "82 MIN" },
      { title: "Speed and cost", dur: "78 MIN" },
      { title: "Ship-day checklist", dur: "75 MIN" },
    ],
  },
  {
    num: "04",
    title: "Build weeks",
    dur: "2 SESSIONS · 3 HRS",
    lessons: [
      {
        title: "Build week brief + working session",
        dur: "90 MIN",
        desc: "One long working session on your own build, with the week's brief as your guide.",
      },
      { title: "Peer review, studio style", dur: "90 MIN" },
    ],
  },
  {
    num: "05",
    title: "Capstone",
    dur: "1 SESSION · 1.5 HRS",
    lessons: [{ title: "Ship it: capstone walkthrough and rubric", dur: "90 MIN" }],
  },
];

/** Flat lesson list (used by the player), preserving module order. */
export const FLAT_LESSONS: (Lesson & { module: string })[] = CURRICULUM.flatMap(
  (m) => m.lessons.map((l) => ({ ...l, module: `${m.num} · ${m.title}` })),
);

export const STUDIO_OUTCOMES = [
  "Ship a working AI-powered app without writing code",
  "Turn a vague idea into a scoped, buildable product",
  "Use AI tools as a design and build partner, not a toy",
  "Deploy something real people can use",
  "Debug and iterate when the AI gets it wrong",
  "Present your capstone as portfolio-grade work",
];

export interface Faq {
  q: string;
  a: string;
}
export const STUDIO_FAQS: Faq[] = [
  {
    q: "What happens after a year?",
    a: `Your access ends. You can renew for ${STUDIO_RENEW} any time — even months later — and renewing restores everything, including your progress, exactly where you left it.`,
  },
  {
    q: "Is a year enough time?",
    a: "The course is 30 hours. A year is enough to finish it three times over at two hours a week. Most learners finish in 8–12 weeks.",
  },
  {
    q: "Can I download the videos or files?",
    a: "Everything lives on the platform — videos stream, and resources open in the built-in viewer on any device. Your progress and notes stay in sync everywhere you sign in.",
  },
  {
    q: "Are there live calls or Q&A sessions?",
    a: "No, and there never will be. The course is designed to be complete on its own — that is the whole point of self-paced.",
  },
  {
    q: "Can I get a refund?",
    a: "No — because you get complete access the moment you buy, all purchases are final and non-refundable. So decide before you buy: the preview is free, the curriculum lists everything inside, and the practice library is free to browse. Unsure? Email support@aipraveen.com before purchasing.",
  },
];

export const STUDIO_FOR_YOU = [
  "You want to ship a real tool, not collect certificates",
  "You can give it 3–5 hours a week",
  "You've never written code — that's fine",
];
export const STUDIO_NOT_FOR_YOU = [
  "You want live mentorship or Q&A calls — there are none",
  "You're after ML theory or model training",
  "You want a certificate more than a product",
];

export interface ProductQuote {
  stars: string;
  text: string;
  who: string;
}
export const STUDIO_PRODUCT_TESTIMONIALS: ProductQuote[] = [
  {
    stars: "★★★★★",
    text: "Finished in six weekends and shipped an internal tool my internship team still uses.",
    who: "ROHAN S. · MBA STUDENT",
  },
  {
    stars: "★★★★",
    text: "The one-year window pushed me to actually finish, which no lifetime course ever managed.",
    who: "VIKRAM N. · B.TECH FINAL YEAR",
  },
];

export interface KitItem {
  kind: string;
  title: string;
  len: string;
}
/** Student AI Starter Kit contents manifest. */
export const KIT_CONTENTS: KitItem[] = [
  { kind: "BRIEF", title: "Your first AI build, step by step", len: "12 MIN READ" },
  { kind: "EXERCISE", title: "Turn any idea into a one-page spec", len: "8 MIN READ" },
  { kind: "EXERCISE", title: "Prompt pack: 20 prompts that actually work", len: "7 MIN READ" },
  { kind: "EXERCISE", title: "Clean a messy dataset with AI", len: "9 MIN READ" },
  { kind: "EXERCISE", title: "Make your project look designed", len: "6 MIN READ" },
  { kind: "EXERCISE", title: "Explain your project in 90 seconds", len: "8 MIN READ" },
  { kind: "TEMPLATE", title: "Portfolio project template", len: "TEMPLATE" },
  { kind: "DATASET", title: "Sample: starter project dataset", len: "240 ROWS" },
];

export interface ResourceDoc {
  kind: string;
  title: string;
  isTable: boolean;
  p1?: string;
  p2?: string;
  prompt?: string;
}
export const RESOURCE_DOCS: ResourceDoc[] = [
  {
    kind: "BRIEF",
    title: "Spec-to-screen worksheet",
    isTable: false,
    p1: 'Before you generate a single screen, write the spec. This worksheet walks you from a one-line idea to a build-ready page: the user, the one job the tool does, the data in, the data out, and what "working" means.',
    p2: "Fill it in longhand first. The prompt block below turns your completed worksheet into a build instruction — paste your answers into the bracketed slots.",
    prompt:
      "You are my build partner. Here is my spec:\n\nUSER: [who uses this]\nJOB: [the one thing it does]\nDATA IN: [inputs]\nDATA OUT: [what the user sees]\nDONE MEANS: [acceptance test]\n\nBuild the first screen only. Ask me at most 3 clarifying questions first.",
  },
  {
    kind: "TEMPLATE",
    title: "First-screen layout template",
    isTable: false,
    p1: "Every first screen in this course uses the same skeleton: a header that states the job, one primary input area, one results area, and nothing else. Resist adding a second feature — that's Module 02's problem.",
    p2: "Use this template as your starting layout, then let the studio session shape it around your data.",
    prompt:
      "LAYOUT TEMPLATE — FIRST SCREEN\n\nHEADER: [tool name] — [one-line job]\nINPUT AREA: [the single form or upload]\nRESULT AREA: [table, cards, or summary]\nEMPTY STATE: [what shows before first use]\nERROR STATE: [what shows when input fails]",
  },
  {
    kind: "BRIEF",
    title: "Grading with AI, not by AI",
    isTable: false,
    p1: "The rule: AI drafts, you decide. This brief lays out a rubric-first grading workflow where the AI applies your rubric to produce draft feedback, and every mark that reaches a student passed through your judgment.",
    p2: "Used honestly, this halves marking time without outsourcing the part that matters. The prompt below is the rubric-application step.",
    prompt:
      "Apply this rubric to the student submission below.\nFor each criterion: quote the evidence, then score.\nFlag anything you are unsure about as UNSURE — do not guess.\nDo NOT produce a final grade; that is the instructor's call.\n\nRUBRIC: [paste rubric]\nSUBMISSION: [paste submission]",
  },
  {
    kind: "DATASET",
    title: "Sample: student feedback dataset",
    isTable: true,
  },
];

export interface FeedbackRow {
  id: string;
  text: string;
  course: string;
  term: string;
  rating: string;
}
export const DATASET_ROWS: FeedbackRow[] = [
  {
    id: "#001",
    text: "“Best sessions were the ones where we built live.”",
    course: "Mktg Analytics",
    term: "T2-25",
    rating: "4.8",
  },
  {
    id: "#002",
    text: "“Too much theory in weeks 2–3, picked up after.”",
    course: "Ops Mgmt",
    term: "T2-25",
    rating: "3.9",
  },
  {
    id: "#003",
    text: "“The AI grading feedback was faster and fairer.”",
    course: "Biz Stats",
    term: "T3-25",
    rating: "4.6",
  },
  {
    id: "#004",
    text: "“Capstone brief was the highlight of the term.”",
    course: "Mktg Analytics",
    term: "T3-25",
    rating: "4.9",
  },
  {
    id: "#005",
    text: "“Wish every course had the session grid upfront.”",
    course: "Strategy",
    term: "T1-26",
    rating: "4.7",
  },
  {
    id: "#006",
    text: "“Studio format meant I never fell behind.”",
    course: "Biz Stats",
    term: "T1-26",
    rating: "4.5",
  },
];
export const DATASET_TOTAL_ROWS = 240;

export interface LessonResource {
  kind: string;
  title: string;
  /** Index into RESOURCE_DOCS. */
  docIndex: number;
}
export const LESSON_RESOURCES: LessonResource[] = [
  { kind: "BRIEF", title: "Spec-to-screen worksheet", docIndex: 0 },
  { kind: "TEMPLATE", title: "First-screen layout template", docIndex: 1 },
  { kind: "DATASET", title: "Sample: student feedback dataset", docIndex: 3 },
];
