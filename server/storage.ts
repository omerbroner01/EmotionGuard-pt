import {
  users,
  policies,
  assessments,
  userBaselines,
  auditLogs,
  realTimeEvents,
  tradingDesks,
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
}

export const storage = new DatabaseStorage();
