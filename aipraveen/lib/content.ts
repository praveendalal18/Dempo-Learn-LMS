/**
 * Marketing + public content — verbatim copy from the design handoff prototype.
 * These are the seed values; production would source most from the DB/CMS.
 */

export interface Stat {
  n: string;
  label: string;
}
export const STATS: Stat[] = [
  { n: "180+", label: "HOURS OF CURRICULUM DESIGNED" },
  { n: "6", label: "AI-INTEGRATED MBA COURSES" },
  { n: "1,200+", label: "LEARNERS TAUGHT" },
  { n: "14", label: "FDPS DELIVERED" },
];

export interface Step {
  n: string;
  t: string;
  d: string;
}
export const HOME_STEPS: Step[] = [
  {
    n: "1",
    t: "Learn",
    d: "Buy a course, stream it all year on any device. The video-creation bonus course and the book come free with the annual course.",
  },
  {
    n: "2",
    t: "Practice & submit",
    d: "Pick from 100 real industry projects, build, and submit for personal feedback from Praveen.",
  },
  {
    n: "3",
    t: "Get seen",
    d: "Publish to your reviewed portfolio, enter competitions, and land industry projects or internships.",
  },
];

export interface Quote {
  text: string;
  who: string;
}
export const HOME_TESTIMONIALS: Quote[] = [
  {
    text: "Finished the Studio Course in six weekends and shipped an internal tool my internship team still uses.",
    who: "ROHAN S. · MBA STUDENT",
  },
  {
    text: "The Career Kit briefs became my whole portfolio — two of them came up in my placement interviews.",
    who: "ANANYA I. · MBA STUDENT",
  },
];

export interface CaseStudy {
  title: string;
  tag: string;
  problem: string;
  built: string;
  outcome: string;
}
export const CASES: CaseStudy[] = [
  {
    title: "The studio-first course rebuild",
    tag: "CURRICULUM",
    problem:
      "A 30-hour analytics elective taught as lectures. Attendance fell every week; students could describe tools they had never touched.",
    built:
      "Rebuilt it studio-first: 3 foundation sessions, then working sessions where every student builds with AI in class, ending in gold-band build weeks and a capstone.",
    outcome:
      "Attendance held above 90%. Every student left with a deployed artefact instead of notes. The structure became the template for five more courses.",
  },
  {
    title: "The six-course curriculum system",
    tag: "CURRICULUM SYSTEM",
    problem:
      "Six management courses needed AI integration — 180+ hours — with consistent quality and no team of designers.",
    built:
      "A curriculum system: shared session grammar, AI-assisted design pipeline, reusable assessment rubrics, and a per-course build checklist.",
    outcome:
      "180+ hours of curriculum designed solo in one academic cycle. The same system now powers every product on this site.",
  },
  {
    title: "An enterprise app, built with AI",
    tag: "SOFTWARE",
    problem:
      "A mid-size firm ran approvals over email and spreadsheets. Quotes took days; nobody could see where a request was stuck.",
    built:
      "A role-based approvals app — workflow engine, audit trail, dashboards — built end-to-end with AI-assisted development in weeks, not quarters.",
    outcome:
      "Approval time dropped from days to hours. The client's team maintains it themselves — that was the brief.",
  },
  {
    title: "This website",
    tag: "PLATFORM",
    problem:
      "Selling courses through marketplaces means their pricing, their learner data, their rules — and a 40%+ cut.",
    built:
      "This platform: Next.js storefront, Razorpay checkout, Supabase accounts, streaming player and online resource viewer. Designed and built with AI, by one person.",
    outcome:
      "Zero marketplace fees, full ownership of the learner relationship. You are looking at the case study right now.",
  },
];

export interface Competition {
  id: string;
  name: string;
  sponsor: string;
  prize: string;
  fee: number;
  deadline: string;
  spots: string;
  brief: string;
}
export const COMPETITIONS: Competition[] = [
  {
    id: "c1",
    name: "India AI Build Challenge",
    sponsor: "SPONSORED BY NIMBUS PAYMENTS",
    prize: "₹1,00,000 PRIZE POOL",
    fee: 499,
    deadline: "ENTRIES CLOSE 15 AUG 2026",
    spots: "412 REGISTERED",
    brief:
      "Build a working AI tool that solves one real problem for small businesses. Judged by the Nimbus product team on usefulness, not polish.",
  },
  {
    id: "c2",
    name: "Campus FinTech Sprint",
    sponsor: "SPONSORED BY LEDGERWORKS",
    prize: "₹50,000 + INTERNSHIP INTERVIEWS",
    fee: 299,
    deadline: "ENTRIES CLOSE 30 SEP 2026",
    spots: "188 REGISTERED",
    brief:
      "AI-enable one of ten given fintech workflows. Top ten entries get interview slots at LedgerWorks.",
  },
  {
    id: "c3",
    name: "AI for Bharat: Local-Language Apps",
    sponsor: "COMMUNITY ROUND",
    prize: "₹25,000 + FEATURED PORTFOLIO",
    fee: 199,
    deadline: "ENTRIES CLOSE 20 OCT 2026",
    spots: "JUST OPENED",
    brief:
      "Build something genuinely useful in an Indian language. Extra weight for tools your own family would use.",
  },
];

export const COMP_STEPS: Step[] = [
  {
    n: "01",
    t: "Register",
    d: "Pay the entry fee online. It keeps entries serious — and funds the judging.",
  },
  {
    n: "02",
    t: "Build",
    d: "Four to six weeks with a real brief. Use anything you learned in the courses.",
  },
  {
    n: "03",
    t: "Submit",
    d: "Ship your entry from your portfolio — one link, one working project.",
  },
  {
    n: "04",
    t: "Get judged",
    d: "Industry judges score usefulness. Winners get prizes; shortlists get seen.",
  },
];

export interface Winner {
  place: string;
  project: string;
  who: string;
  won: string;
}
export const WINNERS: Winner[] = [
  {
    place: "🏆 WINNER · SPRING 2026",
    project: "MandiRate — daily crop price alerts",
    who: "Tanmay Kulkarni · COEP Pune",
    won: "Won ₹60,000 + internship at AgriStack",
  },
  {
    place: "RUNNER-UP",
    project: "HostelEats — mess feedback that works",
    who: "Fatima Sheikh · Jamia Millia",
    won: "Won ₹25,000",
  },
  {
    place: "PEOPLE'S CHOICE",
    project: "RailSeat — waitlist odds explained",
    who: "Arjun Venkatesh · VIT Vellore",
    won: "Won ₹15,000 + featured portfolio",
  },
];

export interface Programme {
  name: string;
  len: string;
  desc: string;
  outcomes: string;
  price: string;
}
export const PROGRAMMES: Programme[] = [
  {
    name: "AI Build Day",
    len: "1 DAY · UP TO 60 STUDENTS",
    desc: "Arrive with an idea, leave with a deployed mini-app. One intense day of studio building, city by city: Mumbai, Pune, Bengaluru, Delhi NCR, Hyderabad, Goa.",
    outcomes:
      "A deployed project in your portfolio · certificate · next-step build plan",
    price: "₹999 per seat",
  },
  {
    name: "Portfolio Sprint Weekend",
    len: "2 DAYS · 30 STUDENTS",
    desc: "Two days to take one practice-library project from brief to published portfolio entry, with live reviews on both days.",
    outcomes:
      "One reviewed, published portfolio project · feedback session · peer demos",
    price: "₹1,999 per seat",
  },
  {
    name: "Campus Build-Off",
    len: "1 DAY · WHOLE CAMPUS",
    desc: "A one-day competition hosted at your college — teams build against a sponsor brief, judged live in the evening.",
    outcomes: "Prizes on the day · winning entries published · sponsor visibility",
    price: "Free with a sponsor",
  },
];

export const WORKSHOP_STEPS: Step[] = [
  {
    n: "01",
    t: "Pick a city",
    d: "The tour calendar covers six cities. Your campus can also host.",
  },
  {
    n: "02",
    t: "Register",
    d: "Per-seat fee, paid online. Students only — bring a laptop.",
  },
  {
    n: "03",
    t: "Build all day",
    d: "No lectures. You build from the first hour, with help when you're stuck.",
  },
  {
    n: "04",
    t: "Publish",
    d: "Your day's build goes straight into your portfolio, ready to submit for review.",
  },
];

export interface IndustryOffer {
  tag: string;
  name: string;
  desc: string;
  detail: string;
}
export const INDUSTRY_OFFERS: IndustryOffer[] = [
  {
    tag: "RUN A COMPETITION",
    name: "Your brief, 400 builders",
    desc: "You set the problem and the prize; I run registration, the build window, and first-round judging. You see the shortlist.",
    detail: "From ₹1,00,000 prize pool + platform fee",
  },
  {
    tag: "PAID PROJECTS",
    name: "Real work, reviewed",
    desc: "Post a scoped problem from your backlog. Shortlisted students build it as a paid project — every deliverable passes my review first.",
    detail: "From ₹15,000 per project",
  },
  {
    tag: "HIRE & INTERNSHIPS",
    name: "Recruit from portfolios",
    desc: "Browse reviewed portfolios of students who ship. Post internships directly to learners who match your stack.",
    detail: "Free to browse · pay per hire",
  },
];

export interface WallTestimonial {
  stars: string;
  text: string;
  name: string;
  meta: string;
}
export const TESTIMONIAL_WALL: WallTestimonial[] = [
  {
    stars: "★★★★★",
    text: "Finished the Studio Course in six weekends and shipped an internal tool my internship team still uses. The pace being mine made all the difference.",
    name: "Rohan Shetty",
    meta: "MBA STUDENT · STUDIO COURSE",
  },
  {
    stars: "★★★★★",
    text: "Walked into placement season with a portfolio and interview answers I could actually defend. Cleared three of the four companies I sat for.",
    name: "Sneha Reddy",
    meta: "BBA STUDENT · AI FOR PLACEMENTS",
  },
  {
    stars: "★★★★★",
    text: "The Career Kit briefs became my entire portfolio. Two of the three projects came up in my placement interviews.",
    name: "Ananya Iyer",
    meta: "MBA STUDENT · CAREER KIT",
  },
  {
    stars: "★★★★",
    text: "Honest, unhyped, practical. The one-year window pushed me to actually finish, which no lifetime course ever managed.",
    name: "Vikram Nair",
    meta: "B.TECH FINAL YEAR · PROMPT TO PRODUCT",
  },
  {
    stars: "★★★★★",
    text: "The free starter kit alone got my first real project shipped in a weekend. I bought the full course a week later.",
    name: "Aditya Rao",
    meta: "ENGINEERING STUDENT · STUDENT AI STARTER KIT",
  },
  {
    stars: "★★★★★",
    text: "Made a demo video for my competition entry that actually looked professional. The judges brought it up.",
    name: "Fatima Sheikh",
    meta: "COMPUTER SCIENCE · CREATE VIDEOS WITH AI",
  },
];

/** Product options for the testimonial submission form. */
export const TESTIMONIAL_PRODUCT_OPTIONS = [
  "Build with AI: The Studio Course",
  "AI for Placements & Interviews",
  "Prompt to Product",
  "Student AI Career Kit",
  "AI Research Assistant Kit",
  "Student AI Starter Kit",
];

export interface Post {
  meta: string;
  title: string;
  blurb: string;
}
export const POSTS: Post[] = [
  {
    meta: "TEACHING · 6 MIN",
    title: "The session grid: how I structure every 30-hour course",
    blurb:
      "Three foundation sessions, mostly studio, gold build weeks. Why the shape matters more than the content.",
  },
  {
    meta: "BUILDING · 8 MIN",
    title: "What one person can ship with AI in 2026",
    blurb:
      "A realistic inventory from a year of building — what AI accelerated, what it didn't, and where the time actually went.",
  },
  {
    meta: "BUSINESS · 5 MIN",
    title: "Why I sell one-year access, not lifetime",
    blurb:
      "Lifetime access is a promise nobody keeps and a deadline nobody feels. A year is honest — and it gets courses finished.",
  },
  {
    meta: "TEACHING · 7 MIN",
    title: "Grading with AI without grading by AI",
    blurb:
      "A rubric-first workflow that keeps judgment human and cuts marking time in half.",
  },
];

export interface RoadmapItem {
  when: string;
  what: string;
}
export const ROADMAP: RoadmapItem[] = [
  {
    when: "Q3 2026",
    what: "Two new starter kits: AI for Placements, AI Research Assistant.",
  },
  {
    when: "Q4 2026",
    what: "Studio Course cohort of the book's worked examples.",
  },
  { when: "2027", what: "The book — and a course built directly on it." },
];
