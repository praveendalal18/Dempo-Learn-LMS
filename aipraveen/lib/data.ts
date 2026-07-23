/**
 * Data service facade. The whole app imports from here and never touches a
 * store directly. We pick the Drizzle/Postgres store when DATABASE_URL is set
 * (production — Supabase), otherwise the in-memory dev store.
 */
import { isDbConfigured, getDb } from "./db";
import { memoryStore } from "./store/memory";
import { makeDbStore } from "./store/db";
import type { DataStore, SubmitProjectInput, OrderMeta } from "./store/types";
import type { Product } from "./catalog";

// Re-export all domain types so existing imports (`@/lib/data`) keep working.
export type {
  AppUser,
  AppEntitlement,
  AppOrder,
  EntitlementView,
  EntitlementStatus,
  OrderStatus,
  ProjectStatus,
  ProjectLink,
  UserProject,
  CourseProgress,
  PurchaseResult,
  SubmitProjectInput,
  AdminProjectView,
  OrderMeta,
} from "./store/types";

export { displayName, slugify, lessonKeysFor } from "./store/helpers";
export { renewLabelFor } from "./catalog";

let _store: DataStore | null = null;
function store(): DataStore {
  if (!_store) {
    _store = isDbConfigured() ? makeDbStore(getDb()) : memoryStore;
  }
  return _store;
}

// ---------- users ----------
export const findUserByEmail = (email: string) => store().findUserByEmail(email);
export const getUser = (id: string) => store().getUser(id);
export const upsertUserByEmail = (email: string) => store().upsertUserByEmail(email);
export const getUserBySlug = (slug: string) => store().getUserBySlug(slug);

// ---------- magic links + sessions ----------
export const createMagicToken = (email: string) => store().createMagicToken(email);
export const consumeMagicToken = (t: string) => store().consumeMagicToken(t);
export const createSession = (userId: string) => store().createSession(userId);
export const getSessionUser = (t: string | undefined) => store().getSessionUser(t);
export const deleteSession = (t: string | undefined) => store().deleteSession(t);

// ---------- entitlements + orders ----------
export const listEntitlements = (userId: string) => store().listEntitlements(userId);
export const getEntitlement = (userId: string, productId: string) =>
  store().getEntitlement(userId, productId);
export const hasActivePaidCourse = (userId: string) => store().hasActivePaidCourse(userId);
export const recordPurchase = (userId: string, email: string, product: Product, meta?: OrderMeta) =>
  store().recordPurchase(userId, email, product, meta);
export const recordRenewal = (userId: string, email: string, product: Product, meta?: OrderMeta) =>
  store().recordRenewal(userId, email, product, meta);
export const recordCompetitionOrder = (
  userId: string,
  email: string,
  competitionId: string,
  name: string,
  fee: number,
  meta?: OrderMeta,
) => store().recordCompetitionOrder(userId, email, competitionId, name, fee, meta);
export const listOrders = (userId: string) => store().listOrders(userId);
export const claimPayment = (paymentId: string) => store().claimPayment(paymentId);
export const revokeByPayment = (paymentId: string) => store().revokeByPayment(paymentId);

// ---------- lesson progress ----------
export const getCompletedLessons = (userId: string, productId: string) =>
  store().getCompletedLessons(userId, productId);
export const courseProgress = (userId: string, productId: string) =>
  store().courseProgress(userId, productId);
export const setLessonCompleted = (
  userId: string,
  productId: string,
  lessonKey: string,
  completed: boolean,
) => store().setLessonCompleted(userId, productId, lessonKey, completed);

// ---------- portfolio projects ----------
export const listUserProjects = (userId: string) => store().listUserProjects(userId);
export const listPublishedProjects = (userId: string) => store().listPublishedProjects(userId);
export const addUserProject = (userId: string, input: SubmitProjectInput) =>
  store().addUserProject(userId, input);
export const listAllProjectsForAdmin = () => store().listAllProjectsForAdmin();
export const setProjectFeedback = (projectId: string, feedback: string) =>
  store().setProjectFeedback(projectId, feedback);
