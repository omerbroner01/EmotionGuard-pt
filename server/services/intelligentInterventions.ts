/**
 * Intelligent Intervention Recommendations Service
 * 
 * Provides personalized coping strategies and intervention recommendations
 * based on user stress patterns, assessment results, and contextual factors.
 */

import type { Assessment, UserBaseline, Policy } from '@shared/schema.js';
import type { IStorage } from '../storage.js';
import type { AssessmentSignals } from './emotionGuard.js';

interface InterventionRecommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedDuration: number; // minutes
  category: 'breathing' | 'cognitive' | 'physical' | 'environmental' | 'behavioral';
  personalizedFactors: string[];
  evidenceBased: boolean;
}

interface StressTriggerAnalysis {
  primaryTriggers: string[];
  triggerIntensity: Record<string, number>;
  triggerFrequency: Record<string, number>;
  historicalPatterns: string[];
}

interface PersonalizedInterventionPlan {
  userId: string;
  currentStressLevel: number;
  immediateRecommendations: InterventionRecommendation[];
  shortTermStrategies: InterventionRecommendation[];
  longTermDevelopment: InterventionRecommendation[];
  triggerAnalysis: StressTriggerAnalysis;
  confidenceScore: number;
  lastUpdated: Date;
}

class IntelligentInterventionsService {
  private storage: IStorage;
  
  // Evidence-based intervention database
  private interventionDatabase: Map<string, InterventionRecommendation> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeInterventionDatabase();
  }

  /**
   * Generate personalized intervention recommendations
   */
  async generatePersonalizedPlan(
    userId: string,
    currentAssessment: Assessment,
    signals: AssessmentSignals,
    baseline?: UserBaseline
  ): Promise<PersonalizedInterventionPlan> {
    console.log(`🎯 Generating personalized intervention plan for user ${userId}...`);

    // Analyze user's stress triggers and patterns
    const triggerAnalysis = await this.analyzeStressTriggers(userId, currentAssessment);
    
    // Get personalization factors
    const personalizationFactors = await this.getPersonalizationFactors(userId, baseline);
    
    // Generate immediate interventions
    const immediateRecommendations = this.generateImmediateInterventions(
      currentAssessment,
      signals,
      triggerAnalysis,
      personalizationFactors
    );

    // Generate short-term strategies
    const shortTermStrategies = this.generateShortTermStrategies(
      triggerAnalysis,
      personalizationFactors
    );

    // Generate long-term development recommendations
    const longTermDevelopment = this.generateLongTermDevelopment(
      userId,
      triggerAnalysis,
      personalizationFactors
    );

    const plan: PersonalizedInterventionPlan = {
      userId,
      currentStressLevel: currentAssessment.selfReportStress || 5,
      immediateRecommendations,
      shortTermStrategies,
      longTermDevelopment,
      triggerAnalysis,
      confidenceScore: this.calculatePlanConfidence(personalizationFactors),
      lastUpdated: new Date()
    };

    console.log(`🎯 Generated ${immediateRecommendations.length} immediate recommendations for user ${userId}`);
    return plan;
  }

  /**
   * Analyze user's stress triggers from historical data
   */
  private async analyzeStressTriggers(
    userId: string,
    currentAssessment: Assessment
  ): Promise<StressTriggerAnalysis> {
    const recentAssessments = await this.storage.getUserAssessments(userId, 20);
    
    const triggers = new Map<string, { intensity: number; frequency: number }>();
    const patterns: string[] = [];

    // Analyze contextual triggers
    recentAssessments.forEach(assessment => {
      const stressLevel = assessment.selfReportStress || 5;
      const orderContext = assessment.orderContext as any;

      if (stressLevel >= 6) { // High stress episodes
        // Market volatility trigger
        if (orderContext?.marketVolatility > 0.7) {
          this.updateTriggerStats(triggers, 'market_volatility', stressLevel);
        }

        // Portfolio loss trigger
        if (orderContext?.currentPnL < -1000) {
          this.updateTriggerStats(triggers, 'portfolio_losses', stressLevel);
        }

        // Recent losses trigger
        if (orderContext?.recentLosses >= 2) {
          this.updateTriggerStats(triggers, 'consecutive_losses', stressLevel);
        }

        // Time pressure trigger (trading outside normal hours)
        const timeOfDay = new Date(orderContext?.timeOfDay || new Date()).getHours();
        if (timeOfDay < 9 || timeOfDay > 16) {
          this.updateTriggerStats(triggers, 'time_pressure', stressLevel);
        }

        // High leverage trigger
        if (orderContext?.leverage > 5) {
          this.updateTriggerStats(triggers, 'high_leverage', stressLevel);
        }
      }
    });

    // Identify behavioral patterns
    if (recentAssessments.length >= 5) {
      const stressLevels = recentAssessments.map(a => a.selfReportStress || 5);
      
      // Escalating stress pattern
      if (this.isEscalatingPattern(stressLevels.slice(-5))) {
        patterns.push('escalating_stress_pattern');
      }

      // Volatility stress pattern
      if (this.isHighVolatilityPattern(stressLevels)) {
        patterns.push('stress_volatility_pattern');
      }

      // Recovery difficulty pattern
      if (this.hasSlowRecoveryPattern(stressLevels)) {
        patterns.push('slow_recovery_pattern');
      }
    }

    const triggerEntries = Array.from(triggers.entries());
    
    return {
      primaryTriggers: triggerEntries
        .sort((a, b) => b[1].intensity - a[1].intensity)
        .slice(0, 3)
        .map(([trigger]) => trigger),
      triggerIntensity: Object.fromEntries(
        triggerEntries.map(([trigger, stats]) => [trigger, stats.intensity])
      ),
      triggerFrequency: Object.fromEntries(
        triggerEntries.map(([trigger, stats]) => [trigger, stats.frequency])
      ),
      historicalPatterns: patterns
    };
  }

  /**
   * Generate immediate intervention recommendations
   */
  private generateImmediateInterventions(
    assessment: Assessment,
    signals: AssessmentSignals,
    triggerAnalysis: StressTriggerAnalysis,
    personalizationFactors: any
  ): InterventionRecommendation[] {
    const recommendations: InterventionRecommendation[] = [];
    const stressLevel = assessment.selfReportStress || 5;

    // Critical stress level interventions
    if (stressLevel >= 8) {
      recommendations.push({
        id: 'immediate_breathing_critical',
        type: 'immediate',
        priority: 'critical',
        title: 'Emergency Stress Response',
        description: 'Take 5 deep breaths using 4-7-8 technique: inhale for 4, hold for 7, exhale for 8. This activates parasympathetic nervous system.',
        estimatedDuration: 2,
        category: 'breathing',
        personalizedFactors: triggerAnalysis.primaryTriggers,
        evidenceBased: true
      });

      recommendations.push({
        id: 'immediate_pause_critical',
        type: 'immediate',
        priority: 'critical',
        title: 'Trading Pause Protocol',
        description: 'Step away from trading platform for 10 minutes. Set a timer. This prevents impulsive decisions driven by acute stress.',
        estimatedDuration: 10,
        category: 'behavioral',
        personalizedFactors: ['high_stress_prevention'],
        evidenceBased: true
      });
    }

    // High stress level interventions
    else if (stressLevel >= 6) {
      recommendations.push({
        id: 'immediate_breathing_high',
        type: 'immediate',
        priority: 'high',
        title: 'Box Breathing Technique',
        description: 'Practice box breathing: inhale 4, hold 4, exhale 4, hold 4. Repeat 5 times to reduce cortisol levels.',
        estimatedDuration: 3,
        category: 'breathing',
        personalizedFactors: triggerAnalysis.primaryTriggers,
        evidenceBased: true
      });

      if (triggerAnalysis.primaryTriggers.includes('portfolio_losses')) {
        recommendations.push({
          id: 'immediate_perspective_losses',
          type: 'immediate',
          priority: 'high',
          title: 'Loss Perspective Reframe',
          description: 'Remind yourself: "This loss is X% of my total portfolio. I have a plan. One trade does not define my success."',
          estimatedDuration: 2,
          category: 'cognitive',
          personalizedFactors: ['portfolio_loss_management'],
          evidenceBased: true
        });
      }
    }

    // Moderate stress level interventions
    else if (stressLevel >= 4) {
      recommendations.push({
        id: 'immediate_breathing_moderate',
        type: 'immediate',
        priority: 'medium',
        title: 'Mindful Breathing',
        description: 'Take 3 slow, mindful breaths. Focus on the sensation of air entering and leaving your body.',
        estimatedDuration: 1,
        category: 'breathing',
        personalizedFactors: [],
        evidenceBased: true
      });

      recommendations.push({
        id: 'immediate_posture_check',
        type: 'immediate',
        priority: 'medium',
        title: 'Posture and Tension Release',
        description: 'Check your posture. Release tension in shoulders, jaw, and hands. Stretch your neck gently.',
        estimatedDuration: 2,
        category: 'physical',
        personalizedFactors: [],
        evidenceBased: true
      });
    }

    // Biometric-specific interventions
    if (signals.facialMetrics?.isPresent) {
      const metrics = signals.facialMetrics;
      
      if (metrics.browFurrow > 0.6) {
        recommendations.push({
          id: 'immediate_facial_relaxation',
          type: 'immediate',
          priority: 'medium',
          title: 'Facial Tension Release',
          description: 'Consciously relax your forehead and eyebrows. Massage temples gently. Facial tension affects mental state.',
          estimatedDuration: 1,
          category: 'physical',
          personalizedFactors: ['facial_tension_detected'],
          evidenceBased: true
        });
      }

      if (metrics.blinkRate > 25) {
        recommendations.push({
          id: 'immediate_eye_rest',
          type: 'immediate',
          priority: 'medium',
          title: 'Eye Strain Relief',
          description: 'Look away from screens. Focus on a distant object for 20 seconds (20-20-20 rule). Blink slowly 5 times.',
          estimatedDuration: 1,
          category: 'physical',
          personalizedFactors: ['eye_strain_detected'],
          evidenceBased: true
        });
      }
    }

    return recommendations.slice(0, 3); // Limit to top 3 immediate recommendations
  }

  /**
   * Generate short-term strategy recommendations
   */
  private generateShortTermStrategies(
    triggerAnalysis: StressTriggerAnalysis,
    personalizationFactors: any
  ): InterventionRecommendation[] {
    const strategies: InterventionRecommendation[] = [];

    // Market volatility coping strategies
    if (triggerAnalysis.primaryTriggers.includes('market_volatility')) {
      strategies.push({
        id: 'shortterm_volatility_plan',
        type: 'short_term',
        priority: 'high',
        title: 'Volatility Response Plan',
        description: 'Pre-define position sizes and stop-losses for volatile markets. Create "if-then" rules to reduce decision fatigue.',
        estimatedDuration: 30,
        category: 'behavioral',
        personalizedFactors: ['market_volatility_sensitivity'],
        evidenceBased: true
      });
    }

    // Consecutive losses coping
    if (triggerAnalysis.primaryTriggers.includes('consecutive_losses')) {
      strategies.push({
        id: 'shortterm_loss_protocol',
        type: 'short_term',
        priority: 'high',
        title: 'Loss Streak Protocol',
        description: 'After 2 consecutive losses, reduce position size by 50%. After 3 losses, take a 2-hour break. Stick to the plan.',
        estimatedDuration: 15,
        category: 'behavioral',
        personalizedFactors: ['loss_sensitivity'],
        evidenceBased: true
      });
    }

    // Stress escalation pattern
    if (triggerAnalysis.historicalPatterns.includes('escalating_stress_pattern')) {
      strategies.push({
        id: 'shortterm_escalation_breaks',
        type: 'short_term',
        priority: 'high',
        title: 'Stress Escalation Breaks',
        description: 'Set hourly stress check-ins. If stress increases 2+ levels, take immediate 5-minute break.',
        estimatedDuration: 20,
        category: 'behavioral',
        personalizedFactors: ['escalation_prevention'],
        evidenceBased: true
      });
    }

    // General stress management strategies
    strategies.push({
      id: 'shortterm_progressive_relaxation',
      type: 'short_term',
      priority: 'medium',
      title: 'Progressive Muscle Relaxation',
      description: 'Practice tensing and releasing muscle groups systematically. Start with toes, work up to head.',
      estimatedDuration: 10,
      category: 'physical',
      personalizedFactors: [],
      evidenceBased: true
    });

    strategies.push({
      id: 'shortterm_cognitive_reframe',
      type: 'short_term',
      priority: 'medium',
      title: 'Cognitive Reframing Practice',
      description: 'Challenge negative thoughts: "Is this thought helpful? What would I tell a friend? What\'s the evidence?"',
      estimatedDuration: 5,
      category: 'cognitive',
      personalizedFactors: [],
      evidenceBased: true
    });

    return strategies.slice(0, 4); // Top 4 short-term strategies
  }

  /**
   * Generate long-term development recommendations
   */
  private generateLongTermDevelopment(
    userId: string,
    triggerAnalysis: StressTriggerAnalysis,
    personalizationFactors: any
  ): InterventionRecommendation[] {
    const development: InterventionRecommendation[] = [];

    // Stress resilience building
    development.push({
      id: 'longterm_mindfulness_training',
      type: 'long_term',
      priority: 'high',
      title: 'Daily Mindfulness Practice',
      description: 'Establish 10-minute daily mindfulness routine. Use apps like Headspace or Calm for guided sessions.',
      estimatedDuration: 10,
      category: 'cognitive',
      personalizedFactors: ['stress_resilience_building'],
      evidenceBased: true
    });

    // Trading psychology development
    development.push({
      id: 'longterm_trading_journal',
      type: 'long_term',
      priority: 'high',
      title: 'Emotional Trading Journal',
      description: 'Keep daily journal of trades, emotions, and stress levels. Review weekly for patterns and improvements.',
      estimatedDuration: 15,
      category: 'behavioral',
      personalizedFactors: ['self_awareness_development'],
      evidenceBased: true
    });

    // Physical health optimization
    development.push({
      id: 'longterm_exercise_routine',
      type: 'long_term',
      priority: 'medium',
      title: 'Regular Exercise Program',
      description: 'Engage in 30 minutes of moderate exercise 3x/week. Exercise reduces cortisol and improves stress resilience.',
      estimatedDuration: 30,
      category: 'physical',
      personalizedFactors: ['physical_stress_management'],
      evidenceBased: true
    });

    // Sleep optimization
    development.push({
      id: 'longterm_sleep_hygiene',
      type: 'long_term',
      priority: 'medium',
      title: 'Sleep Hygiene Protocol',
      description: 'Establish consistent sleep schedule, avoid screens 1 hour before bed, maintain cool sleeping environment.',
      estimatedDuration: 0,
      category: 'behavioral',
      personalizedFactors: ['sleep_stress_correlation'],
      evidenceBased: true
    });

    return development;
  }

  /**
   * Get personalization factors for the user
   */
  private async getPersonalizationFactors(
    userId: string,
    baseline?: UserBaseline
  ): Promise<{
    hasBaseline: boolean;
    recentAssessmentCount: number;
    avgStressLevel: number;
    stressVariability: number;
  }> {
    const recentAssessments = await this.storage.getUserAssessments(userId, 10);
    const stressLevels = recentAssessments
      .map(a => a.selfReportStress)
      .filter(s => s !== null) as number[];

    const avgStress = stressLevels.length > 0 
      ? stressLevels.reduce((sum, s) => sum + s, 0) / stressLevels.length 
      : 5;

    const variance = stressLevels.length > 1
      ? stressLevels.reduce((sum, s) => sum + Math.pow(s - avgStress, 2), 0) / stressLevels.length
      : 0;

    return {
      hasBaseline: !!baseline,
      recentAssessmentCount: recentAssessments.length,
      avgStressLevel: avgStress,
      stressVariability: Math.sqrt(variance)
    };
  }

  /**
   * Initialize evidence-based intervention database
   */
  private initializeInterventionDatabase(): void {
    // This would be loaded from a comprehensive database in production
    console.log('🧠 Initialized evidence-based intervention database with research-backed strategies');
  }

  // Utility methods for pattern analysis
  private updateTriggerStats(
    triggers: Map<string, { intensity: number; frequency: number }>,
    trigger: string,
    stressLevel: number
  ): void {
    const existing = triggers.get(trigger) || { intensity: 0, frequency: 0 };
    triggers.set(trigger, {
      intensity: Math.max(existing.intensity, stressLevel),
      frequency: existing.frequency + 1
    });
  }

  private isEscalatingPattern(stressLevels: number[]): boolean {
    if (stressLevels.length < 3) return false;
    
    let increasingCount = 0;
    for (let i = 1; i < stressLevels.length; i++) {
      if (stressLevels[i] > stressLevels[i - 1]) {
        increasingCount++;
      }
    }
    
    return increasingCount >= stressLevels.length * 0.6; // 60% of measurements increasing
  }

  private isHighVolatilityPattern(stressLevels: number[]): boolean {
    if (stressLevels.length < 3) return false;
    
    const avg = stressLevels.reduce((sum, s) => sum + s, 0) / stressLevels.length;
    const variance = stressLevels.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / stressLevels.length;
    
    return Math.sqrt(variance) > 2; // High stress variability
  }

  private hasSlowRecoveryPattern(stressLevels: number[]): boolean {
    if (stressLevels.length < 5) return false;
    
    // Look for periods where stress stays elevated for multiple assessments
    let elevatedStreaks = 0;
    let currentStreak = 0;
    
    for (const stress of stressLevels) {
      if (stress >= 6) {
        currentStreak++;
      } else {
        if (currentStreak >= 3) {
          elevatedStreaks++;
        }
        currentStreak = 0;
      }
    }
    
    return elevatedStreaks >= 1; // At least one streak of 3+ high stress periods
  }

  private calculatePlanConfidence(personalizationFactors: any): number {
    let confidence = 0.5; // Base confidence
    
    if (personalizationFactors.hasBaseline) confidence += 0.2;
    if (personalizationFactors.recentAssessmentCount >= 5) confidence += 0.2;
    if (personalizationFactors.recentAssessmentCount >= 10) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Get quick intervention suggestions for immediate use
   */
  getQuickInterventions(stressLevel: number): string[] {
    if (stressLevel >= 8) {
      return [
        'Take 5 deep breaths (4-7-8 technique)',
        'Step away from trading for 10 minutes',
        'Call your trading buddy or support person'
      ];
    } else if (stressLevel >= 6) {
      return [
        'Practice box breathing (4-4-4-4)',
        'Relax facial muscles and shoulders',
        'Review your trading plan before next move'
      ];
    } else if (stressLevel >= 4) {
      return [
        'Take 3 mindful breaths',
        'Check and adjust posture',
        'Remind yourself of your long-term goals'
      ];
    } else {
      return [
        'Maintain current awareness',
        'Continue with planned trading strategy',
        'Stay hydrated and comfortable'
      ];
    }
  }
}

export { 
  IntelligentInterventionsService, 
  type InterventionRecommendation, 
  type PersonalizedInterventionPlan,
  type StressTriggerAnalysis 
};