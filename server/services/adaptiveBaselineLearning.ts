import type { Assessment, UserBaseline } from "@shared/schema";
import { storage } from "../storage";

export interface PerformanceMetrics {
  totalTrades: number;
  successfulTrades: number; // Profitable trades
  averagePnL: number;
  averageHoldTime: number; // In minutes
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number; // Percentage of winning trades
}

export interface StressPerformanceCorrelation {
  stressLevel: number; // 0-10
  tradeCount: number;
  averagePnL: number;
  winRate: number;
  avgRiskScore: number;
  avgExecutionTime: number; // Time from assessment to trade execution
}

export interface BaselineOptimization {
  currentBaseline: UserBaseline;
  recommendedAdjustments: {
    reactionTimeThreshold: number; // Adjusted threshold in ms
    accuracyThreshold: number; // Adjusted threshold 0-1
    mouseStabilityThreshold: number; // Adjusted threshold 0-1
    keystrokeRhythmThreshold: number; // Adjusted threshold 0-1
    optimalStressRange: { min: number; max: number }; // Optimal self-report stress range
  };
  confidence: number; // 0-1 confidence in these recommendations
  learningProgress: number; // 0-1 how much data we have for learning
  performanceImprovement: number; // Expected % improvement in trading performance
}

export class AdaptiveBaselineLearningService {
  private performanceCache = new Map<string, PerformanceMetrics>();
  private correlationCache = new Map<string, StressPerformanceCorrelation[]>();

  async analyzeAndOptimizeBaseline(userId: string): Promise<BaselineOptimization> {
    // Get user's historical assessments with trade outcomes
    const assessments = await this.getAssessmentsWithOutcomes(userId, 200); // Last 200 assessments
    
    if (assessments.length < 10) {
      // Not enough data for meaningful learning
      const currentBaseline = await storage.getUserBaseline(userId);
      return this.getDefaultOptimization(currentBaseline);
    }

    // Analyze performance patterns
    const performanceMetrics = this.calculatePerformanceMetrics(assessments);
    const stressCorrelations = this.analyzeStressPerformanceCorrelations(assessments);
    const biometricOptimizations = this.analyzeBiometricOptimizations(assessments);

    // Get current baseline
    const currentBaseline = await storage.getUserBaseline(userId);
    
    // Generate optimized thresholds
    const optimization = this.generateOptimizedBaseline(
      currentBaseline,
      performanceMetrics,
      stressCorrelations,
      biometricOptimizations,
      assessments.length
    );

    // Cache results
    this.performanceCache.set(userId, performanceMetrics);
    this.correlationCache.set(userId, stressCorrelations);

    return optimization;
  }

  async updateBaselineFromLearning(userId: string): Promise<UserBaseline | null> {
    const optimization = await this.analyzeAndOptimizeBaseline(userId);
    
    // Only update if we have high confidence and significant improvement potential
    if (optimization.confidence > 0.7 && optimization.performanceImprovement > 5) {
      const currentBaseline = await storage.getUserBaseline(userId);
      
      if (!currentBaseline) {
        console.warn(`No baseline found for user ${userId}`);
        return null;
      }

      // Create updated baseline with learned optimizations
      const updatedBaseline = {
        userId,
        reactionTimeMs: this.adjustThreshold(
          currentBaseline.reactionTimeMs || 600,
          optimization.recommendedAdjustments.reactionTimeThreshold,
          0.1 // Conservative adjustment rate
        ),
        reactionTimeStdDev: currentBaseline.reactionTimeStdDev || 50,
        accuracy: this.adjustThreshold(
          currentBaseline.accuracy || 0.85,
          optimization.recommendedAdjustments.accuracyThreshold,
          0.05
        ),
        accuracyStdDev: currentBaseline.accuracyStdDev || 0.1,
        mouseStability: this.adjustThreshold(
          currentBaseline.mouseStability || 0.7,
          optimization.recommendedAdjustments.mouseStabilityThreshold,
          0.05
        ),
        keystrokeRhythm: this.adjustThreshold(
          currentBaseline.keystrokeRhythm || 0.6,
          optimization.recommendedAdjustments.keystrokeRhythmThreshold,
          0.05
        ),
        calibrationCount: (currentBaseline.calibrationCount || 0) + 1,
        lastCalibrated: new Date(),
      };

      console.log(`Updating baseline for user ${userId} based on performance learning:`, {
        previousReactionTime: currentBaseline.reactionTimeMs,
        newReactionTime: updatedBaseline.reactionTimeMs,
        previousAccuracy: currentBaseline.accuracy,
        newAccuracy: updatedBaseline.accuracy,
        confidence: optimization.confidence,
        expectedImprovement: optimization.performanceImprovement,
      });

      return await storage.createOrUpdateBaseline(updatedBaseline);
    }

    return null; // No update needed
  }

  private async getAssessmentsWithOutcomes(userId: string, limit: number): Promise<Assessment[]> {
    const allAssessments = await storage.getUserAssessments(userId, limit);
    // Filter to only assessments where trade was executed and has outcome data
    return allAssessments.filter(assessment => 
      assessment.tradeExecuted && 
      assessment.tradeOutcome &&
      typeof assessment.tradeOutcome === 'object' &&
      assessment.tradeOutcome !== null
    );
  }

  private calculatePerformanceMetrics(assessments: Assessment[]): PerformanceMetrics {
    const tradeOutcomes = assessments.map(a => a.tradeOutcome as any).filter(Boolean);
    
    if (tradeOutcomes.length === 0) {
      return {
        totalTrades: 0,
        successfulTrades: 0,
        averagePnL: 0,
        averageHoldTime: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
      };
    }

    const pnlValues = tradeOutcomes.map(outcome => outcome.pnl || 0);
    const successfulTrades = pnlValues.filter(pnl => pnl > 0).length;
    const totalPnL = pnlValues.reduce((sum, pnl) => sum + pnl, 0);
    const averagePnL = totalPnL / tradeOutcomes.length;
    
    // Calculate hold times (in minutes)
    const holdTimes = tradeOutcomes
      .map(outcome => outcome.duration || 0)
      .filter(duration => duration > 0);
    const averageHoldTime = holdTimes.length > 0 
      ? holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length / 60000 // Convert ms to minutes
      : 0;

    // Calculate max drawdown
    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    for (const pnl of pnlValues) {
      runningPnL += pnl;
      peak = Math.max(peak, runningPnL);
      const drawdown = peak - runningPnL;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sharpe ratio (simplified)
    const pnlStdDev = this.calculateStandardDeviation(pnlValues);
    const sharpeRatio = pnlStdDev > 0 ? averagePnL / pnlStdDev : 0;

    return {
      totalTrades: tradeOutcomes.length,
      successfulTrades,
      averagePnL,
      averageHoldTime,
      maxDrawdown,
      sharpeRatio,
      winRate: (successfulTrades / tradeOutcomes.length) * 100,
    };
  }

  private analyzeStressPerformanceCorrelations(assessments: Assessment[]): StressPerformanceCorrelation[] {
    // Group assessments by stress level (0-10)
    const stressGroups = new Map<number, Assessment[]>();
    
    for (const assessment of assessments) {
      if (assessment.selfReportStress !== null && assessment.tradeOutcome) {
        const stressLevel = assessment.selfReportStress;
        if (!stressGroups.has(stressLevel)) {
          stressGroups.set(stressLevel, []);
        }
        stressGroups.get(stressLevel)!.push(assessment);
      }
    }

    const correlations: StressPerformanceCorrelation[] = [];

    for (const [stressLevel, assessmentGroup] of Array.from(stressGroups.entries())) {
      if (assessmentGroup.length < 2) continue; // Need at least 2 data points

      const pnlValues = assessmentGroup
        .map((a: Assessment) => (a.tradeOutcome as any)?.pnl || 0)
        .filter((pnl: any) => typeof pnl === 'number');
      
      const avgPnL = pnlValues.reduce((sum: number, pnl: number) => sum + pnl, 0) / pnlValues.length;
      const winningTrades = pnlValues.filter((pnl: number) => pnl > 0).length;
      const winRate = (winningTrades / pnlValues.length) * 100;
      
      const avgRiskScore = assessmentGroup.reduce((sum: number, a: Assessment) => sum + (a.riskScore ?? 0), 0) / assessmentGroup.length;
      
      // Calculate average execution time (assessment creation to trade execution)
      const executionTimes = assessmentGroup
        .map((a: Assessment) => {
          const tradeOutcome = a.tradeOutcome as any;
          return tradeOutcome?.duration || 0; // Using duration as proxy for execution speed
        })
        .filter((time: number) => time > 0);
      
      const avgExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length
        : 0;

      correlations.push({
        stressLevel,
        tradeCount: assessmentGroup.length,
        averagePnL: avgPnL,
        winRate,
        avgRiskScore,
        avgExecutionTime,
      });
    }

    return correlations.sort((a, b) => a.stressLevel - b.stressLevel);
  }

  private analyzeBiometricOptimizations(assessments: Assessment[]): {
    reactionTimeOptimal: number;
    accuracyOptimal: number;
    mouseStabilityOptimal: number;
    keystrokeOptimal: number;
  } {
    // Find biometric values that correlate with best trading performance
    const performanceByBiometrics: Array<{
      assessment: Assessment;
      pnl: number;
      reactionTime?: number;
      accuracy?: number;
      mouseStability?: number;
      keystrokeRhythm?: number;
    }> = [];

    for (const assessment of assessments) {
      const tradeOutcome = assessment.tradeOutcome as any;
      if (!tradeOutcome?.pnl) continue;

      const stroopData = assessment.stroopTestResults as any;
      const behavioralData = assessment.behavioralMetrics as any;

      let reactionTime, accuracy, mouseStability, keystrokeRhythm;

      // Extract cognitive metrics
      if (stroopData && Array.isArray(stroopData) && stroopData.length > 0) {
        reactionTime = stroopData.reduce((sum: number, trial: any) => sum + trial.reactionTimeMs, 0) / stroopData.length;
        accuracy = stroopData.filter((trial: any) => trial.correct).length / stroopData.length;
      }

      // Extract behavioral metrics
      if (behavioralData) {
        if (behavioralData.mouseMovements?.length > 0) {
          mouseStability = this.calculateMouseStability(behavioralData.mouseMovements);
        }
        if (behavioralData.keystrokeTimings?.length > 0) {
          keystrokeRhythm = this.calculateKeystrokeRhythm(behavioralData.keystrokeTimings);
        }
      }

      performanceByBiometrics.push({
        assessment,
        pnl: tradeOutcome.pnl,
        reactionTime,
        accuracy,
        mouseStability,
        keystrokeRhythm,
      });
    }

    // Find optimal ranges by sorting by performance and taking top quartile
    const topPerformers = performanceByBiometrics
      .filter(p => p.pnl > 0) // Only profitable trades
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, Math.ceil(performanceByBiometrics.length * 0.25)); // Top 25%

    return {
      reactionTimeOptimal: this.calculateOptimalValue(topPerformers.map(p => p.reactionTime).filter((val): val is number => typeof val === 'number')),
      accuracyOptimal: this.calculateOptimalValue(topPerformers.map(p => p.accuracy).filter((val): val is number => typeof val === 'number')),
      mouseStabilityOptimal: this.calculateOptimalValue(topPerformers.map(p => p.mouseStability).filter((val): val is number => typeof val === 'number')),
      keystrokeOptimal: this.calculateOptimalValue(topPerformers.map(p => p.keystrokeRhythm).filter((val): val is number => typeof val === 'number')),
    };
  }

  private generateOptimizedBaseline(
    currentBaseline: UserBaseline | undefined,
    performance: PerformanceMetrics,
    stressCorrelations: StressPerformanceCorrelation[],
    biometricOptimizations: any,
    dataPoints: number
  ): BaselineOptimization {
    const learningProgress = Math.min(dataPoints / 100, 1); // Assume 100 data points for full learning
    
    // Find optimal stress range
    const optimalStressRange = this.findOptimalStressRange(stressCorrelations);
    
    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateOptimizationConfidence(performance, stressCorrelations, dataPoints);
    
    // Estimate performance improvement
    const performanceImprovement = this.estimatePerformanceImprovement(
      performance,
      stressCorrelations,
      biometricOptimizations
    );

    return {
      currentBaseline: currentBaseline || this.getDefaultBaseline(),
      recommendedAdjustments: {
        reactionTimeThreshold: biometricOptimizations.reactionTimeOptimal || 600,
        accuracyThreshold: biometricOptimizations.accuracyOptimal || 0.85,
        mouseStabilityThreshold: biometricOptimizations.mouseStabilityOptimal || 0.7,
        keystrokeRhythmThreshold: biometricOptimizations.keystrokeOptimal || 0.6,
        optimalStressRange,
      },
      confidence,
      learningProgress,
      performanceImprovement,
    };
  }

  private findOptimalStressRange(correlations: StressPerformanceCorrelation[]): { min: number; max: number } {
    if (correlations.length === 0) {
      return { min: 2, max: 6 }; // Default moderate stress range
    }

    // Find stress levels with best performance (highest win rate and average PnL)
    const scoredCorrelations = correlations.map(corr => ({
      ...corr,
      performanceScore: (corr.winRate / 100) * 0.6 + Math.max(0, corr.averagePnL / 1000) * 0.4 // Weighted score
    }));

    const bestPerformers = scoredCorrelations
      .filter(corr => corr.tradeCount >= 3) // Minimum trades for reliability
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, Math.ceil(scoredCorrelations.length * 0.3)); // Top 30%

    if (bestPerformers.length === 0) {
      return { min: 2, max: 6 };
    }

    const stressLevels = bestPerformers.map(p => p.stressLevel);
    return {
      min: Math.max(0, Math.min(...stressLevels) - 1), // Add buffer
      max: Math.min(10, Math.max(...stressLevels) + 1),
    };
  }

  private calculateOptimizationConfidence(
    performance: PerformanceMetrics,
    correlations: StressPerformanceCorrelation[],
    dataPoints: number
  ): number {
    let confidence = 0;

    // Data quantity confidence (0-0.4)
    confidence += Math.min(dataPoints / 50, 1) * 0.4;

    // Performance consistency confidence (0-0.3)
    if (performance.totalTrades > 10) {
      const performanceStability = Math.max(0, 1 - (performance.maxDrawdown / Math.abs(performance.averagePnL * performance.totalTrades)));
      confidence += performanceStability * 0.3;
    }

    // Correlation clarity confidence (0-0.3)
    if (correlations.length > 3) {
      const correlationVariance = this.calculateVariance(correlations.map(c => c.averagePnL));
      const correlationConfidence = correlationVariance > 0 ? Math.min(1, 1000 / correlationVariance) : 0;
      confidence += correlationConfidence * 0.3;
    }

    return Math.min(1, confidence);
  }

  private estimatePerformanceImprovement(
    performance: PerformanceMetrics,
    correlations: StressPerformanceCorrelation[],
    biometricOptimizations: any
  ): number {
    // Simple heuristic: estimate improvement based on difference between current and optimal performance
    let improvement = 0;

    // Stress optimization improvement
    if (correlations.length > 0) {
      const bestStressPerformance = Math.max(...correlations.map(c => c.averagePnL));
      const avgPerformance = correlations.reduce((sum, c) => sum + c.averagePnL, 0) / correlations.length;
      
      if (avgPerformance !== 0) {
        improvement += Math.abs((bestStressPerformance - avgPerformance) / avgPerformance) * 0.5;
      }
    }

    // Biometric optimization improvement (simplified estimate)
    if (performance.winRate < 60 && performance.winRate > 0) {
      improvement += (60 - performance.winRate) / 100 * 0.3; // Potential win rate improvement
    }

    return Math.min(50, improvement * 100); // Cap at 50% improvement
  }

  private adjustThreshold(current: number, optimal: number, maxAdjustment: number): number {
    const adjustment = (optimal - current) * maxAdjustment;
    return current + adjustment;
  }

  private calculateOptimalValue(values: number[]): number {
    if (values.length === 0) return 0;
    
    // Use median as optimal value (more robust than mean)
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

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

  private getDefaultBaseline(): UserBaseline {
    return {
      id: 'default',
      userId: 'default',
      reactionTimeMs: 600,
      reactionTimeStdDev: 50,
      accuracy: 0.85,
      accuracyStdDev: 0.1,
      mouseStability: 0.7,
      keystrokeRhythm: 0.6,
      calibrationCount: 0,
      lastCalibrated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultOptimization(currentBaseline: UserBaseline | undefined): BaselineOptimization {
    return {
      currentBaseline: currentBaseline || this.getDefaultBaseline(),
      recommendedAdjustments: {
        reactionTimeThreshold: 600,
        accuracyThreshold: 0.85,
        mouseStabilityThreshold: 0.7,
        keystrokeRhythmThreshold: 0.6,
        optimalStressRange: { min: 2, max: 6 },
      },
      confidence: 0.3,
      learningProgress: 0.1,
            performanceImprovement: 0,
    };
  }
}