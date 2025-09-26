import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("trader"), // trader, admin, supervisor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trading accounts/desks
export const tradingDesks = pgTable("trading_desks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  policyId: varchar("policy_id").references(() => policies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Policy configurations
export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  strictnessLevel: text("strictness_level").notNull().default("standard"), // lenient, standard, strict, custom
  riskThreshold: integer("risk_threshold").notNull().default(65),
  cooldownDuration: integer("cooldown_duration").notNull().default(30), // seconds
  enabledModes: jsonb("enabled_modes").notNull().default({
    cognitiveTest: true,
    behavioralBiometrics: true,
    selfReport: true,
    voiceProsody: false,
    facialExpression: false
  }),
  overrideAllowed: boolean("override_allowed").notNull().default(true),
  supervisorNotification: boolean("supervisor_notification").notNull().default(true),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User baselines for personalized assessment
export const userBaselines = pgTable("user_baselines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reactionTimeMs: real("reaction_time_ms"),
  reactionTimeStdDev: real("reaction_time_std_dev"),
  accuracy: real("accuracy"),
  accuracyStdDev: real("accuracy_std_dev"),
  mouseStability: real("mouse_stability"),
  keystrokeRhythm: real("keystroke_rhythm"),
  calibrationCount: integer("calibration_count").notNull().default(0),
  lastCalibrated: timestamp("last_calibrated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pre-trade assessments
export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  orderContext: jsonb("order_context").notNull(), // instrument, size, leverage, etc.
  
  // Assessment data
  quickCheckDurationMs: integer("quick_check_duration_ms"),
  stroopTestResults: jsonb("stroop_test_results"), // trials, reaction times, accuracy
  selfReportStress: integer("self_report_stress"), // 0-10
  behavioralMetrics: jsonb("behavioral_metrics"), // mouse, keyboard patterns
  voiceProsodyScore: real("voice_prosody_score"),
  facialExpressionScore: real("facial_expression_score"),
  
  // Risk assessment
  riskScore: integer("risk_score").notNull(), // 0-100
  verdict: text("verdict").notNull(), // go, hold, block
  reasonTags: jsonb("reason_tags").notNull().default([]),
  confidence: real("confidence"),
  
  // Actions taken
  cooldownCompleted: boolean("cooldown_completed").default(false),
  cooldownDurationMs: integer("cooldown_duration_ms"),
  journalEntry: text("journal_entry"),
  journalTrigger: text("journal_trigger"),
  journalPlan: text("journal_plan"),
  overrideUsed: boolean("override_used").default(false),
  overrideReason: text("override_reason"),
  supervisorNotified: boolean("supervisor_notified").default(false),
  
  // Outcomes
  tradeExecuted: boolean("trade_executed").default(false),
  tradeOutcome: jsonb("trade_outcome"), // PnL, duration, etc.
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log for compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  assessmentId: varchar("assessment_id").references(() => assessments.id),
  action: text("action").notNull(), // assessment_started, verdict_rendered, override_used, etc.
  details: jsonb("details").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Real-time events for WebSocket
export const realTimeEvents = pgTable("real_time_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // gate_triggered, verdict_rendered, override_used
  userId: varchar("user_id").references(() => users.id),
  assessmentId: varchar("assessment_id").references(() => assessments.id),
  data: jsonb("data").notNull(),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
  baselines: many(userBaselines),
  auditLogs: many(auditLogs),
}));

export const policiesRelations = relations(policies, ({ many }) => ({
  assessments: many(assessments),
  tradingDesks: many(tradingDesks),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, { fields: [assessments.userId], references: [users.id] }),
  policy: one(policies, { fields: [assessments.policyId], references: [policies.id] }),
  auditLogs: many(auditLogs),
}));

export const userBaselinesRelations = relations(userBaselines, ({ one }) => ({
  user: one(users, { fields: [userBaselines.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true, createdAt: true });
export const insertBaselineSchema = createInsertSchema(userBaselines).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertEventSchema = createInsertSchema(realTimeEvents).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type UserBaseline = typeof userBaselines.$inferSelect;
export type InsertUserBaseline = z.infer<typeof insertBaselineSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type RealTimeEvent = typeof realTimeEvents.$inferSelect;
export type InsertRealTimeEvent = z.infer<typeof insertEventSchema>;
export type TradingDesk = typeof tradingDesks.$inferSelect;
