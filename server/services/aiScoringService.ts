import type { UserBaseline } from "@shared/schema";
import type { AssessmentSignals, OrderContext, StroopTrial } from "../../client/src/types/emotionGuard.js";

interface BiometricPattern {
  mouseStability: number; // 0-1, higher = more stable
  keystrokeRhythm: number; // 0-1, higher = more consistent
  velocityVariance: number; // 0-1, higher = more erratic
  microTremors: number; // 0-1, higher = more stress indicators
}

interface CognitiveProfile {
  reactionSpeed: number; // 0-1, higher = faster reactions
  accuracy: number; // 0-1, higher = more accurate
  consistency: number; // 0-1, higher = more consistent
  attentionStability: number; // 0-1, higher = better focus
}

interface AIAnalysisResult {
  stressLevel: number; // 0-10 scale
  confidence: number; // 0-1 scale
  primaryIndicators: string[];
  riskFactors: string[];
  verdict: 'go' | 'hold' | 'block';
  reasoning: string;
  anomalies: string[];
}

/**
 * Advanced AI-powered stress assessment using OpenAI for pattern recognition
 * and sophisticated multi-modal signal analysis
 */
export class AIScoringService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found - AI scoring will use fallback algorithms');
    }
  }

  /**
   * Main entry point for AI-powered stress assessment
   */
  async analyzeStressSignals(
    signals: AssessmentSignals,
    baseline?: UserBaseline,
    orderContext?: OrderContext
  ): Promise<AIAnalysisResult> {
    console.log('🧠 Starting AI-powered stress analysis...');
    const startTime = performance.now();

    // Step 1: Advanced biometric pattern analysis
    const biometricPattern = this.analyzeBiometricPatterns(signals);
    
    // Step 2: Sophisticated cognitive profiling
    const cognitiveProfile = this.analyzeCognitivePerformance(signals);
    
    // Step 3: Multi-modal integration with AI
    const aiAnalysis = await this.performAIAnalysis(
      signals, 
      biometricPattern, 
      cognitiveProfile, 
      baseline, 
      orderContext
    );

    const analysisTime = performance.now() - startTime;
    console.log(`🧠 AI analysis completed in ${analysisTime.toFixed(1)}ms`);

    return aiAnalysis;
  }

  /**
   * Advanced biometric pattern recognition using signal processing techniques
   */
  private analyzeBiometricPatterns(signals: AssessmentSignals): BiometricPattern {
    const mouseMovements = signals.mouseMovements || [];
    const keystrokeTimings = signals.keystrokeTimings || [];

    // Mouse stability analysis using statistical methods
    const mouseStability = this.calculateMouseStability(mouseMovements);
    
    // Keystroke rhythm analysis using timing variance
    const keystrokeRhythm = this.calculateKeystrokeRhythm(keystrokeTimings);
    
    // Velocity variance analysis for stress detection
    const velocityVariance = this.calculateVelocityVariance(mouseMovements);
    
    // Micro-tremor detection using frequency analysis
    const microTremors = this.detectMicroTremors(mouseMovements);

    return {
      mouseStability,
      keystrokeRhythm,
      velocityVariance,
      microTremors
    };
  }

  /**
   * Calculate mouse movement stability using coefficient of variation
   */
  private calculateMouseStability(movements: number[]): number {
    if (movements.length < 5) return 0.5; // Insufficient data

    const mean = movements.reduce((sum, m) => sum + m, 0) / movements.length;
    const variance = movements.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / movements.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    // Lower CV = higher stability (invert for 0-1 scale)
    return Math.max(0, Math.min(1, 1 - (coefficientOfVariation / 2)));
  }

  /**
   * Analyze keystroke rhythm consistency using inter-key interval analysis
   */
  private calculateKeystrokeRhythm(timings: number[]): number {
    if (timings.length < 3) return 0.5;

    const intervals = timings.slice(1).map((time, i) => time - timings[i]);
    const meanInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / intervals.length;
    const rhythmScore = 1 / (1 + variance / 1000); // Normalize and invert

    return Math.max(0, Math.min(1, rhythmScore));
  }

  /**
   * Calculate velocity variance to detect erratic movements
   */
  private calculateVelocityVariance(movements: number[]): number {
    if (movements.length < 5) return 0.5;

    const velocities = movements.slice(1).map((pos, i) => Math.abs(pos - movements[i]));
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;

    // Higher variance = more erratic = higher stress indicator
    return Math.max(0, Math.min(1, variance / 100));
  }

  /**
   * Detect micro-tremors using high-frequency analysis
   */
  private detectMicroTremors(movements: number[]): number {
    if (movements.length < 10) return 0;

    let tremorCount = 0;
    const windowSize = 3;

    for (let i = windowSize; i < movements.length - windowSize; i++) {
      const window = movements.slice(i - windowSize, i + windowSize + 1);
      const localVariance = this.calculateLocalVariance(window);
      
      if (localVariance > 5) { // Threshold for tremor detection
        tremorCount++;
      }
    }

    return Math.max(0, Math.min(1, tremorCount / (movements.length - 2 * windowSize)));
  }

  /**
   * Calculate local variance for tremor detection
   */
  private calculateLocalVariance(window: number[]): number {
    const mean = window.reduce((sum, w) => sum + w, 0) / window.length;
    return window.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / window.length;
  }

  /**
   * Advanced cognitive performance analysis using reaction time patterns
   */
  private analyzeCognitivePerformance(signals: AssessmentSignals): CognitiveProfile {
    const stroopTrials = signals.stroopTrials || [];
    
    if (stroopTrials.length === 0) {
      return {
        reactionSpeed: 0.5,
        accuracy: 0.5,
        consistency: 0.5,
        attentionStability: 0.5
      };
    }

    // Reaction speed analysis (inverted - faster is better)
    const avgReactionTime = stroopTrials.reduce((sum: number, trial: StroopTrial) => sum + trial.reactionTimeMs, 0) / stroopTrials.length;
    const reactionSpeed = Math.max(0, Math.min(1, 1 - (avgReactionTime - 500) / 2000)); // Normalize around 500ms

    // Accuracy calculation
    const correctTrials = stroopTrials.filter((trial: StroopTrial) => trial.correct).length;
    const accuracy = correctTrials / stroopTrials.length;

    // Consistency analysis using reaction time variance
    const reactionVariance = stroopTrials.reduce((sum: number, trial: StroopTrial) => 
      sum + Math.pow(trial.reactionTimeMs - avgReactionTime, 2), 0) / stroopTrials.length;
    const consistency = Math.max(0, Math.min(1, 1 - reactionVariance / 1000000)); // Normalize

    // Attention stability - combination of accuracy and consistency
    const attentionStability = (accuracy * 0.6) + (consistency * 0.4);

    return {
      reactionSpeed,
      accuracy,
      consistency,
      attentionStability
    };
  }

  /**
   * Perform AI analysis using OpenAI for pattern recognition and decision making
   */
  private async performAIAnalysis(
    signals: AssessmentSignals,
    biometric: BiometricPattern,
    cognitive: CognitiveProfile,
    baseline?: UserBaseline,
    orderContext?: OrderContext
  ): Promise<AIAnalysisResult> {
    // Prepare analysis context for AI
    const analysisContext = {
      biometric: {
        mouseStability: biometric.mouseStability.toFixed(3),
        keystrokeRhythm: biometric.keystrokeRhythm.toFixed(3),
        velocityVariance: biometric.velocityVariance.toFixed(3),
        microTremors: biometric.microTremors.toFixed(3)
      },
      cognitive: {
        reactionSpeed: cognitive.reactionSpeed.toFixed(3),
        accuracy: cognitive.accuracy.toFixed(3),
        consistency: cognitive.consistency.toFixed(3),
        attentionStability: cognitive.attentionStability.toFixed(3)
      },
      selfReport: signals.stressLevel || null,
      facialMetrics: signals.facialMetrics ? {
        blinkRate: signals.facialMetrics.blinkRate || 15,
        browFurrowing: signals.facialMetrics.browFurrow || 0,
        jawTension: signals.facialMetrics.jawOpenness || 0,
        gazeStability: signals.facialMetrics.gazeStability || 1
      } : null,
      orderContext: orderContext ? {
        orderSize: orderContext.size,
        leverage: orderContext.leverage,
        marketVolatility: orderContext.marketVolatility
      } : null,
      baseline: baseline ? {
        reactionTime: baseline.reactionTimeMs,
        mouseStability: baseline.mouseStability,
        keystrokeRhythm: baseline.keystrokeRhythm,
        accuracy: baseline.accuracy
      } : null
    };

    if (this.openaiApiKey) {
      return await this.performOpenAIAnalysis(analysisContext);
    } else {
      return this.performFallbackAnalysis(analysisContext, biometric, cognitive, signals);
    }
  }

  /**
   * Use OpenAI for sophisticated pattern recognition and stress assessment
   */
  private async performOpenAIAnalysis(context: any): Promise<AIAnalysisResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{
            role: 'system',
            content: `You are an expert stress analyst for financial trading platforms. Analyze the provided biometric, cognitive, and contextual signals to determine trader stress levels. 

            Consider:
            - Biometric stability patterns (mouse, keyboard, micro-tremors)
            - Cognitive performance (reaction time, accuracy, consistency)
            - Self-reported stress levels
            - Facial expression indicators
            - Order context (size, leverage, risk)
            - User baseline comparisons

            Provide a JSON response with:
            - stressLevel: 0-10 scale (0=calm, 10=extreme stress)
            - confidence: 0-1 scale (quality of assessment)
            - verdict: 'go', 'hold', or 'block'
            - primaryIndicators: array of main stress signals detected
            - riskFactors: array of concerning patterns
            - reasoning: brief explanation of decision
            - anomalies: unusual patterns detected

            Be conservative - err on the side of trader safety.`
          }, {
            role: 'user',
            content: `Analyze this trader assessment data: ${JSON.stringify(context, null, 2)}`
          }],
          temperature: 0.1,
          max_tokens: 500
        })
      });

      const data = await response.json();
      const aiResponse = JSON.parse(data.choices[0].message.content);

      // Validate and sanitize AI response
      return {
        stressLevel: Math.max(0, Math.min(10, aiResponse.stressLevel || 5)),
        confidence: Math.max(0, Math.min(1, aiResponse.confidence || 0.5)),
        verdict: ['go', 'hold', 'block'].includes(aiResponse.verdict) ? aiResponse.verdict : 'hold',
        primaryIndicators: Array.isArray(aiResponse.primaryIndicators) ? aiResponse.primaryIndicators : [],
        riskFactors: Array.isArray(aiResponse.riskFactors) ? aiResponse.riskFactors : [],
        reasoning: aiResponse.reasoning || 'Analysis completed',
        anomalies: Array.isArray(aiResponse.anomalies) ? aiResponse.anomalies : []
      };

    } catch (error) {
      console.error('🚫 OpenAI analysis failed, using fallback:', error);
      return this.performFallbackAnalysis(context, null, null, null);
    }
  }

  /**
   * Sophisticated fallback analysis when OpenAI is not available
   */
  private performFallbackAnalysis(
    context: any, 
    biometric: BiometricPattern | null, 
    cognitive: CognitiveProfile | null,
    signals: AssessmentSignals | null
  ): AIAnalysisResult {
    // Use the pre-analyzed patterns or extract from context
    const bio = biometric || {
      mouseStability: parseFloat(context.biometric?.mouseStability || '0.5'),
      keystrokeRhythm: parseFloat(context.biometric?.keystrokeRhythm || '0.5'),
      velocityVariance: parseFloat(context.biometric?.velocityVariance || '0.5'),
      microTremors: parseFloat(context.biometric?.microTremors || '0.5')
    };

    const cog = cognitive || {
      reactionSpeed: parseFloat(context.cognitive?.reactionSpeed || '0.5'),
      accuracy: parseFloat(context.cognitive?.accuracy || '0.5'),
      consistency: parseFloat(context.cognitive?.consistency || '0.5'),
      attentionStability: parseFloat(context.cognitive?.attentionStability || '0.5')
    };

    // Advanced multi-factor stress calculation
    let stressScore = 0;
    const indicators: string[] = [];
    const riskFactors: string[] = [];
    const anomalies: string[] = [];

    // Biometric stress indicators
    if (bio.mouseStability < 0.4) {
      stressScore += 2.0;
      indicators.push('Erratic mouse movements');
    }
    if (bio.velocityVariance > 0.6) {
      stressScore += 1.5;
      indicators.push('High movement variability');
    }
    if (bio.microTremors > 0.3) {
      stressScore += 2.5;
      indicators.push('Micro-tremors detected');
      anomalies.push('Unusual tremor patterns');
    }
    if (bio.keystrokeRhythm < 0.4) {
      stressScore += 1.0;
      indicators.push('Irregular typing rhythm');
    }

    // Cognitive stress indicators
    if (cog.accuracy < 0.7) {
      stressScore += 2.0;
      indicators.push('Reduced cognitive accuracy');
    }
    if (cog.consistency < 0.5) {
      stressScore += 1.5;
      indicators.push('Inconsistent reaction times');
    }
    if (cog.attentionStability < 0.6) {
      stressScore += 2.0;
      indicators.push('Attention instability');
    }

    // Self-report integration
    const selfReport = context.selfReport;
    if (selfReport && selfReport > 6) {
      stressScore += (selfReport - 5) * 0.8;
      indicators.push('High self-reported stress');
    }

    // Facial metrics integration
    const facial = context.facialMetrics;
    if (facial) {
      if (facial.blinkRate > 25) {
        stressScore += 1.0;
        indicators.push('Elevated blink rate');
      }
      if (facial.browFurrowing > 0.5) {
        stressScore += 1.5;
        indicators.push('Brow furrowing detected');
      }
      if (facial.gazeStability < 0.7) {
        stressScore += 1.0;
        indicators.push('Unstable gaze pattern');
      }
    }

    // Order context risk factors
    const order = context.orderContext;
    if (order) {
      if (order.leverage > 10) {
        stressScore += 0.5;
        riskFactors.push('High leverage trading');
      }
      if (order.riskAmount > 1000) {
        stressScore += 0.8;
        riskFactors.push('High risk amount');
      }
    }

    // Calculate final stress level (0-10 scale)
    const finalStressLevel = Math.max(0, Math.min(10, stressScore));

    // Calculate confidence based on signal quality
    let confidence = 0.7; // Base confidence
    if (bio.mouseStability > 0 || cog.accuracy > 0) confidence += 0.1;
    if (selfReport) confidence += 0.15;
    if (facial) confidence += 0.05;
    
    confidence = Math.max(0.3, Math.min(1.0, confidence));

    // Determine verdict based on stress level and risk factors
    let verdict: 'go' | 'hold' | 'block' = 'go';
    if (finalStressLevel >= 7.5 || bio.microTremors > 0.4) {
      verdict = 'block';
    } else if (finalStressLevel >= 5.0 || riskFactors.length > 1) {
      verdict = 'hold';
    }

    // Generate reasoning
    const reasoning = `Stress analysis: ${finalStressLevel.toFixed(1)}/10 based on ${indicators.length} indicators. ` +
                     `Confidence: ${(confidence * 100).toFixed(0)}%. ` +
                     `Primary concerns: ${indicators.slice(0, 2).join(', ') || 'None detected'}.`;

    return {
      stressLevel: finalStressLevel,
      confidence,
      verdict,
      primaryIndicators: indicators,
      riskFactors,
      reasoning,
      anomalies
    };
  }
}