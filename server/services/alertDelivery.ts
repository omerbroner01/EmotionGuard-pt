import type { AlertPolicy, AlertChannel, InsertAlertHistory } from "@shared/schema";

export interface DeliveryResult {
  channelType: string;
  success: boolean;
  error?: string;
  deliveredAt: Date;
}

/**
 * Alert Delivery Service
 * Handles sending alerts through multiple channels (email, SMS, WebSocket, etc.)
 */
export class AlertDeliveryService {
  
  /**
   * Deliver alert through all configured channels for the policy
   */
  async deliverAlert(
    alertId: string, 
    alertData: InsertAlertHistory, 
    policy: AlertPolicy
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    const channels = await this.getChannelsForPolicy(policy.id, alertData.severity);

    for (const channel of channels) {
      try {
        // Check channel-specific throttling
        const canDeliver = await this.checkChannelThrottling(channel, alertData.userId);
        
        if (!canDeliver) {
          results.push({
            channelType: channel.channelType,
            success: false,
            error: 'Channel throttling limit reached',
            deliveredAt: new Date()
          });
          continue;
        }

        const result = await this.deliverToChannel(alertId, alertData, channel);
        results.push(result);
      } catch (error) {
        results.push({
          channelType: channel.channelType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          deliveredAt: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Check if channel throttling allows delivery
   */
  private async checkChannelThrottling(
    channel: AlertChannel,
    userId: string
  ): Promise<boolean> {
    // Import storage here to avoid circular dependency
    const { storage } = await import('../storage.js');
    
    // Get recent alert history for this channel and user
    const timeWindowMs = channel.cooldownMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    const recentAlerts = await storage.getAlertHistory({
      userId,
      limit: channel.maxFrequency + 5 // Get a few extra to be sure
    });
    
    // Filter alerts that were delivered through this channel type within the time window
    const recentChannelAlerts = recentAlerts.alerts.filter(alert => {
      if (!alert.createdAt) return false;
      
      const alertTime = new Date(alert.createdAt);
      const isWithinTimeWindow = alertTime > cutoffTime;
      
      // Check if this alert was delivered through this channel type
      const channelsTriggered = alert.channelsTriggered as string[] || [];
      const wasDeliveredThroughChannel = channelsTriggered.includes(channel.channelType);
      
      return isWithinTimeWindow && wasDeliveredThroughChannel;
    });
    
    // Check if we've exceeded the frequency limit
    if (recentChannelAlerts.length >= channel.maxFrequency) {
      console.log(`🚫 Channel throttling: ${channel.channelType} has reached max frequency (${channel.maxFrequency}) for user ${userId}`);
      return false;
    }
    
    return true;
  }

  /**
   * Get channels configured for a specific policy and severity
   */
  private async getChannelsForPolicy(
    policyId: string, 
    severity: string
  ): Promise<AlertChannel[]> {
    // Import storage here to avoid circular dependency
    const { storage } = await import('../storage.js');
    
    // Query real channels from database
    const allChannels = await storage.getAlertChannels(policyId);
    
    // Filter by severity and enabled status
    const filteredChannels = allChannels.filter((channel: AlertChannel) => 
      channel.enabled && 
      (channel.severity === severity || channel.severity === 'all')
    );
    
    // If no channels configured, use default dashboard channel
    if (filteredChannels.length === 0) {
      return [{
        id: 'default_dashboard',
        alertPolicyId: policyId,
        channelType: 'dashboard',
        severity: severity,
        recipients: [],
        template: null,
        enabled: true,
        maxFrequency: 10,
        cooldownMinutes: 0,
        createdAt: new Date()
      }];
    }
    
    return filteredChannels;
  }

  /**
   * Deliver alert to specific channel
   */
  private async deliverToChannel(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel
  ): Promise<DeliveryResult> {
    const baseResult = {
      channelType: channel.channelType,
      deliveredAt: new Date()
    };

    switch (channel.channelType) {
      case 'dashboard':
        return this.deliverToDashboard(alertId, alertData, channel, baseResult);
      
      case 'email':
        return this.deliverToEmail(alertId, alertData, channel, baseResult);
      
      case 'sms':
        return this.deliverToSMS(alertId, alertData, channel, baseResult);
      
      case 'webhook':
        return this.deliverToWebhook(alertId, alertData, channel, baseResult);
      
      case 'websocket':
        return this.deliverToWebSocket(alertId, alertData, channel, baseResult);
      
      default:
        throw new Error(`Unsupported channel type: ${channel.channelType}`);
    }
  }

  /**
   * Deliver to dashboard (real-time UI updates)
   */
  private async deliverToDashboard(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel,
    baseResult: Partial<DeliveryResult>
  ): Promise<DeliveryResult> {
    // TODO: Update dashboard with new alert
    console.log(`📊 Dashboard alert: ${alertData.message}`);
    
    return {
      ...baseResult,
      channelType: 'dashboard',
      success: true
    } as DeliveryResult;
  }

  /**
   * Deliver via email
   */
  private async deliverToEmail(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel,
    baseResult: Partial<DeliveryResult>
  ): Promise<DeliveryResult> {
    // TODO: Send email notification
    const recipients = channel.recipients as string[];
    console.log(`📧 Email alert to ${recipients.join(', ')}: ${alertData.message}`);
    
    return {
      ...baseResult,
      channelType: 'email',
      success: true
    } as DeliveryResult;
  }

  /**
   * Deliver via SMS
   */
  private async deliverToSMS(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel,
    baseResult: Partial<DeliveryResult>
  ): Promise<DeliveryResult> {
    // TODO: Send SMS notification
    const phoneNumbers = channel.recipients as string[];
    console.log(`📱 SMS alert to ${phoneNumbers.join(', ')}: ${alertData.message}`);
    
    return {
      ...baseResult,
      channelType: 'sms',
      success: true
    } as DeliveryResult;
  }

  /**
   * Deliver via webhook
   */
  private async deliverToWebhook(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel,
    baseResult: Partial<DeliveryResult>
  ): Promise<DeliveryResult> {
    // TODO: Send webhook notification
    const webhookUrls = channel.recipients as string[];
    console.log(`🔗 Webhook alert to ${webhookUrls.join(', ')}: ${alertData.message}`);
    
    return {
      ...baseResult,
      channelType: 'webhook',
      success: true
    } as DeliveryResult;
  }

  /**
   * Deliver via WebSocket (real-time)
   */
  private async deliverToWebSocket(
    alertId: string,
    alertData: InsertAlertHistory,
    channel: AlertChannel,
    baseResult: Partial<DeliveryResult>
  ): Promise<DeliveryResult> {
    // TODO: Send WebSocket notification
    console.log(`🔌 WebSocket alert: ${alertData.message}`);
    
    return {
      ...baseResult,
      channelType: 'websocket',
      success: true
    } as DeliveryResult;
  }
}