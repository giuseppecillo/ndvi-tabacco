import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const appUsersTable = pgTable("app_users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("active"),
  privacyVersion: text("privacy_version"),
  privacyAckAt: timestamp("privacy_ack_at", { withTimezone: true }),
  invitationId: text("invitation_id"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertAppUserSchema = createInsertSchema(appUsersTable);
export type AppUser = typeof appUsersTable.$inferSelect;

export const securityStateTable = pgTable("security_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const privacyRequestsTable = pgTable("privacy_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => appUsersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  response: text("response").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertPrivacyRequestSchema = createInsertSchema(privacyRequestsTable);
export type PrivacyRequest = typeof privacyRequestsTable.$inferSelect;

export const securityEventsTable = pgTable("security_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  targetId: text("target_id"),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
