/**
 * Admin panel demo data (transcribed from the prototype). In production the
 * KPIs, orders, access rows and queues are computed from the DB; this seeds
 * the panel so it's fully navigable now.
 */

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}
export const KPIS: Kpi[] = [
  { label: "REVENUE · JULY", value: "₹2.4L", delta: "+18% vs June", positive: true },
  { label: "SALES · JULY", value: "63", delta: "+9 vs June", positive: true },
  { label: "RENEWAL RATE", value: "41%", delta: "+3 pts this quarter", positive: true },
  { label: "EXPIRING ≤30 DAYS", value: "41", delta: "12 already renewed", positive: false },
];

export const REVENUE_BARS = [42, 55, 48, 70, 62, 78, 66, 90];

export const EXPIRING_SOON = [
  { who: "asha.menon@gmail.com", when: "IN 21D" },
  { who: "rk.prof@nmims.edu", when: "IN 9D" },
  { who: "vivek.j@outlook.com", when: "IN 12D" },
  { who: "dr.smita@sibm.edu", when: "IN 26D" },
];

export interface AdminProductRow {
  title: string;
  kind: string;
  price: string;
  sales: number;
  renew: string;
}
export const ADMIN_PRODUCTS: AdminProductRow[] = [
  { title: "Build with AI: The Studio Course", kind: "VIDEO COURSE", price: "₹4,999", sales: 214, renew: "₹2,250" },
  { title: "AI for Placements & Interviews", kind: "VIDEO COURSE", price: "₹3,499", sales: 176, renew: "₹1,570" },
  { title: "Prompt to Product", kind: "VIDEO COURSE", price: "₹2,999", sales: 148, renew: "₹1,350" },
  { title: "Student AI Career Kit", kind: "STARTER KIT", price: "₹699", sales: 388, renew: "₹310" },
  { title: "AI Research Assistant Kit", kind: "STARTER KIT", price: "₹999", sales: 121, renew: "₹450" },
  { title: "Student AI Starter Kit", kind: "STARTER KIT · FREE", price: "Free", sales: 1042, renew: "Free" },
  { title: "Create Videos with AI", kind: "VIDEO COURSE · BONUS", price: "₹1,499", sales: 173, renew: "₹670" },
];

export type OrderChip = "PAID" | "RENEWAL" | "REFUNDED" | "FREE" | "FAILED";
export interface AdminOrderRow {
  id: string;
  who: string;
  product: string;
  amount: string;
  status: OrderChip;
  canRefund: boolean;
}
export const ADMIN_ORDERS: AdminOrderRow[] = [
  { id: "#AP-2141", who: "asha.menon@gmail.com", product: "Studio Course", amount: "₹4,999", status: "PAID", canRefund: true },
  { id: "#AP-2140", who: "rohan.s@zoho.com", product: "Prompt to Product · renewal", amount: "₹1,350", status: "RENEWAL", canRefund: false },
  { id: "#AP-2139", who: "neha.kulkarni@gmail.com", product: "AI for Placements & Interviews", amount: "₹3,499", status: "PAID", canRefund: true },
  { id: "#AP-2138", who: "j.thomas@gmail.com", product: "Studio Course", amount: "₹4,999", status: "REFUNDED", canRefund: false },
  { id: "#AP-2137", who: "aditya.rao@gmail.com", product: "Student AI Starter Kit", amount: "Free", status: "FREE", canRefund: false },
  { id: "#AP-2136", who: "meera.pillai@gmail.com", product: "AI Research Assistant Kit", amount: "₹999", status: "FAILED", canRefund: false },
];

export type AccessChip = "ACTIVE" | "EXPIRING" | "EXPIRED";
export interface AccessRow {
  email: string;
  product: string;
  expires: string;
  status: AccessChip;
}
export const ACCESS_ROWS: AccessRow[] = [
  { email: "asha.menon@gmail.com", product: "Student AI Career Kit", expires: "12 AUG 2026", status: "EXPIRING" },
  { email: "asha.menon@gmail.com", product: "Studio Course", expires: "23 MAY 2027", status: "ACTIVE" },
  { email: "asha.menon@gmail.com", product: "Prompt to Product", expires: "12 JUN 2026", status: "EXPIRED" },
  { email: "neha.kulkarni@gmail.com", product: "AI for Placements & Interviews", expires: "30 JUL 2026", status: "EXPIRING" },
  { email: "rohan.s@zoho.com", product: "Prompt to Product", expires: "18 JUL 2027", status: "ACTIVE" },
  { email: "aditya.rao@gmail.com", product: "Student AI Starter Kit", expires: "02 MAR 2027", status: "ACTIVE" },
];

export interface SubmissionRow {
  project: string;
  brief: string;
  who: string;
  note: string;
  when: string;
}
export const SUBMISSIONS: SubmissionRow[] = [
  {
    project: "Kirana loyalty programme, AI-enabled",
    brief: "PR-038 · RETAIL",
    who: "vivek.j@outlook.com · Symbiosis Pune",
    note: "Second submission — earlier feedback addressed",
    when: "SUBMITTED 20 JUL",
  },
  {
    project: "Resume screener that explains itself",
    brief: "PR-031 · HR",
    who: "asha.menon@gmail.com · MBA candidate, Pune",
    note: "First submission",
    when: "SUBMITTED 18 JUL",
  },
  {
    project: "India AI Build Challenge entry — MandiRate v2",
    brief: "COMPETITION · NIMBUS",
    who: "tanmay.k@coep.ac.in · COEP Pune",
    note: "Competition entry — needs score by 20 Aug",
    when: "SUBMITTED 16 JUL",
  },
];

export interface TestimonialQueueItem {
  name: string;
  meta: string;
  stars: string;
  text: string;
}
export const TESTIMONIAL_QUEUE: TestimonialQueueItem[] = [
  { name: "Divya Krishnan", meta: "MBA STUDENT · PROMPT TO PRODUCT", stars: "★★★★★", text: "Built a leave-tracker my college club actually uses. I have no coding background. Still slightly amazed." },
  { name: "Arjun Mehta", meta: "B.TECH STUDENT · STUDENT AI STARTER KIT", stars: "★★★★", text: "The starter exercises got me unstuck and building on day one. Would love a few more advanced ones." },
  { name: "Sneha R.", meta: "BBA STUDENT · CAREER KIT", stars: "★★★★★", text: "Used the portfolio briefs in my summer placement interviews. Two panelists asked about them." },
];

export interface PipelineColumn {
  label: string;
  cards: { inst: string; who: string; prog: string }[];
}
export const INDUSTRY_PIPELINE: PipelineColumn[] = [
  {
    label: "NEW INQUIRY · 3",
    cards: [
      { inst: "Nimbus Payments", who: "Head of Product", prog: "RUN A COMPETITION" },
      { inst: "Meridian Retail", who: "Talent Lead", prog: "INTERNSHIP POOL" },
      { inst: "Goa Institute of Management", who: "Placement Cell", prog: "CAMPUS BUILD-OFF" },
    ],
  },
  {
    label: "SCOPING · 2",
    cards: [
      { inst: "LedgerWorks", who: "CTO · call on 24 Jul", prog: "5 PAID PROJECTS" },
      { inst: "SunGrid Energy", who: "Ops Director", prog: "PAID PROJECTS" },
    ],
  },
  {
    label: "LIVE · 1",
    cards: [{ inst: "Campus FinTech Sprint", who: "LedgerWorks · closes 30 Sep", prog: "COMPETITION · 188 ENTRIES" }],
  },
];

export const ADMIN_TABS = [
  "Dashboard",
  "Products",
  "Orders",
  "Access",
  "Submissions",
  "Testimonials",
  "Industry",
] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
