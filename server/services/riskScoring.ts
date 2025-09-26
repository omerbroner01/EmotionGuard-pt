import type { AssessmentSignals, OrderContext } from "./emotionGuard";
import type { Policy, UserBaseline } from "@shared/schema";

export interface RiskScoringResult {
  riskScore: number; // 0-100
  confidence: number; // 0-1
  reactionTimeElevated: boolean;
  accuracyLow: boolean;
  behavioralAnomalies: boolean;
  voiceStressDetected: boolean;
  facialStressDetected: boolean;
  contextualRisk: number;
}

export class RiskScoringService {
  async calculateRiskScore(
    signals: AssessmentSignals,
    baseline?: UserBaseline,
    orderContext?: OrderContext,
    policy?: Policy
  ): Promise<RiskScoringResult> {
    let totalRisk = 0;
    let confidence = 0;
    let componentCount = 0;

    // Cognitive performance analysis
    const cognitiveRisk = this.analyzeCognitivePerformance(signals, baseline);
    if (cognitiveRisk.score > 0) {
      totalRisk += cognitiveRisk.score * 0.3; // 30% weight
      confidence += cognitiveRisk.confidence * 0.3;
      componentCount++;
    }

    // Behavioral biometrics analysis
    const behavioralRisk = this.analyzeBehavioralBiometrics(signals, baseline);
    if (behavioralRisk.score > 0) {
      totalRisk += behavioralRisk.score * 0.25; // 25% weight
      confidence += behavioralRisk.confidence * 0.25;
      componentCount++;
    }

    // Self-report analysis
    const selfReportRisk = this.analyzeSelfReport(signals);
    if (selfReportRisk.score > 0) {
      totalRisk += selfReportRisk.score * 0.2; // 20% weight
      confidence += selfReportRisk.confidence * 0.2;
      componentCount++;
    }

    // Voice prosody analysis (if available)
    const voiceRisk = this.analyzeVoiceProsody(signals);
    if (voiceRisk.score > 0) {
      totalRisk += voiceRisk.score * 0.15; // 15% weight
      confidence += voiceRisk.confidence * 0.15;
      componentCount++;
    }

    // Facial expression analysis (if available)
    const facialRisk = this.analyzeFacialExpressions(signals);
    if (facialRisk.score > 0) {
      totalRisk += facialRisk.score * 0.1; // 10% weight
      confidence += facialRisk.confidence * 0.1;
      componentCount++;
    }

    // Contextual risk factors
    const contextualRisk = this.analyzeContextualFactors(orderContext);
    totalRisk += contextualRisk * 0.1; // Additional 10% for context

    // Normalize confidence based on available components
    const normalizedConfidence = componentCount > 0 ? confidence / componentCount : 0;

    // Cap the total risk at 100
    const finalRiskScore = Math.min(100, Math.max(0, totalRisk));

    return {
      riskScore: Math.round(finalRiskScore),
      confidence: normalizedConfidence,
      reactionTimeElevated: cognitiveRisk.reactionTimeElevated,
      accuracyLow: cognitiveRisk.accuracyLow,
      behavioralAnomalies: behavioralRisk.anomaliesDetected,
      voiceStressDetected: voiceRisk.stressDetected,
      facialStressDetected: facialRisk.stressDetected,
      contextualRisk: contextualRisk,
    };
  }

  private analyzeCognitivePerformance(
    signals: AssessmentSignals,
    baseline?: UserBaseline
  ): {
    score: number;
    confidence: number;
    reactionTimeElevated: boolean;
    accuracyLow: boolean;
  } {
    if (!signals.stroopTrials || signals.stroopTrials.length === 0) {
      return { score: 0, confidence: 0, reactionTimeElevated: false, accuracyLow: false };
    }

    const trials = signals.stroopTrials;
    const avgReactionTime = trials.reduce((sum, trial) => sum + trial.reactionTimeMs, 0) / trials.length;
    const accuracy = trials.filter(trial => trial.correct).length / trials.length;

    let riskScore = 0;
    let reactionTimeElevated = false;
    let accuracyLow = false;

    // Analyze reaction time vs baseline
    if (baseline?.reactionTimeMs) {
      const reactionTimeZScore = (avgReactionTime - baseline.reactionTimeMs) / (baseline.reactionTimeStdDev || 50);
      if (reactionTimeZScore > 2) {
        riskScore += 30; // Significantly slower than baseline
        reactionTimeElevated = true;
      } else if (reactionTimeZScore > 1) {
        riskScore += 15; // Moderately slower
        reactionTimeElevated = true;
      }
    } else {
      // No baseline - use population norms
      if (avgReactionTime > 800) {
        riskScore += 25;
        reactionTimeElevated = true;
      } else if (avgReactionTime > 600) {
        riskScore += 10;
        reactionTimeElevated = true;
      }
    }

    // Analyze accuracy vs baseline
    if (baseline?.accuracy) {
      const accuracyDiff = baseline.accuracy - accuracy;
      if (accuracyDiff > 0.15) { // 15% drop in accuracy
        riskScore += 25;
        accuracyLow = true;
      } else if (accuracyDiff > 0.08) { // 8% drop
        riskScore += 12;
        accuracyLow = true;
      }
    } else {
      // No baseline - use absolute thresholds
      if (accuracy < 0.7) {
        riskScore += 20;
        accuracyLow = true;
      } else if (accuracy < 0.85) {
        riskScore += 8;
        accuracyLow = true;
      }
    }

    // Analyze consistency (reaction time variance)
    const reactionTimeVariance = this.calculateVariance(trials.map(t => t.reactionTimeMs));
    if (reactionTimeVariance > 10000) { // High variance indicates inconsistency
      riskScore += 10;
    }

    return {
      score: Math.min(60, riskScore), // Cap cognitive component at 60%
      confidence: 0.9, // High confidence in cognitive tests
      reactionTimeElevated,
      accuracyLow,
    };
  }

  private analyzeBehavioralBiometrics(
    signals: AssessmentSignals,
    baseline?: UserBaseline
  ): {
    score: number;
    confidence: number;
    anomaliesDetected: boolean;
  } {
    let riskScore = 0;
    let anomaliesDetected = false;

    // Analyze mouse movement patterns
    if (signals.mouseMovements && signals.mouseMovements.length > 0) {
      const mouseStability = this.calculateMouseStability(signals.mouseMovements);
      if (baseline?.mouseStability) {
        const stabilityDiff = baseline.mouseStability - mouseStability;
        if (stabilityDiff > 0.3) {
          riskScore += 15;
          anomaliesDetected = true;
        } else if (stabilityDiff > 0.15) {
          riskScore += 8;
          anomaliesDetected = true;
        }
      } else {
        // No baseline - use absolute thresholds
        if (mouseStability < 0.5) {
          riskScore += 12;
          anomaliesDetected = true;
        }
      }
    }

    // Analyze keystroke timing patterns
    if (signals.keystrokeTimings && signals.keystrokeTimings.length > 0) {
      const keystrokeRhythm = this.calculateKeystrokeRhythm(signals.keystrokeTimings);
      if (baseline?.keystrokeRhythm) {
        const rhythmDiff = Math.abs(baseline.keystrokeRhythm - keystrokeRhythm);
        if (rhythmDiff > 0.4) {
          riskScore += 12;
          anomaliesDetected = true;
        } else if (rhythmDiff > 0.2) {
          riskScore += 6;
          anomaliesDetected = true;
        }
      } else {
        // No baseline - look for extreme irregularity
        if (keystrokeRhythm < 0.3) {
          riskScore += 10;
          anomaliesDetected = true;
        }
      }
    }

    // Analyze click latency
    if (signals.clickLatency) {
      if (signals.clickLatency > 300) { // Very slow to click
        riskScore += 8;
        anomaliesDetected = true;
      } else if (signals.clickLatency < 50) { // Impulsively fast
        riskScore += 12;
        anomaliesDetected = true;
      }
    }

    return {
      score: Math.min(35, riskScore), // Cap behavioral component at 35%
      confidence: 0.7, // Moderate confidence in behavioral metrics
      anomaliesDetected,
    };
  }

  private analyzeSelfReport(signals: AssessmentSignals): {
    score: number;
    confidence: number;
  } {
    if (signals.stressLevel === undefined || signals.stressLevel === null) {
      return { score: 0, confidence: 0 };
    }

    let riskScore = 0;
    const stressLevel = signals.stressLevel;

    if (stressLevel >= 8) {
      riskScore = 40; // Very high self-reported stress
    } else if (stressLevel >= 6) {
      riskScore = 25; // High stress
    } else if (stressLevel >= 4) {
      riskScore = 10; // Moderate stress
    }
    // Low stress (0-3) contributes 0 risk

    return {
      score: riskScore,
      confidence: 0.8, // High confidence in self-report
    };
  }

  private analyzeVoiceProsody(signals: AssessmentSignals): {
    score: number;
    confidence: number;
    stressDetected: boolean;
  } {
    if (!signals.voiceProsodyFeatures) {
      return { score: 0, confidence: 0, stressDetected: false };
    }

    const features = signals.voiceProsodyFeatures;
    let riskScore = 0;
    let stressDetected = false;

    // High pitch can indicate stress
    if (features.pitch > 250) {
      riskScore += 15;
      stressDetected = true;
    } else if (features.pitch > 200) {
      riskScore += 8;
      stressDetected = true;
    }

    // Jitter and shimmer indicate voice instability
    if (features.jitter > 0.02) {
      riskScore += 10;
      stressDetected = true;
    }

    if (features.shimmer > 0.08) {
      riskScore += 10;
      stressDetected = true;
    }

    // Very low energy can indicate fatigue/depression
    if (features.energy < 0.3) {
      riskScore += 8;
      stressDetected = true;
    }

    return {
      score: Math.min(25, riskScore), // Cap voice component at 25%
      confidence: 0.6, // Moderate confidence in voice analysis
      stressDetected,
    };
  }

  private analyzeFacialExpressions(signals: AssessmentSignals): {
    score: number;
    confidence: number;
    stressDetected: boolean;
  } {
    if (!signals.facialExpressionFeatures) {
      return { score: 0, confidence: 0, stressDetected: false };
    }

    const features = signals.facialExpressionFeatures;
    let riskScore = 0;
    let stressDetected = false;

    // Furrowed brow indicates concentration/stress
    if (features.browFurrow > 0.7) {
      riskScore += 12;
      stressDetected = true;
    } else if (features.browFurrow > 0.4) {
      riskScore += 6;
      stressDetected = true;
    }

    // Increased blink rate can indicate stress
    if (features.blinkRate > 25) {
      riskScore += 10;
      stressDetected = true;
    } else if (features.blinkRate > 18) {
      riskScore += 5;
      stressDetected = true;
    }

    // Poor gaze fixation indicates distraction
    if (features.gazeFixation < 0.2) {
      riskScore += 8;
      stressDetected = true;
    }

    return {
      score: Math.min(20, riskScore), // Cap facial component at 20%
      confidence: 0.5, // Lower confidence in facial analysis
      stressDetected,
    };
  }

  private analyzeContextualFactors(orderContext?: OrderContext): number {
    if (!orderContext) return 0;

    let contextRisk = 0;

    // High leverage increases risk
    if (orderContext.leverage && orderContext.leverage > 10) {
      contextRisk += 5;
    } else if (orderContext.leverage && orderContext.leverage > 5) {
      contextRisk += 2;
    }

    // Recent losses increase risk
    if (orderContext.recentLosses && orderContext.recentLosses > 3) {
      contextRisk += 8;
    } else if (orderContext.recentLosses && orderContext.recentLosses > 1) {
      contextRisk += 3;
    }

    // Negative P&L increases risk
    if (orderContext.currentPnL && orderContext.currentPnL < -1000) {
      contextRisk += 10;
    } else if (orderContext.currentPnL && orderContext.currentPnL < -500) {
      contextRisk += 5;
    }

    // Time of day considerations (late trading hours)
    const hour = new Date(orderContext.timeOfDay).getHours();
    if (hour < 6 || hour > 22) {
      contextRisk += 3; // Late night/early morning trading
    }

    // Market volatility
    if (orderContext.marketVolatility && orderContext.marketVolatility > 0.8) {
      contextRisk += 5;
    }

    return Math.min(15, contextRisk); // Cap contextual risk at 15%
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMouseStability(movements: number[]): number {
    if (movements.length < 2) return 1.0;
    
    // Calculate smoothness of mouse movements
    let totalVariation = 0;
    for (let i = 1; i < movements.length; i++) {
      totalVariation += Math.abs(movements[i] - movements[i - 1]);
    }
    
    // Lower variation = higher stability
    const avgVariation = totalVariation / (movements.length - 1);
    return Math.max(0, 1 - (avgVariation / 100)); // Normalize to 0-1
  }

  private calculateKeystrokeRhythm(timings: number[]): number {
    if (timings.length < 2) return 1.0;
    
    // Calculate consistency of keystroke intervals
    const variance = this.calculateVariance(timings);
    const avgTiming = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    
    // Lower coefficient of variation = more consistent rhythm
    const coefficientOfVariation = Math.sqrt(variance) / avgTiming;
    return Math.max(0, 1 - coefficientOfVariation);
  }
}
