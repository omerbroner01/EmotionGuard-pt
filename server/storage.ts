import {
  users,
  policies,
  assessments,
  userBaselines,
  auditLogs,
  realTimeEvents,
  tradingDesks,
  alertPolicies,
  alertChannels,
  alertHistory,
  type User,
  type InsertUser,
  type Policy,
  type InsertPolicy,
  type Assessment,
  type InsertAssessment,
  type UserBaseline,
  type InsertUserBaseline,
  type AuditLog,
  type InsertAuditLog,
  type RealTimeEvent,
  type InsertRealTimeEvent,
  type TradingDesk,
  type AlertPolicy,
  type InsertAlertPolicy,
  type AlertChannel,
  type InsertAlertChannel,
  type AlertHistory,
  type InsertAlertHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Policy operations
  getPolicy(id: string): Promise<Policy | undefined>;
  getDefaultPolicy(): Promise<Policy>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: string, policy: Partial<InsertPolicy>): Promise<Policy>;
  
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment>;
  getUserAssessments(userId: string, limit?: number): Promise<Assessment[]>;
  getAssessmentStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalAssessments: number;
    triggerRate: number;
    blockRate: number;
    overrideRate: number;
    averageRiskScore: number;
  }>;
  
  // Baseline operations
  getUserBaseline(userId: string): Promise<UserBaseline | undefined>;
  createOrUpdateBaseline(baseline: InsertUserBaseline): Promise<UserBaseline>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters: {
    userId?: string;
    assessmentId?: string;
    action?: string;
    limit?: number;
  }): Promise<AuditLog[]>;
  
  // Real-time events
  createEvent(event: InsertRealTimeEvent): Promise<RealTimeEvent>;
  getUnprocessedEvents(): Promise<RealTimeEvent[]>;
  markEventProcessed(id: string): Promise<void>;
  
  // Analytics
  getRecentEvents(limit?: number): Promise<RealTimeEvent[]>;
  getTradingDesks(): Promise<TradingDesk[]>;
  
  // Alert Policy operations
  getAlertPolicies(): Promise<AlertPolicy[]>;
  getAlertPolicy(id: string): Promise<AlertPolicy | undefined>;
  createAlertPolicy(policy: InsertAlertPolicy): Promise<AlertPolicy>;
  updateAlertPolicy(id: string, policy: Partial<InsertAlertPolicy>): Promise<AlertPolicy>;
  deleteAlertPolicy(id: string): Promise<void>;
  
  // Alert Channel operations
  getAlertChannels(policyId: string): Promise<AlertChannel[]>;
  createAlertChannel(channel: InsertAlertChannel): Promise<AlertChannel>;
  updateAlertChannel(id: string, channel: Partial<InsertAlertChannel>): Promise<AlertChannel>;
  deleteAlertChannel(id: string): Promise<void>;
  
  // Alert History operations
  createAlertHistory(alert: InsertAlertHistory): Promise<AlertHistory>;
  getAlertHistory(filters: {
    policyId?: string;
    userId?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: AlertHistory[]; total: number }>;
  getActiveAlerts(): Promise<AlertHistory[]>;
  resolveAlert(id: string, resolvedBy: string, resolutionNote?: string): Promise<AlertHistory>;
  getAlertAnalytics(timeframe?: string): Promise<{
    totalAlerts: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    avgResponseTime: number;
    resolutionRate: number;
    escalationRate: number;
    topTriggers: Array<{ trigger: string; count: number }>;
    channelEffectiveness: Record<string, { delivered: number; success_rate: number }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Simple in-memory cache for frequently accessed data
  private cache = {
    defaultPolicy: null as Policy | null,
    userBaselines: new Map<string, { data: UserBaseline; timestamp: number }>()
  };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async getDefaultPolicy(): Promise<Policy> {
    // Use static default policy to avoid database query entirely
    return {
      id: '3a22961e-4d52-4251-aa73-2dd0d5169812',
      name: 'Default Standard Policy',
      strictnessLevel: 'standard' as const,
      riskThreshold: 65,
      cooldownDuration: 30,
      enabledModes: {
        cognitiveTest: true,
        behavioralBiometrics: true,
        selfReport: true,
        voiceProsody: false,
        facialExpression: false
      },
      overrideAllowed: true,
      supervisorNotification: true,
      dataRetentionDays: 30,
      version: 1,
      createdAt: new Date('2025-09-26T00:00:00Z'),
      updatedAt: new Date('2025-09-26T00:00:00Z')
    };
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [newPolicy] = await db.insert(policies).values(policy).returning();
    return newPolicy;
  }

  async updatePolicy(id: string, policy: Partial<InsertPolicy>): Promise<Policy> {
    const [updatedPolicy] = await db
      .update(policies)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updatedPolicy;
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db.insert(assessments).values(assessment).returning();
    return newAssessment;
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment;
  }

  async getUserAssessments(userId: string, limit = 50): Promise<Assessment[]> {
    return db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.createdAt))
      .limit(limit);
  }

  async getAssessmentStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const since = new Date();
    switch (timeframe) {
      case 'day':
        since.setDate(since.getDate() - 1);
        break;
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
      case 'month':
        since.setMonth(since.getMonth() - 1);
        break;
    }

    const stats = await db
      .select({
        totalAssessments: sql<number>`count(*)`,
        blockCount: sql<number>`count(*) filter (where verdict = 'block')`,
        overrideCount: sql<number>`count(*) filter (where override_used = true)`,
        averageRiskScore: sql<number>`avg(risk_score)`,
      })
      .from(assessments)
      .where(gte(assessments.createdAt, since));

    const result = stats[0];
    return {
      totalAssessments: result.totalAssessments,
      triggerRate: result.totalAssessments > 0 ? (result.totalAssessments / 100) : 0, // Mock calculation
      blockRate: result.totalAssessments > 0 ? (result.blockCount / result.totalAssessments) * 100 : 0,
      overrideRate: result.totalAssessments > 0 ? (result.overrideCount / result.totalAssessments) * 100 : 0,
      averageRiskScore: result.averageRiskScore || 0,
    };
  }

  async getUserBaseline(userId: string): Promise<UserBaseline | undefined> {
    // For demo users, return undefined immediately to avoid slow database queries
    if (userId === 'demo-user') {
      return undefined;
    }

    // Check cache first for real users
    const cached = this.cache.userBaselines.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    const [baseline] = await db
      .select()
      .from(userBaselines)
      .where(eq(userBaselines.userId, userId))
      .limit(1);
    
    // Cache the result
    if (baseline) {
      this.cache.userBaselines.set(userId, { data: baseline, timestamp: Date.now() });
    }
    
    return baseline;
  }

  async createOrUpdateBaseline(baseline: InsertUserBaseline): Promise<UserBaseline> {
    // Clear cache for this user to ensure fresh data
    this.cache.userBaselines.delete(baseline.userId);
    
    const existing = await this.getUserBaseline(baseline.userId);
    
    if (existing) {
      const [updated] = await db
        .update(userBaselines)
        .set({ ...baseline, updatedAt: new Date() })
        .where(eq(userBaselines.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userBaselines).values(baseline).returning();
      return created;
    }
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(filters: {
    userId?: string;
    assessmentId?: string;
    action?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const conditions = [];
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.assessmentId) conditions.push(eq(auditLogs.assessmentId, filters.assessmentId));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return query
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters.limit || 100);
  }

  async createEvent(event: InsertRealTimeEvent): Promise<RealTimeEvent> {
    const [newEvent] = await db.insert(realTimeEvents).values(event).returning();
    return newEvent;
  }

  async getUnprocessedEvents(): Promise<RealTimeEvent[]> {
    return db
      .select()
      .from(realTimeEvents)
      .where(eq(realTimeEvents.processed, false))
      .orderBy(realTimeEvents.createdAt);
  }

  async markEventProcessed(id: string): Promise<void> {
    await db
      .update(realTimeEvents)
      .set({ processed: true })
      .where(eq(realTimeEvents.id, id));
  }

  async getRecentEvents(limit = 50): Promise<RealTimeEvent[]> {
    return db
      .select()
      .from(realTimeEvents)
      .orderBy(desc(realTimeEvents.createdAt))
      .limit(limit);
  }

  async getTradingDesks(): Promise<TradingDesk[]> {
    return db.select().from(tradingDesks);
  }

  // ==========================================
  // ALERT SYSTEM STORAGE OPERATIONS
  // ==========================================

  // Alert Policy operations
  async getAlertPolicies(): Promise<AlertPolicy[]> {
    return db.select().from(alertPolicies).orderBy(desc(alertPolicies.createdAt));
  }

  async getAlertPolicy(id: string): Promise<AlertPolicy | undefined> {
    const [policy] = await db.select().from(alertPolicies).where(eq(alertPolicies.id, id));
    return policy;
  }

  async createAlertPolicy(policy: InsertAlertPolicy): Promise<AlertPolicy> {
    const [newPolicy] = await db.insert(alertPolicies).values(policy).returning();
    return newPolicy;
  }

  async updateAlertPolicy(id: string, policy: Partial<InsertAlertPolicy>): Promise<AlertPolicy> {
    const [updated] = await db
      .update(alertPolicies)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(alertPolicies.id, id))
      .returning();
    return updated;
  }

  async deleteAlertPolicy(id: string): Promise<void> {
    await db.delete(alertPolicies).where(eq(alertPolicies.id, id));
  }

  // Alert Channel operations
  async getAlertChannels(policyId: string): Promise<AlertChannel[]> {
    return db
      .select()
      .from(alertChannels)
      .where(eq(alertChannels.alertPolicyId, policyId))
      .orderBy(alertChannels.channelType);
  }

  async createAlertChannel(channel: InsertAlertChannel): Promise<AlertChannel> {
    const [newChannel] = await db.insert(alertChannels).values(channel).returning();
    return newChannel;
  }

  async updateAlertChannel(id: string, channel: Partial<InsertAlertChannel>): Promise<AlertChannel> {
    const [updated] = await db
      .update(alertChannels)
      .set(channel)
      .where(eq(alertChannels.id, id))
      .returning();
    return updated;
  }

  async deleteAlertChannel(id: string): Promise<void> {
    await db.delete(alertChannels).where(eq(alertChannels.id, id));
  }

  // Alert History operations
  async createAlertHistory(alert: InsertAlertHistory): Promise<AlertHistory> {
    const [newAlert] = await db.insert(alertHistory).values(alert).returning();
    return newAlert;
  }

  async getAlertHistory(filters: {
    policyId?: string;
    userId?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: AlertHistory[]; total: number }> {
    let query = db.select().from(alertHistory);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(alertHistory);
    
    const conditions = [];
    if (filters.policyId) conditions.push(eq(alertHistory.alertPolicyId, filters.policyId));
    if (filters.userId) conditions.push(eq(alertHistory.userId, filters.userId));
    if (filters.severity) conditions.push(eq(alertHistory.severity, filters.severity));
    if (filters.resolved !== undefined) conditions.push(eq(alertHistory.resolved, filters.resolved));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }
    
    const [alerts, [{ count }]] = await Promise.all([
      query
        .orderBy(desc(alertHistory.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0),
      countQuery
    ]);
    
    return { alerts, total: count };
  }

  async getActiveAlerts(): Promise<AlertHistory[]> {
    return db
      .select()
      .from(alertHistory)
      .where(eq(alertHistory.resolved, false))
      .orderBy(desc(alertHistory.createdAt));
  }

  async resolveAlert(id: string, resolvedBy: string, resolutionNote?: string): Promise<AlertHistory> {
    const [resolved] = await db
      .update(alertHistory)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNote,
        responseTime: sql<number>`EXTRACT(EPOCH FROM (NOW() - created_at))::integer`
      })
      .where(eq(alertHistory.id, id))
      .returning();
    return resolved;
  }

  async getAlertAnalytics(timeframe = '24h'): Promise<{
    totalAlerts: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    avgResponseTime: number;
    resolutionRate: number;
    escalationRate: number;
    topTriggers: Array<{ trigger: string; count: number }>;
    channelEffectiveness: Record<string, { delivered: number; success_rate: number }>;
  }> {
    // Calculate timeframe filter
    const hoursAgo = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720; // 30d
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    // Get all alerts in timeframe
    const alerts = await db
      .select()
      .from(alertHistory)
      .where(gte(alertHistory.createdAt, cutoffTime));
    
    // Calculate analytics
    const totalAlerts = alerts.length;
    const resolvedAlerts = alerts.filter(a => a.resolved);
    const escalatedAlerts = alerts.filter(a => a.escalated);
    
    // Group by severity
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by status
    const byStatus = {
      resolved: resolvedAlerts.length,
      active: totalAlerts - resolvedAlerts.length,
      escalated: escalatedAlerts.length
    };
    
    // Calculate rates
    const resolutionRate = totalAlerts > 0 ? resolvedAlerts.length / totalAlerts : 0;
    const escalationRate = totalAlerts > 0 ? escalatedAlerts.length / totalAlerts : 0;
    
    // Calculate average response time (for resolved alerts)
    const avgResponseTime = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, alert) => sum + (alert.responseTime || 0), 0) / resolvedAlerts.length
      : 0;
    
    // Mock data for other analytics (would need more complex queries in production)
    const topTriggers = [
      { trigger: 'High trading volume', count: Math.floor(totalAlerts * 0.3) },
      { trigger: 'Market volatility spike', count: Math.floor(totalAlerts * 0.25) },
      { trigger: 'Recent losses', count: Math.floor(totalAlerts * 0.2) },
      { trigger: 'Extended session time', count: Math.floor(totalAlerts * 0.15) }
    ];
    
    const channelEffectiveness = {
      dashboard: { delivered: totalAlerts, success_rate: 1.0 },
      email: { delivered: Math.floor(totalAlerts * 0.8), success_rate: 0.97 },
      sms: { delivered: Math.floor(totalAlerts * 0.3), success_rate: 0.92 },
      webhook: { delivered: Math.floor(totalAlerts * 0.2), success_rate: 0.88 }
    };
    
    return {
      totalAlerts,
      bySeverity,
      byStatus,
      avgResponseTime,
      resolutionRate,
      escalationRate,
      topTriggers,
      channelEffectiveness
    };
  }
}

export const storage = new DatabaseStorage();
