/**
 * Practice library — real, buildable problem statements students can solve
 * with AI. Each project carries a full brief plus planning and free build
 * hints, shown on /practice/[id]. Submitting a build creates a portfolio entry.
 */

export type PracticeDomain =
  | "MARKETING"
  | "FINANCE"
  | "OPERATIONS"
  | "HR"
  | "RETAIL"
  | "EDUCATION";
export type PracticeLevel = "STARTER" | "INTERMEDIATE" | "ADVANCED";

export interface PracticeProject {
  id: string;
  domain: PracticeDomain;
  level: PracticeLevel;
  title: string;
  /** Short line for the grid card. */
  blurb: string;
  /** Full problem statement. */
  problem: string;
  /** Who the tool is for. */
  forWho: string;
  /** How to plan the build. */
  planHints: string[];
  /** How to build it with free tools. */
  buildHints: string[];
  /** Suggested free/low-cost stack to start with. */
  starterStack: string[];
}

export const PRACTICE_FILTERS = [
  "All",
  "Marketing",
  "Finance",
  "Operations",
  "HR",
  "Retail",
  "Education",
] as const;

export const PRACTICE_PROJECTS: PracticeProject[] = [
  {
    id: "PR-003",
    domain: "MARKETING",
    level: "STARTER",
    title: "Review-to-insight digest",
    blurb:
      "Turn a week of raw customer reviews into a one-page insight email a manager would actually read.",
    problem:
      "A small D2C brand collects 200+ reviews a week across marketplaces and nobody reads them. Build a tool that takes a week of raw reviews and produces a one-page digest: the top 3 themes, whether sentiment is rising or falling, and the single most urgent issue — each backed by a real quoted example.",
    forWho: "Founders and marketing teams at small D2C brands drowning in feedback.",
    planHints: [
      "Decide the one output that matters: a manager should be able to act within five minutes of opening it.",
      "Keep the input dead simple to start — a pasted block of reviews or a CSV export.",
      "Sketch the digest on paper first: themes, sentiment trend, top issue. Build to that shape.",
    ],
    buildHints: [
      "Ask a free LLM to cluster reviews: 'Group these into 3–5 themes; for each give a count, a one-line summary and one quoted example.'",
      "No code needed — a Google Sheet with an AI add-on, or a single page on a free host, is enough.",
      "Add a second prompt for a one-line sentiment trend so the manager sees direction, not just a snapshot.",
    ],
    starterStack: ["Google Sheets", "a free LLM API tier", "Vercel / v0 free tier"],
  },
  {
    id: "PR-014",
    domain: "MARKETING",
    level: "INTERMEDIATE",
    title: "Brand-safe ad-copy generator",
    blurb:
      "Generate ad variants that never break the brand voice guide — the guard is the hard part.",
    problem:
      "Interns churn out ad variants that quietly drift off-brand. Build a generator that takes a product and a brand voice guide and returns five on-brand ad variants — and, crucially, a checker that flags any line breaking the guide before it ships.",
    forWho: "Small marketing teams and college marketing/PR clubs.",
    planHints: [
      "Write the brand voice guide as a short list of do's and don'ts — that list is your rulebook.",
      "Separate generation from checking: make them two steps so the guard can veto.",
      "Define 'pass': every variant must cite which rules it followed.",
    ],
    buildHints: [
      "Prompt 1 generates variants; prompt 2 scores each against the guide and rewrites failures.",
      "Store the voice guide in a text file the app reads — no database needed.",
      "Use a free form builder or a one-page app; paste product + guide, get variants + flags.",
    ],
    starterStack: ["a free LLM API", "plain text/Markdown for the guide", "Glide or v0"],
  },
  {
    id: "PR-011",
    domain: "FINANCE",
    level: "INTERMEDIATE",
    title: "Invoice-to-cashflow forecaster",
    blurb:
      "Read a folder of invoices and produce a rolling 60-day cashflow view for a small firm.",
    problem:
      "A small firm knows its invoices but not when it will run short of cash. Build a tool that reads a set of invoices (dates and amounts, in and out) and produces a rolling 60-day cash view that clearly flags the weeks that go negative.",
    forWho: "Owners and accountants at small businesses without finance software.",
    planHints: [
      "Model the data first: each invoice is a date, an amount, and a direction (in/out).",
      "The valuable output is the warning — which weeks go negative and by how much.",
      "Start with a spreadsheet of fake invoices to prove the logic before any parsing.",
    ],
    buildHints: [
      "Use AI to extract date + amount + direction from messy invoice text into a clean table.",
      "Do the running-balance maths in a spreadsheet formula — no code required.",
      "Colour weeks red when the projected balance drops below zero.",
    ],
    starterStack: ["Google Sheets", "a free LLM for extraction", "a simple chart"],
  },
  {
    id: "PR-052",
    domain: "FINANCE",
    level: "ADVANCED",
    title: "GST notice explainer",
    blurb:
      "Translate a real GST notice into plain language, with the three actions that matter.",
    problem:
      "Indian small businesses receive GST notices written in dense legalese and panic. Build a tool that turns a pasted notice into plain language: what it actually says, the deadline, and the three concrete actions to take — with a clear 'consult a professional' guardrail.",
    forWho: "Small-business owners and the accountants who field their panicked calls.",
    planHints: [
      "Define the three fixed outputs: plain summary, deadline, next actions. Consistency builds trust.",
      "Add a safety rail: never give it as legal advice; always suggest professional review.",
      "Collect 3–4 sample notices (anonymised) to test against.",
    ],
    buildHints: [
      "Prompt the model to extract deadline and reference numbers verbatim — never invent them.",
      "Keep the tone calm and factual; test that it refuses to guess when the notice is unclear.",
      "Render the output as a fixed template so every notice looks the same.",
    ],
    starterStack: ["a free LLM API", "a one-page app", "a disclaimer banner"],
  },
  {
    id: "PR-022",
    domain: "OPERATIONS",
    level: "STARTER",
    title: "WhatsApp order-taker for a tiffin service",
    blurb:
      "Take free-text orders, confirm against a daily menu, and produce a kitchen-ready list.",
    problem:
      "A home tiffin service takes orders as free-text WhatsApp messages and loses track. Build a tool that reads the day's messages, matches each to the menu, produces a clean kitchen list with counts, and surfaces anything ambiguous to confirm.",
    forWho: "Home kitchens, tiffin services and small caterers.",
    planHints: [
      "Pin down the menu as a short fixed list — that's what orders are matched against.",
      "Decide what 'ambiguous' means (unknown item, missing quantity) and route those to a review list.",
      "Output two things: the kitchen list and the to-confirm list.",
    ],
    buildHints: [
      "Paste the day's messages; ask the model to map each to menu items with a quantity.",
      "Have it output a table plus a separate 'needs confirmation' section.",
      "No integration needed — copy-paste from WhatsApp is a perfectly good v1.",
    ],
    starterStack: ["a free LLM", "a fixed menu in text", "a printable table view"],
  },
  {
    id: "PR-064",
    domain: "OPERATIONS",
    level: "INTERMEDIATE",
    title: "Delivery exception dashboard",
    blurb:
      "Flag only the deliveries that will miss their window — and say why, in one line each.",
    problem:
      "A courier runs 500 deliveries a day but only the ~20 that will miss their promised window matter. Build a dashboard that surfaces just those at-risk deliveries, each with a one-line reason, so the ops team acts on exceptions instead of scrolling everything.",
    forWho: "Operations teams at courier, logistics and field-service companies.",
    planHints: [
      "Define 'at risk' with a simple rule first (e.g. promised time minus current ETA).",
      "Show only exceptions — resist listing everything; that's the whole point.",
      "Each row needs a reason a dispatcher can act on immediately.",
    ],
    buildHints: [
      "Start with a CSV of deliveries; compute risk with a formula, then let AI write the one-line reasons.",
      "Sort by how late, not alphabetically — most urgent on top.",
      "A free spreadsheet or a simple table app is enough for v1.",
    ],
    starterStack: ["Google Sheets", "a free LLM for reasons", "a filtered table"],
  },
  {
    id: "PR-031",
    domain: "HR",
    level: "INTERMEDIATE",
    title: "Resume screener that explains itself",
    blurb:
      "Screen against a rubric and write one honest paragraph per rejection. No black boxes.",
    problem:
      "Hiring teams reject resumes with a silent score nobody can defend. Build a screener that scores each resume against an explicit rubric and, for every reject, writes one honest paragraph explaining why — so decisions are fair and reviewable.",
    forWho: "Recruiters, hiring managers and campus placement cells.",
    planHints: [
      "Write the rubric first — role-specific criteria, each worth explicit weight.",
      "Make explanation mandatory: no score without a reason.",
      "Decide the human's role: AI drafts, a person approves every reject.",
    ],
    buildHints: [
      "Prompt: 'For each criterion, quote the evidence, then score. Flag anything unsure — never guess.'",
      "Keep resumes and rubric as pasted text to start; no parsing pipeline needed.",
      "Output a table of scores plus the written rationale per candidate.",
    ],
    starterStack: ["a free LLM API", "a rubric in text", "a table view"],
  },
  {
    id: "PR-072",
    domain: "HR",
    level: "STARTER",
    title: "Fair interview-kit generator",
    blurb:
      "Turn a job description into a fair, role-specific interview kit in minutes.",
    problem:
      "Interviewers wing it and ask inconsistent questions. Build a tool that takes a job description and produces a structured interview kit: eight role-specific questions, what a strong answer looks like for each, and one red flag to listen for.",
    forWho: "First-time interviewers, startups and student hiring panels.",
    planHints: [
      "Fix the output shape: 8 questions, each with a 'good answer' and a 'red flag'.",
      "Tie every question back to a skill in the job description.",
      "Aim for fairness — the same kit for every candidate for that role.",
    ],
    buildHints: [
      "One prompt takes the JD and returns the structured kit as a checklist.",
      "Let the user tweak or regenerate individual questions.",
      "Export to a printable one-pager the panel can score on.",
    ],
    starterStack: ["a free LLM", "a one-page app", "print-friendly CSS"],
  },
  {
    id: "PR-038",
    domain: "RETAIL",
    level: "STARTER",
    title: "Kirana loyalty nudges",
    blurb:
      "Track repeat customers from a plain sales register and suggest one weekly offer each.",
    problem:
      "A neighbourhood kirana store keeps a plain sales register and has no idea who its regulars are. Build a tool that reads the register (date, customer, amount), spots repeat customers, and suggests one personalised weekly offer for each.",
    forWho: "Kirana stores and small retailers with no loyalty software.",
    planHints: [
      "Define 'repeat customer' simply (e.g. 3+ visits in 30 days).",
      "The output is one actionable nudge per regular, not a report.",
      "Handle messy names — the same person spelled two ways.",
    ],
    buildHints: [
      "Use AI to normalise names and group purchases by customer.",
      "Rank customers by frequency, then generate one offer each.",
      "A spreadsheet plus a short prompt gets you a working v1.",
    ],
    starterStack: ["Google Sheets", "a free LLM", "a simple ranked list"],
  },
  {
    id: "PR-081",
    domain: "RETAIL",
    level: "ADVANCED",
    title: "Shelf-photo stock checker",
    blurb:
      "Photograph a shelf; get back which products look low or out of stock.",
    problem:
      "Store staff walk aisles to spot empty shelves. Build a tool where a shopkeeper photographs a shelf and gets back a list of products that look low or out of stock, so restocking is driven by a photo instead of a walk-through.",
    forWho: "Retail store managers and merchandising teams.",
    planHints: [
      "Start with a single, well-lit shelf and a short list of expected products.",
      "Define the output: per product, a status of OK / low / out.",
      "Accept that v1 is a helper, not perfect — flag uncertain items for a human.",
    ],
    buildHints: [
      "Use a free vision-capable model: 'List visible products and whether each looks well-stocked, low, or empty.'",
      "Give it the expected product list as context to reduce guessing.",
      "Return a simple checklist a staffer confirms on their phone.",
    ],
    starterStack: ["a free vision LLM", "phone camera", "a mobile-friendly page"],
  },
  {
    id: "PR-047",
    domain: "EDUCATION",
    level: "ADVANCED",
    title: "Practice tests from any chapter",
    blurb:
      "Chapter in, calibrated question bank out — with difficulty tags a teacher can trust.",
    problem:
      "Teachers spend hours writing practice questions. Build a tool that takes a textbook chapter and produces a calibrated question bank — a mix of MCQ and short-answer, each tagged by difficulty a teacher can trust, with an answer key.",
    forWho: "Teachers, tutors and students making their own revision material.",
    planHints: [
      "Decide the mix up front: how many MCQ vs short-answer, which difficulty spread.",
      "Difficulty tags must be honest — test them against questions you already rate.",
      "Always generate the answer key alongside the questions.",
    ],
    buildHints: [
      "Prompt for questions with an explicit difficulty label and a one-line justification.",
      "Ask it to base every question on a specific sentence from the chapter to avoid drift.",
      "Export to a clean question sheet plus a separate key.",
    ],
    starterStack: ["a free LLM API", "paste-in chapter text", "a printable sheet"],
  },
  {
    id: "PR-090",
    domain: "EDUCATION",
    level: "STARTER",
    title: "One-page revision sheet maker",
    blurb:
      "Turn a messy pile of lecture notes into a clean one-page revision sheet.",
    problem:
      "Students revise from messy, scattered notes. Build a tool that takes a jumble of lecture notes and returns a clean one-page revision sheet: key terms, the formulas that matter, and five self-test questions with answers.",
    forWho: "Students revising for exams — and anyone who learns by testing themselves.",
    planHints: [
      "Fix the one-page layout: key terms, formulas, five self-test questions.",
      "Force brevity — it must fit on a single page to be useful.",
      "Keep the self-test answers hidden until tapped, so it's actually a test.",
    ],
    buildHints: [
      "Paste notes; prompt for terms, formulas, and Q&A in a fixed structure.",
      "Ask it to cut anything that won't be on the exam — ruthless summarising.",
      "Render as a printable page; add a show/hide toggle for answers.",
    ],
    starterStack: ["a free LLM", "a one-page app", "print CSS"],
  },
];

export const PRACTICE_TOTAL = 100;

export function getPracticeProject(id: string): PracticeProject | undefined {
  return PRACTICE_PROJECTS.find((p) => p.id === id);
}

export function practiceLevelColor(level: PracticeLevel): string {
  return level === "STARTER"
    ? "var(--success)"
    : level === "ADVANCED"
      ? "var(--error)"
      : "var(--accent)";
}
