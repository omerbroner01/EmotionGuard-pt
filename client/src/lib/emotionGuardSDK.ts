import { apiRequest } from "./queryClient";
import type { OrderContext, AssessmentSignals, AssessmentResult } from "@/types/emotionGuard";

export class EmotionGuardSDK {
  private tenantKey?: string;
  private region?: string;
  private features?: string[];

  constructor(config?: {
    tenantKey?: string;
    region?: string;
    features?: string[];
  }) {
    this.tenantKey = config?.tenantKey;
    this.region = config?.region;
    this.features = config?.features;
  }

  async checkBeforeTrade(
    orderContext: OrderContext,
    signals: AssessmentSignals,
    userId?: string
  ): Promise<AssessmentResult> {
    const response = await apiRequest('POST', '/api/emotion-guard/check-trade', {
      userId,
      orderContext,
      signals,
    });

    return response.json();
  }

  async recordCooldownCompletion(
    assessmentId: string,
    durationMs: number
  ): Promise<void> {
    await apiRequest('POST', '/api/emotion-guard/cooldown-completed', {
      assessmentId,
      durationMs,
    });
  }

  async saveJournalEntry(
    assessmentId: string,
    trigger: string,
    plan: string,
    entry?: string
  ): Promise<void> {
    await apiRequest('POST', '/api/emotion-guard/save-journal', {
      assessmentId,
      trigger,
      plan,
      entry,
    });
  }

  async submitOverride(
    assessmentId: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    await apiRequest('POST', '/api/emotion-guard/override', {
      userId,
      assessmentId,
      reason,
    });
  }

  async recordTradeOutcome(
    assessmentId: string,
    outcome: {
      executed: boolean;
      pnl?: number;
      duration?: number;
      maxFavorableExcursion?: number;
      maxAdverseExcursion?: number;
    }
  ): Promise<void> {
    await apiRequest('POST', '/api/emotion-guard/trade-outcome', {
      assessmentId,
      outcome,
    });
  }

  // Event listener interface
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: 'decision' | 'error', handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

// Global SDK instance
export const emotionGuard = new EmotionGuardSDK();
