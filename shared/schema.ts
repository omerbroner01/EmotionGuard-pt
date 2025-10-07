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
  facialMetrics: jsonb("facial_metrics"), // blink rate, brow furrow, gaze stability, etc.
  
  // Risk assessment
  // Allow null riskScore for placeholder/pending assessments so we don't persist demo numeric fallbacks
  // Server code uses null to indicate pending; keep DB model compatible.
  riskScore: integer("risk_score"), // 0-100 (nullable for pending)
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

// Advanced Alert System Tables

// Alert policies for configurable thresholds
export const alertPolicies = pgTable("alert_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  // Configurable stress thresholds for different alert severity levels
  warningThreshold: integer("warning_threshold").notNull().default(60), // 0-100
  urgentThreshold: integer("urgent_threshold").notNull().default(75), // 0-100
  criticalThreshold: integer("critical_threshold").notNull().default(90), // 0-100
  // Escalation settings
  escalationDelay: integer("escalation_delay").notNull().default(300), // seconds
  autoResolveDelay: integer("auto_resolve_delay").notNull().default(1800), // seconds
  // Target audience
  targetRoles: jsonb("target_roles").notNull().default(["trader"]), // roles to apply this policy to
  targetDesks: jsonb("target_desks").notNull().default([]), // desk IDs to apply this policy to
  // Active status
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alert delivery channels configuration
export const alertChannels = pgTable("alert_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertPolicyId: varchar("alert_policy_id").notNull().references(() => alertPolicies.id),
  channelType: text("channel_type").notNull(), // email, sms, webhook, dashboard, websocket
  severity: text("severity").notNull(), // warning, urgent, critical
  // Channel configuration
  recipients: jsonb("recipients").notNull().default([]), // email addresses, phone numbers, webhook URLs
  template: text("template"), // message template
  enabled: boolean("enabled").notNull().default(true),
  // Rate limiting
  maxFrequency: integer("max_frequency").notNull().default(5), // max alerts per hour
  cooldownMinutes: integer("cooldown_minutes").notNull().default(15), // minutes between same alert type
  createdAt: timestamp("created_at").defaultNow(),
});

// Alert history for tracking and analytics
export const alertHistory = pgTable("alert_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertPolicyId: varchar("alert_policy_id").notNull().references(() => alertPolicies.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  assessmentId: varchar("assessment_id").references(() => assessments.id),
  // Alert details
  alertType: text("alert_type").notNull(), // stress_spike, threshold_breach, pattern_anomaly
  severity: text("severity").notNull(), // warning, urgent, critical
  message: text("message").notNull(),
  stressLevel: real("stress_level").notNull(),
  triggerThreshold: integer("trigger_threshold").notNull(),
  // Metadata
  metadata: jsonb("metadata").notNull().default({}), // context data, trading activity, etc.
  // Delivery tracking
  channelsTriggered: jsonb("channels_triggered").notNull().default([]), // which channels fired
  deliveryStatus: jsonb("delivery_status").notNull().default({}), // success/failure per channel
  // Resolution tracking
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNote: text("resolution_note"),
  autoResolved: boolean("auto_resolved").notNull().default(false),
  // Response tracking
  responseTime: integer("response_time"), // seconds from alert to resolution
  escalated: boolean("escalated").notNull().default(false),
  escalatedAt: timestamp("escalated_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
  baselines: many(userBaselines),
  auditLogs: many(auditLogs),
  alertHistory: many(alertHistory),
}));

export const policiesRelations = relations(policies, ({ many }) => ({
  assessments: many(assessments),
  tradingDesks: many(tradingDesks),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, { fields: [assessments.userId], references: [users.id] }),
  policy: one(policies, { fields: [assessments.policyId], references: [policies.id] }),
  auditLogs: many(auditLogs),
  alertHistory: many(alertHistory),
}));

export const userBaselinesRelations = relations(userBaselines, ({ one }) => ({
  user: one(users, { fields: [userBaselines.userId], references: [users.id] }),
}));

export const alertPoliciesRelations = relations(alertPolicies, ({ many }) => ({
  channels: many(alertChannels),
  history: many(alertHistory),
}));

export const alertChannelsRelations = relations(alertChannels, ({ one }) => ({
  alertPolicy: one(alertPolicies, { fields: [alertChannels.alertPolicyId], references: [alertPolicies.id] }),
}));

export const alertHistoryRelations = relations(alertHistory, ({ one }) => ({
  alertPolicy: one(alertPolicies, { fields: [alertHistory.alertPolicyId], references: [alertPolicies.id] }),
  user: one(users, { fields: [alertHistory.userId], references: [users.id] }),
  assessment: one(assessments, { fields: [alertHistory.assessmentId], references: [assessments.id] }),
  resolvedByUser: one(users, { fields: [alertHistory.resolvedBy], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true, createdAt: true });
export const insertBaselineSchema = createInsertSchema(userBaselines).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertEventSchema = createInsertSchema(realTimeEvents).omit({ id: true, createdAt: true });
export const insertAlertPolicySchema = createInsertSchema(alertPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAlertChannelSchema = createInsertSchema(alertChannels).omit({ id: true, createdAt: true });
export const insertAlertHistorySchema = createInsertSchema(alertHistory).omit({ id: true, createdAt: true });

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
export type AlertPolicy = typeof alertPolicies.$inferSelect;
export type InsertAlertPolicy = z.infer<typeof insertAlertPolicySchema>;
export type AlertChannel = typeof alertChannels.$inferSelect;
export type InsertAlertChannel = z.infer<typeof insertAlertChannelSchema>;
export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = z.infer<typeof insertAlertHistorySchema>;
