import { storage } from "../storage";
import { RiskScoringService } from "./riskScoring";
import type { Assessment, InsertAssessment, Policy, UserBaseline } from "@shared/schema";

export interface OrderContext {
  instrument: string;
  size: number;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  leverage?: number;
  currentPnL?: number;
  recentLosses?: number;
  timeOfDay: string;
  marketVolatility?: number;
}

export interface AssessmentSignals {
  // Quick check signals
  mouseMovements?: number[];
  keystrokeTimings?: number[];
  clickLatency?: number;
  
  // Stroop test results
  stroopTrials?: Array<{
    word: string;
    color: string;
    response: string;
    reactionTimeMs: number;
    correct: boolean;
  }>;
  
  // Self-report
  stressLevel?: number; // 0-10
  
  // Optional biometrics
  voiceProsodyFeatures?: {
    pitch: number;
    jitter: number;
    shimmer: number;
    energy: number;
  };
  
  facialExpressionFeatures?: {
    browFurrow: number;
    blinkRate: number;
    gazeFixation: number;
  };
  
  // Enhanced facial metrics from webcam detection
  facialMetrics?: {
    isPresent: boolean;
    blinkRate: number;
    eyeAspectRatio: number;
    jawOpenness: number;
    browFurrow: number;
    gazeStability: number;
  };
}

export interface AssessmentResult {
  assessmentId: string;
  riskScore: number; // 0-100
  verdict: 'go' | 'hold' | 'block';
  reasonTags: string[];
  confidence: number;
  recommendedAction: string;
  cooldownDuration?: number;
}

export class EmotionGuardService {
  private riskScoring: RiskScoringService;

  constructor() {
    this.riskScoring = new RiskScoringService();
  }

  async checkBeforeTrade(
    userId: string,
    orderContext: OrderContext,
    signals: AssessmentSignals,
    fastMode = false
  ): Promise<AssessmentResult> {
    // Get user baseline and policy
    const [baseline, policy] = await Promise.all([
      storage.getUserBaseline(userId),
      storage.getDefaultPolicy() // In production, this would be user/desk-specific
    ]);

    // Create assessment record
    const assessment = await storage.createAssessment({
      userId,
      policyId: policy.id,
      orderContext,
      quickCheckDurationMs: this.calculateQuickCheckDuration(signals),
      stroopTestResults: signals.stroopTrials || null,
      selfReportStress: signals.stressLevel || null,
      behavioralMetrics: {
        mouseMovements: signals.mouseMovements || [],
        keystrokeTimings: signals.keystrokeTimings || [],
        clickLatency: signals.clickLatency || null,
      },
      voiceProsodyScore: signals.voiceProsodyFeatures ? 
        this.calculateVoiceProsodyScore(signals.voiceProsodyFeatures) : null,
      facialExpressionScore: signals.facialMetrics ?
        this.calculateFacialExpressionScoreFromMetrics(signals.facialMetrics) : 
        signals.facialExpressionFeatures ?
          this.calculateFacialExpressionScore(signals.facialExpressionFeatures) : null,
      riskScore: 0, // Will be calculated
      verdict: 'go', // Will be determined
      reasonTags: [],
    });

    // Calculate risk score
    const riskResult = await this.riskScoring.calculateRiskScore(
      signals,
      baseline,
      orderContext,
      policy
    );

    // Determine verdict based on risk score and policy
    const verdict = this.determineVerdict(riskResult.riskScore, policy);
    const reasonTags = this.generateReasonTags(riskResult, signals, baseline);

    // Update assessment with results
    const updatedAssessment = await storage.updateAssessment(assessment.id, {
      riskScore: riskResult.riskScore,
      verdict,
      reasonTags,
      confidence: riskResult.confidence,
    });

    // Log audit event and create real-time event in parallel
    await Promise.all([
      storage.createAuditLog({
        userId,
        assessmentId: assessment.id,
        action: 'assessment_completed',
        details: {
          riskScore: riskResult.riskScore,
          verdict,
          reasonTags,
          orderContext,
        },
      }),
      storage.createEvent({
        eventType: 'verdict_rendered',
        userId,
        assessmentId: assessment.id,
        data: {
          verdict,
          riskScore: riskResult.riskScore,
          reasonTags,
        },
      })
    ]);

    return {
      assessmentId: assessment.id,
      riskScore: riskResult.riskScore,
      verdict,
      reasonTags,
      confidence: riskResult.confidence,
      recommendedAction: this.getRecommendedAction(verdict, riskResult.riskScore),
      cooldownDuration: verdict === 'hold' ? policy.cooldownDuration : undefined,
    };
  }

  async recordCooldownCompletion(
    assessmentId: string,
    durationMs: number
  ): Promise<void> {
    await storage.updateAssessment(assessmentId, {
      cooldownCompleted: true,
      cooldownDurationMs: durationMs,
    });

    await storage.createAuditLog({
      assessmentId,
      action: 'cooldown_completed',
      details: { durationMs },
    });
  }

  async recordJournalEntry(
    assessmentId: string,
    trigger: string,
    plan: string,
    entry?: string
  ): Promise<void> {
    await storage.updateAssessment(assessmentId, {
      journalTrigger: trigger,
      journalPlan: plan,
      journalEntry: entry,
    });

    await storage.createAuditLog({
      assessmentId,
      action: 'journal_entry_saved',
      details: { trigger, plan, entry },
    });
  }

  async updateAssessmentFacialMetrics(
    assessmentId: string,
    facialMetrics?: {
      isPresent: boolean;
      blinkRate: number;
      eyeAspectRatio: number;
      jawOpenness: number;
      browFurrow: number;
      gazeStability: number;
    },
    stressLevel?: number
  ): Promise<void> {
    console.log('🔍 updateAssessmentFacialMetrics received:', {
      assessmentId,
      facialMetrics: !!facialMetrics,
      stressLevel
    });

    const updateData: any = {};

    // Process facial metrics if provided
    if (facialMetrics) {
      const facialExpressionScore = this.calculateFacialExpressionScoreFromMetrics(facialMetrics);
      console.log('🧮 Calculated facialExpressionScore:', facialExpressionScore);
      
      updateData.facialMetrics = facialMetrics;
      updateData.facialExpressionScore = facialExpressionScore;
    }

    // Process stress level if provided
    if (stressLevel !== undefined) {
      console.log('🔍 Updating selfReportStress to:', stressLevel);
      updateData.selfReportStress = stressLevel;
    }

    // Update the assessment with new data
    await storage.updateAssessment(assessmentId, updateData);

    // CRITICAL: Recalculate risk score if stress level was updated
    if (stressLevel !== undefined) {
      const assessment = await storage.getAssessment(assessmentId);
      if (assessment) {
        // Map assessment data to signals format for risk calculation
        const signals: AssessmentSignals = {
          stressLevel: assessment.selfReportStress,
          behavioralMetrics: assessment.behavioralMetrics,
          facialMetrics: assessment.facialMetrics,
          voiceProsodyScore: assessment.voiceProsodyScore,
          stroopResults: assessment.stroopTestResults,
        };
        
        const baseline = await storage.getUserBaseline(assessment.userId);
        const policy = await storage.getPolicy(assessment.policyId);
        
        const riskResult = await this.riskScoring.calculateRiskScore(
          signals, 
          baseline || undefined,
          assessment.orderContext,
          policy || undefined
        );
        
        await storage.updateAssessment(assessmentId, { riskScore: riskResult.riskScore });
        console.log('🔍 Recalculated risk score after stress level update:', riskResult.riskScore);
      }
    }

    console.log('✓ Assessment updated with data:', updateData);

    // Create audit log safely - don't fail the entire operation if audit log fails
    try {
      await storage.createAuditLog({
        assessmentId,
        action: 'facial_metrics_updated',
        details: { facialMetrics, facialExpressionScore },
      });
      console.log('✓ Audit log created successfully');
    } catch (auditError) {
      console.error('⚠️ Audit log creation failed (non-critical):', auditError);
      // Continue - facial metrics update was successful
    }
  }

  async recordOverride(
    assessmentId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    const assessment = await storage.getAssessment(assessmentId);
    if (!assessment) throw new Error('Assessment not found');

    await storage.updateAssessment(assessmentId, {
      overrideUsed: true,
      overrideReason: reason,
      supervisorNotified: true,
    });

    await storage.createAuditLog({
      userId,
      assessmentId,
      action: 'override_used',
      details: { reason, originalVerdict: assessment.verdict },
    });

    await storage.createEvent({
      eventType: 'override_used',
      userId,
      assessmentId,
      data: {
        reason,
        originalVerdict: assessment.verdict,
        riskScore: assessment.riskScore,
      },
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
    await storage.updateAssessment(assessmentId, {
      tradeExecuted: outcome.executed,
      tradeOutcome: outcome,
    });
  }

  private calculateQuickCheckDuration(signals: AssessmentSignals): number {
    // Simple heuristic - in production this would be more sophisticated
    const baseTime = 1000; // 1 second base
    const mouseDelay = signals.mouseMovements ? signals.mouseMovements.length * 10 : 0;
    const keystrokeDelay = signals.keystrokeTimings ? 
      signals.keystrokeTimings.reduce((sum, time) => sum + time, 0) : 0;
    
    return baseTime + mouseDelay + keystrokeDelay;
  }

  private calculateVoiceProsodyScore(features: AssessmentSignals['voiceProsodyFeatures']): number {
    if (!features) return 0;
    
    // Simplified scoring - in production this would use ML models
    const stressIndicators = [
      features.pitch > 200 ? 0.3 : 0, // Higher pitch indicates stress
      features.jitter > 0.01 ? 0.25 : 0, // Voice instability
      features.shimmer > 0.05 ? 0.25 : 0, // Amplitude variation
      features.energy < 0.5 ? 0.2 : 0, // Low energy can indicate fatigue
    ];
    
    return Math.min(1.0, stressIndicators.reduce((sum, score) => sum + score, 0));
  }

  private calculateFacialExpressionScore(features: AssessmentSignals['facialExpressionFeatures']): number {
    if (!features) return 0;
    
    // Simplified scoring - in production this would use computer vision models
    const stressIndicators = [
      features.browFurrow > 0.5 ? 0.4 : 0, // Furrowed brow
      features.blinkRate > 20 ? 0.3 : 0, // Increased blink rate
      features.gazeFixation < 0.3 ? 0.3 : 0, // Lack of focus
    ];
    
    return Math.min(1.0, stressIndicators.reduce((sum, score) => sum + score, 0));
  }

  private calculateFacialExpressionScoreFromMetrics(metrics: AssessmentSignals['facialMetrics']): number {
    if (!metrics || !metrics.isPresent) return 0;
    
    // Real MediaPipe-based facial stress indicators
    const stressIndicators = [
      // Abnormal blink rate (normal: 12-20 per minute)
      metrics.blinkRate < 8 || metrics.blinkRate > 25 ? 0.3 : 0,
      
      // High brow furrow indicates stress/concentration
      metrics.browFurrow > 0.6 ? 0.35 : metrics.browFurrow > 0.3 ? 0.15 : 0,
      
      // Low gaze stability indicates distraction/anxiety
      metrics.gazeStability < 0.5 ? 0.25 : metrics.gazeStability < 0.7 ? 0.1 : 0,
      
      // Very low eye aspect ratio indicates fatigue/stress
      metrics.eyeAspectRatio < 0.02 ? 0.2 : 0,
      
      // Jaw tension (abnormal openness patterns)
      metrics.jawOpenness > 0.7 ? 0.1 : 0,
    ];
    
    return Math.min(1.0, stressIndicators.reduce((sum, score) => sum + score, 0));
  }

  private determineVerdict(riskScore: number, policy: Policy): 'go' | 'hold' | 'block' {
    if (riskScore >= 80) return 'block';
    if (riskScore >= policy.riskThreshold) return 'hold';
    return 'go';
  }

  private generateReasonTags(
    riskResult: any,
    signals: AssessmentSignals,
    baseline?: UserBaseline
  ): string[] {
    const tags: string[] = [];
    
    if (riskResult.reactionTimeElevated) tags.push('Reaction time elevated');
    if (riskResult.accuracyLow) tags.push('Accuracy below baseline');
    if (signals.stressLevel && signals.stressLevel >= 7) tags.push('Self-report high stress');
    if (riskResult.behavioralAnomalies) tags.push('Behavioral anomalies detected');
    if (riskResult.voiceStressDetected) tags.push('Voice stress indicators');
    if (riskResult.facialStressDetected) tags.push('Facial stress indicators');
    
    return tags;
  }

  private getRecommendedAction(verdict: 'go' | 'hold' | 'block', riskScore: number): string {
    switch (verdict) {
      case 'go':
        return 'Proceed with trade - stress levels appear normal';
      case 'hold':
        return 'Consider taking a breathing break before proceeding';
      case 'block':
        return 'High stress detected - recommend postponing trade and reflecting on triggers';
      default:
        return 'Assessment completed';
    }
  }
}
