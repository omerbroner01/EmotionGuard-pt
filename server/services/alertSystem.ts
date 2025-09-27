import type { 
  AlertPolicy, 
  AlertChannel, 
  AlertHistory, 
  InsertAlertHistory,
  Assessment,
  User 
} from "@shared/schema";
import { AlertDeliveryService } from "./alertDelivery.js";

export interface AlertContext {
  userId: string;
  userName: string;
  userRole: string;
  stressLevel: number;
  assessment?: Assessment;
  metadata?: Record<string, any>;
}

export interface AlertTriggerResult {
  alertTriggered: boolean;
  severity?: 'warning' | 'urgent' | 'critical';
  threshold?: number;
  message?: string;
  alertId?: string;
}

/**
 * Advanced Stress Alert System
 * Monitors stress levels and triggers configurable alerts with multiple delivery channels
 */
export class AlertSystemService {
  private deliveryService = new AlertDeliveryService();

  /**
   * Check if stress level triggers any alert thresholds
   */
  async checkStressThresholds(
    context: AlertContext,
    alertPolicies: AlertPolicy[]
  ): Promise<AlertTriggerResult> {
    // Find applicable policies for this user
    const applicablePolicies = this.findApplicablePolicies(alertPolicies, context);
    
    if (applicablePolicies.length === 0) {
      return { alertTriggered: false };
    }

    // Check thresholds in order of severity (critical > urgent > warning)
    for (const policy of applicablePolicies) {
      const thresholdCheck = this.checkPolicyThresholds(context.stressLevel, policy);
      
      if (thresholdCheck.triggered && thresholdCheck.severity) {
        // Check cooldown to prevent alert spam
        const canTrigger = await this.checkAlertCooldown(
          context.userId, 
          thresholdCheck.severity,
          policy
        );

        if (canTrigger && thresholdCheck.severity) {
          // Generate and deliver alert
          const alertId = await this.generateAlert(context, policy, {
            severity: thresholdCheck.severity,
            threshold: thresholdCheck.threshold,
            message: thresholdCheck.message
          });
          
          return {
            alertTriggered: true,
            severity: thresholdCheck.severity,
            threshold: thresholdCheck.threshold,
            message: thresholdCheck.message,
            alertId
          };
        }
      }
    }

    return { alertTriggered: false };
  }

  /**
   * Find alert policies that apply to the current user
   */
  private findApplicablePolicies(policies: AlertPolicy[], context: AlertContext): AlertPolicy[] {
    return policies.filter(policy => {
      if (!policy.isActive) return false;

      // Check role targeting
      const targetRoles = policy.targetRoles as string[];
      if (targetRoles.length > 0 && !targetRoles.includes(context.userRole)) {
        return false;
      }

      // TODO: Check desk targeting when desk info is available
      // const targetDesks = policy.targetDesks as string[];
      
      return true;
    });
  }

  /**
   * Check if stress level exceeds policy thresholds
   */
  private checkPolicyThresholds(stressLevel: number, policy: AlertPolicy) {
    // Convert stress level (0-10) to percentage (0-100) for threshold comparison
    const stressPercentage = stressLevel * 10;

    if (stressPercentage >= policy.criticalThreshold) {
      return {
        triggered: true,
        severity: 'critical' as const,
        threshold: policy.criticalThreshold,
        message: `Critical stress level detected (${stressLevel.toFixed(1)}/10) - immediate attention required`
      };
    }

    if (stressPercentage >= policy.urgentThreshold) {
      return {
        triggered: true,
        severity: 'urgent' as const,
        threshold: policy.urgentThreshold,
        message: `High stress level detected (${stressLevel.toFixed(1)}/10) - intervention recommended`
      };
    }

    if (stressPercentage >= policy.warningThreshold) {
      return {
        triggered: true,
        severity: 'warning' as const,
        threshold: policy.warningThreshold,
        message: `Elevated stress level (${stressLevel.toFixed(1)}/10) - monitoring recommended`
      };
    }

    return { triggered: false };
  }

  /**
   * Check if enough time has passed since last alert to prevent spam
   */
  private async checkAlertCooldown(
    userId: string,
    severity: 'warning' | 'urgent' | 'critical',
    policy: AlertPolicy
  ): Promise<boolean> {
    // Import storage here to avoid circular dependency
    const { storage } = await import('../storage.js');
    
    // Get recent alerts for this user and severity (include resolved alerts)
    const recentAlerts = await storage.getAlertHistory({
      userId,
      severity,
      limit: 10
    });
    
    if (recentAlerts.alerts.length === 0) {
      return true; // No recent alerts, safe to trigger
    }
    
    // Check global cooldown based on policy escalation delay (already in minutes)
    const cooldownMinutes = policy.escalationDelay; // Already stored in minutes
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = Date.now();
    
    // Find most recent alert of same severity
    const lastAlert = recentAlerts.alerts[0]; // Already ordered by createdAt desc
    if (!lastAlert.createdAt) {
      return true; // If no creation date, allow the alert
    }
    
    const lastAlertTime = new Date(lastAlert.createdAt).getTime();
    const timeSinceLastAlert = now - lastAlertTime;
    
    // Check if cooldown period has passed
    if (timeSinceLastAlert < cooldownMs) {
      console.log(`🚫 Alert cooldown active for user ${userId}, severity ${severity}. ${Math.ceil((cooldownMs - timeSinceLastAlert) / 1000)}s remaining`);
      return false;
    }
    
    // Check frequency limits (max 3 alerts of same severity per hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentAlertsInHour = recentAlerts.alerts.filter(alert => 
      alert.createdAt && new Date(alert.createdAt).getTime() > oneHourAgo
    );
    
    if (recentAlertsInHour.length >= 3) {
      console.log(`🚫 Alert frequency limit reached for user ${userId}, severity ${severity}. ${recentAlertsInHour.length} alerts in last hour`);
      return false;
    }
    
    return true; // Cooldown checks passed
  }

  /**
   * Generate alert record and trigger delivery
   */
  private async generateAlert(
    context: AlertContext,
    policy: AlertPolicy,
    thresholdCheck: { severity: 'warning' | 'urgent' | 'critical'; threshold: number; message: string }
  ): Promise<string> {
    // Import storage here to avoid circular dependency
    const { storage } = await import('../storage.js');
    
    // Create alert history record
    const alertData: InsertAlertHistory = {
      alertPolicyId: policy.id,
      userId: context.userId,
      assessmentId: context.assessment?.id,
      alertType: 'threshold_breach',
      severity: thresholdCheck.severity,
      message: thresholdCheck.message,
      stressLevel: context.stressLevel,
      triggerThreshold: thresholdCheck.threshold,
      metadata: {
        userName: context.userName,
        userRole: context.userRole,
        policyName: policy.name,
        timestamp: new Date().toISOString(),
        ...context.metadata
      }
    };

    // Insert into database and get real alert ID
    const createdAlert = await storage.createAlertHistory(alertData);

    // Trigger alert delivery through configured channels
    const deliveryResults = await this.deliveryService.deliverAlert(createdAlert.id, alertData, policy);

    // Update alert with delivery metadata for future throttling checks
    const channelsTriggered = deliveryResults
      .filter(result => result.success)
      .map(result => result.channelType);

    await storage.updateAlertHistory(createdAlert.id, {
      channelsTriggered,
      deliveryCompletedAt: new Date()
    });

    console.log(`📬 Alert ${createdAlert.id} delivered through channels: ${channelsTriggered.join(', ')}`);

    return createdAlert.id;
  }

  /**
   * Resolve an active alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolutionNote?: string): Promise<boolean> {
    // TODO: Update alert history record
    // Mark as resolved, set resolution timestamp and note
    return true;
  }

  /**
   * Get alert statistics for analytics
   */
  async getAlertStats(timeframe: 'hour' | 'day' | 'week' | 'month'): Promise<{
    totalAlerts: number;
    byseverity: Record<string, number>;
    avgResponseTime: number;
    resolutionRate: number;
  }> {
    // TODO: Query alert history for statistics
    return {
      totalAlerts: 42,
      byseverity: { warning: 18, urgent: 15, critical: 9 },
      avgResponseTime: 180, // seconds
      resolutionRate: 0.85
    };
  }

  /**
   * Get unresolved alerts for dashboard display
   */
  async getUnresolvedAlerts(limit = 50): Promise<AlertHistory[]> {
    // TODO: Query unresolved alerts from database
    return [];
  }

  /**
   * Auto-resolve alerts that have exceeded auto-resolve delay
   */
  async autoResolveExpiredAlerts(): Promise<number> {
    // TODO: Query alerts past auto-resolve delay and mark as auto-resolved
    return 0;
  }

  /**
   * Escalate alerts that haven't been resolved within escalation delay
   */
  async escalateOverdueAlerts(): Promise<number> {
    // TODO: Find alerts past escalation delay and trigger escalation
    return 0;
  }
}