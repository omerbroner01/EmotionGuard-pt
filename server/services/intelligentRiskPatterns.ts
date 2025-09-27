import type { Assessment } from "@shared/schema";
import type { AssessmentSignals, OrderContext } from "./emotionGuard";
import type { RiskScoringResult } from "./riskScoring";
import { storage } from "../storage";

export interface BehavioralPattern {
  id: string;
  userId: string;
  patternType: 'mouse_stability' | 'keystroke_rhythm' | 'cognitive_performance' | 'stress_escalation' | 'context_sensitivity';
  signalSignature: Record<string, number>; // Normalized signal values
  riskOutcome: number; // Historical risk score
  contextSimilarity: number; // How similar order contexts were
  frequency: number; // How often this pattern occurs
  lastSeen: Date;
  accuracy: number; // How predictive this pattern has been
}

export interface PatternPrediction {
  predictedRiskAdjustment: number; // -20 to +20 adjustment to base risk score
  confidence: number; // 0-1 confidence in this prediction
  matchingPatterns: BehavioralPattern[];
  noveltyScore: number; // How different current behavior is from historical patterns
  recommendedWeights: Record<string, number>; // Adjusted weights for risk components
}

export class IntelligentRiskPatternService {
  private patterns: Map<string, BehavioralPattern[]> = new Map();
  private patternCache: Map<string, PatternPrediction> = new Map();

  async analyzePatternsForUser(
    userId: string,
    currentSignals: AssessmentSignals,
    orderContext: OrderContext,
    baseRiskResult: RiskScoringResult
  ): Promise<PatternPrediction> {
    // Check cache first
    const cacheKey = this.generateCacheKey(userId, currentSignals, orderContext);
    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    // Get user's historical assessments for pattern analysis
    const historicalAssessments = await storage.getUserAssessments(userId, 100);
    
    if (historicalAssessments.length < 5) {
      // Not enough data for pattern analysis - return baseline prediction
      return {
        predictedRiskAdjustment: 0,
        confidence: 0.3,
        matchingPatterns: [],
        noveltyScore: 0.5,
        recommendedWeights: this.getDefaultWeights(),
      };
    }

    // Extract and update patterns from historical data
    await this.updatePatternsFromHistory(userId, historicalAssessments);

    // Analyze current signals against historical patterns
    const prediction = await this.predictRiskFromPatterns(
      userId,
      currentSignals,
      orderContext,
      baseRiskResult
    );

    // Cache the result
    this.patternCache.set(cacheKey, prediction);

    return prediction;
  }

  private async updatePatternsFromHistory(userId: string, assessments: Assessment[]): Promise<void> {
    const userPatterns: BehavioralPattern[] = [];

    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];
      
      // Skip assessments without sufficient data
      if (!assessment.behavioralMetrics || !assessment.riskScore) continue;

      // Extract behavioral patterns
      const patterns = this.extractPatternsFromAssessment(assessment);
      userPatterns.push(...patterns);

      // Analyze sequential patterns (current vs previous assessment)
      if (i < assessments.length - 1) {
        const previousAssessment = assessments[i + 1];
        const sequentialPattern = this.extractSequentialPattern(assessment, previousAssessment);
        if (sequentialPattern) {
          userPatterns.push(sequentialPattern);
        }
      }
    }

    // Cluster similar patterns and calculate accuracy metrics
    const clusteredPatterns = this.clusterSimilarPatterns(userPatterns);
    this.patterns.set(userId, clusteredPatterns);
  }

  private extractPatternsFromAssessment(assessment: Assessment): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const metrics = assessment.behavioralMetrics as any;

    // Mouse stability pattern
    if (metrics?.mouseMovements?.length > 0) {
      const mouseStability = this.calculateMouseStability(metrics.mouseMovements);
      patterns.push({
        id: `${assessment.id}_mouse`,
        userId: assessment.userId,
        patternType: 'mouse_stability',
        signalSignature: {
          stability: mouseStability,
          movementCount: metrics.mouseMovements.length,
          riskContext: this.normalizeContextRisk(assessment.orderContext as any),
        },
        riskOutcome: assessment.riskScore,
        contextSimilarity: this.calculateContextSimilarity(assessment.orderContext as any),
        frequency: 1,
        lastSeen: assessment.createdAt || new Date(),
        accuracy: 0.8, // Will be calculated based on prediction accuracy
      });
    }

    // Keystroke rhythm pattern
    if (metrics?.keystrokeTimings?.length > 0) {
      const keystrokeRhythm = this.calculateKeystrokeRhythm(metrics.keystrokeTimings);
      patterns.push({
        id: `${assessment.id}_keystroke`,
        userId: assessment.userId,
        patternType: 'keystroke_rhythm',
        signalSignature: {
          rhythm: keystrokeRhythm,
          typingSpeed: this.calculateTypingSpeed(metrics.keystrokeTimings),
          riskContext: this.normalizeContextRisk(assessment.orderContext as any),
        },
        riskOutcome: assessment.riskScore,
        contextSimilarity: this.calculateContextSimilarity(assessment.orderContext as any),
        frequency: 1,
        lastSeen: assessment.createdAt || new Date(),
        accuracy: 0.75,
      });
    }

    // Cognitive performance pattern
    if (assessment.stroopTestResults) {
      const stroopData = assessment.stroopTestResults as any;
      if (stroopData.length > 0) {
        const cognitiveSignature = this.extractCognitiveSignature(stroopData);
        patterns.push({
          id: `${assessment.id}_cognitive`,
          userId: assessment.userId,
          patternType: 'cognitive_performance',
          signalSignature: cognitiveSignature,
          riskOutcome: assessment.riskScore,
          contextSimilarity: this.calculateContextSimilarity(assessment.orderContext as any),
          frequency: 1,
          lastSeen: assessment.createdAt || new Date(),
          accuracy: 0.9, // Cognitive tests are highly predictive
        });
      }
    }

    // Stress escalation pattern
    if (assessment.selfReportStress !== null) {
      patterns.push({
        id: `${assessment.id}_stress`,
        userId: assessment.userId,
        patternType: 'stress_escalation',
        signalSignature: {
          stressLevel: assessment.selfReportStress / 10, // Normalize to 0-1
          riskContext: this.normalizeContextRisk(assessment.orderContext as any),
          timeOfDay: this.normalizeTimeOfDay(assessment.createdAt || new Date()),
        },
        riskOutcome: assessment.riskScore,
        contextSimilarity: this.calculateContextSimilarity(assessment.orderContext as any),
        frequency: 1,
        lastSeen: assessment.createdAt || new Date(),
        accuracy: 0.85,
      });
    }

    return patterns;
  }

  private extractSequentialPattern(current: Assessment, previous: Assessment): BehavioralPattern | null {
    // Analyze risk escalation between consecutive assessments
    const riskDelta = current.riskScore - previous.riskScore;
    const timeDelta = new Date(current.createdAt || Date.now()).getTime() - 
                     new Date(previous.createdAt || Date.now()).getTime();

    if (Math.abs(riskDelta) > 10 && timeDelta < 24 * 60 * 60 * 1000) { // Risk change > 10 within 24h
      return {
        id: `${current.id}_sequential`,
        userId: current.userId,
        patternType: 'stress_escalation',
        signalSignature: {
          riskDelta: riskDelta / 100, // Normalize
          timeDelta: Math.min(timeDelta / (60 * 60 * 1000), 24) / 24, // Normalize to 0-1 (hours)
          escalationType: riskDelta > 0 ? 1 : 0, // 1 for escalation, 0 for de-escalation
        },
        riskOutcome: current.riskScore,
        contextSimilarity: this.calculateContextSimilarity(current.orderContext as any),
        frequency: 1,
        lastSeen: current.createdAt || new Date(),
        accuracy: 0.8,
      };
    }

    return null;
  }

  private clusterSimilarPatterns(patterns: BehavioralPattern[]): BehavioralPattern[] {
    const clustered: BehavioralPattern[] = [];
    const processed = new Set<string>();

    for (const pattern of patterns) {
      if (processed.has(pattern.id)) continue;

      // Find similar patterns
      const similarPatterns = patterns.filter(p => 
        p.patternType === pattern.patternType && 
        !processed.has(p.id) &&
        this.calculatePatternSimilarity(pattern, p) > 0.8
      );

      if (similarPatterns.length > 1) {
        // Merge similar patterns
        const mergedPattern = this.mergePatterns(similarPatterns);
        clustered.push(mergedPattern);
        similarPatterns.forEach(p => processed.add(p.id));
      } else {
        clustered.push(pattern);
        processed.add(pattern.id);
      }
    }

    return clustered;
  }

  private async predictRiskFromPatterns(
    userId: string,
    currentSignals: AssessmentSignals,
    orderContext: OrderContext,
    baseRiskResult: RiskScoringResult
  ): Promise<PatternPrediction> {
    const userPatterns = this.patterns.get(userId) || [];
    const currentSignature = this.extractCurrentSignature(currentSignals, orderContext);
    
    const matchingPatterns: BehavioralPattern[] = [];
    let totalWeightedAdjustment = 0;
    let totalWeight = 0;

    // Find patterns that match current behavior
    for (const pattern of userPatterns) {
      const similarity = this.calculateSignatureSimilarity(currentSignature, pattern.signalSignature);
      
      if (similarity > 0.7) { // High similarity threshold
        const weight = similarity * pattern.accuracy * Math.log(pattern.frequency + 1);
        const riskAdjustment = this.calculateRiskAdjustment(pattern, baseRiskResult.riskScore);
        
        totalWeightedAdjustment += riskAdjustment * weight;
        totalWeight += weight;
        matchingPatterns.push(pattern);
      }
    }

    const predictedRiskAdjustment = totalWeight > 0 ? totalWeightedAdjustment / totalWeight : 0;
    const confidence = Math.min(totalWeight / 5, 1); // Normalize confidence
    const noveltyScore = this.calculateNoveltyScore(currentSignature, userPatterns);
    const recommendedWeights = this.calculateDynamicWeights(matchingPatterns, baseRiskResult);

    return {
      predictedRiskAdjustment: Math.max(-20, Math.min(20, predictedRiskAdjustment)),
      confidence,
      matchingPatterns,
      noveltyScore,
      recommendedWeights,
    };
  }

  // Utility methods for pattern analysis
  private calculateMouseStability(movements: number[]): number {
    if (movements.length < 2) return 1.0;
    let totalVariation = 0;
    for (let i = 1; i < movements.length; i++) {
      totalVariation += Math.abs(movements[i] - movements[i - 1]);
    }
    const avgVariation = totalVariation / (movements.length - 1);
    return Math.max(0, 1 - (avgVariation / 100));
  }

  private calculateKeystrokeRhythm(timings: number[]): number {
    if (timings.length < 2) return 1.0;
    const variance = this.calculateVariance(timings);
    const avgTiming = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgTiming;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private calculateTypingSpeed(timings: number[]): number {
    if (timings.length === 0) return 0;
    const avgInterval = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    return Math.min(1, 200 / avgInterval); // Normalize typical typing speeds
  }

  private extractCognitiveSignature(stroopData: any[]): Record<string, number> {
    const avgReactionTime = stroopData.reduce((sum, trial) => sum + trial.reactionTimeMs, 0) / stroopData.length;
    const accuracy = stroopData.filter(trial => trial.correct).length / stroopData.length;
    const reactionTimeVariance = this.calculateVariance(stroopData.map(t => t.reactionTimeMs));
    
    return {
      reactionTime: Math.min(1, avgReactionTime / 1000), // Normalize to ~0-1 range
      accuracy,
      consistency: Math.max(0, 1 - (reactionTimeVariance / 50000)), // Normalize variance
    };
  }

  private normalizeContextRisk(orderContext: OrderContext): number {
    let contextRisk = 0;
    if (orderContext.leverage && orderContext.leverage > 5) contextRisk += 0.3;
    if (orderContext.recentLosses && orderContext.recentLosses > 2) contextRisk += 0.4;
    if (orderContext.currentPnL && orderContext.currentPnL < -1000) contextRisk += 0.3;
    return Math.min(1, contextRisk);
  }

  private normalizeTimeOfDay(date: Date): number {
    const hour = date.getHours();
    // Risk is higher late at night/early morning
    if (hour < 6 || hour > 22) return 0.8;
    if (hour < 9 || hour > 18) return 0.4;
    return 0.1;
  }

  private calculateContextSimilarity(orderContext: OrderContext): number {
    // Simple context similarity - could be enhanced with more sophisticated matching
    return 0.5; // Placeholder for now
  }

  private calculatePatternSimilarity(pattern1: BehavioralPattern, pattern2: BehavioralPattern): number {
    if (pattern1.patternType !== pattern2.patternType) return 0;
    return this.calculateSignatureSimilarity(pattern1.signalSignature, pattern2.signalSignature);
  }

  private calculateSignatureSimilarity(sig1: Record<string, number>, sig2: Record<string, number>): number {
    const keys = new Set([...Object.keys(sig1), ...Object.keys(sig2)]);
    let similarity = 0;
    let count = 0;

    for (const key of Array.from(keys)) {
      const val1 = sig1[key] || 0;
      const val2 = sig2[key] || 0;
      similarity += 1 - Math.abs(val1 - val2);
      count++;
    }

    return count > 0 ? similarity / count : 0;
  }

  private mergePatterns(patterns: BehavioralPattern[]): BehavioralPattern {
    const first = patterns[0];
    const mergedSignature: Record<string, number> = {};
    
    // Average the signal signatures
    for (const key of Object.keys(first.signalSignature)) {
      const values = patterns.map(p => p.signalSignature[key]).filter(v => v !== undefined);
      mergedSignature[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    return {
      ...first,
      id: `merged_${patterns.map(p => p.id.split('_')[0]).join('_')}`,
      signalSignature: mergedSignature,
      riskOutcome: patterns.reduce((sum, p) => sum + p.riskOutcome, 0) / patterns.length,
      frequency: patterns.length,
      accuracy: patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length,
    };
  }

  private extractCurrentSignature(signals: AssessmentSignals, orderContext: OrderContext): Record<string, number> {
    const signature: Record<string, number> = {};

    // Mouse stability
    if (signals.mouseMovements?.length) {
      signature.mouseStability = this.calculateMouseStability(signals.mouseMovements);
    }

    // Keystroke rhythm
    if (signals.keystrokeTimings?.length) {
      signature.keystrokeRhythm = this.calculateKeystrokeRhythm(signals.keystrokeTimings);
      signature.typingSpeed = this.calculateTypingSpeed(signals.keystrokeTimings);
    }

    // Cognitive performance
    if (signals.stroopTrials?.length) {
      const cogSignature = this.extractCognitiveSignature(signals.stroopTrials);
      Object.assign(signature, cogSignature);
    }

    // Stress level
    if (signals.stressLevel !== undefined) {
      signature.stressLevel = signals.stressLevel / 10;
    }

    // Context risk
    signature.riskContext = this.normalizeContextRisk(orderContext);
    signature.timeOfDay = this.normalizeTimeOfDay(new Date());

    return signature;
  }

  private calculateRiskAdjustment(pattern: BehavioralPattern, currentRiskScore: number): number {
    // Calculate how much to adjust current risk based on historical pattern
    const historicalRisk = pattern.riskOutcome;
    const expectedRisk = 50; // Baseline risk expectation
    
    return (historicalRisk - expectedRisk) * 0.4; // Scale the adjustment
  }

  private calculateNoveltyScore(currentSignature: Record<string, number>, patterns: BehavioralPattern[]): number {
    if (patterns.length === 0) return 1.0; // Completely novel if no patterns exist

    let totalSimilarity = 0;
    let count = 0;

    for (const pattern of patterns) {
      const similarity = this.calculateSignatureSimilarity(currentSignature, pattern.signalSignature);
      totalSimilarity += similarity;
      count++;
    }

    const avgSimilarity = count > 0 ? totalSimilarity / count : 0;
    return 1 - avgSimilarity; // Higher novelty = lower similarity to existing patterns
  }

  private calculateDynamicWeights(patterns: BehavioralPattern[], baseResult: RiskScoringResult): Record<string, number> {
    const defaultWeights = this.getDefaultWeights();
    
    if (patterns.length === 0) return defaultWeights;

    // Adjust weights based on which signal types have been most predictive for this user
    const typeAccuracy: Record<string, number[]> = {};
    
    for (const pattern of patterns) {
      if (!typeAccuracy[pattern.patternType]) {
        typeAccuracy[pattern.patternType] = [];
      }
      typeAccuracy[pattern.patternType].push(pattern.accuracy);
    }

    // Calculate average accuracy for each pattern type
    const adjustedWeights = { ...defaultWeights };
    for (const [type, accuracies] of Object.entries(typeAccuracy)) {
      const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      const adjustmentFactor = avgAccuracy / 0.8; // Scale relative to expected 80% accuracy
      
      // Map pattern types to weight keys
      switch (type) {
        case 'cognitive_performance':
          adjustedWeights.cognitive *= adjustmentFactor;
          break;
        case 'mouse_stability':
        case 'keystroke_rhythm':
          adjustedWeights.behavioral *= adjustmentFactor;
          break;
        case 'stress_escalation':
          adjustedWeights.selfReport *= adjustmentFactor;
          break;
      }
    }

    return adjustedWeights;
  }

  private getDefaultWeights(): Record<string, number> {
    return {
      cognitive: 0.5,
      behavioral: 0.4,
      selfReport: 0.6,
      voice: 0.3,
      facial: 0.3,
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private generateCacheKey(userId: string, signals: AssessmentSignals, orderContext: OrderContext): string {
    const signalHash = JSON.stringify(signals).substring(0, 50);
    const contextHash = JSON.stringify(orderContext).substring(0, 30);
    return `${userId}_${signalHash}_${contextHash}`;
  }
}