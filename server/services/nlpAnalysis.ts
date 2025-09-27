import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface JournalAnalysis {
  emotionalTriggers: string[];
  riskLevel: 'low' | 'medium' | 'high';
  planQuality: 'poor' | 'fair' | 'good' | 'excellent';
  summary: string;
  recommendations: string[];
  complianceTags: string[];
  // Enhanced AI analysis fields
  psychologicalPatterns: string[];
  confidenceLevel: number; // 0-100% confidence in analysis
  emotionalIntensity: number; // 1-10 scale
  cognitiveLoad: 'low' | 'medium' | 'high'; // Mental strain indicator
  tradingMindset: 'disciplined' | 'impulsive' | 'uncertain' | 'overconfident';
  personalizedInsights: string[];
}

export class NLPAnalysisService {
  async analyzeJournalEntry(
    trigger: string,
    plan: string,
    entry?: string
  ): Promise<JournalAnalysis> {
    try {
      const fullText = `Trigger: ${trigger}\nPlan: ${plan}${entry ? `\nAdditional Notes: ${entry}` : ''}`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are Dr. Sarah Chen, a leading expert in behavioral finance and trading psychology with 20+ years experience analyzing trader behavior patterns. Your analysis has helped thousands of traders improve their decision-making and risk management.

Analyze the following trader's journal entry with deep psychological insight and provide a comprehensive assessment in JSON format.

Core Analysis:
- emotionalTriggers: Array of specific emotional triggers (e.g., "FOMO", "revenge_trading", "loss_aversion", "overconfidence", "fatigue", "time_pressure", "social_proof", "anchoring_bias", "confirmation_bias")
- riskLevel: Overall risk level ("low", "medium", "high") considering psychological state
- planQuality: Quality of trader's plan ("poor", "fair", "good", "excellent") 
- summary: Concise 1-2 sentence analysis of the trader's mental state
- recommendations: Array of specific, actionable recommendations
- complianceTags: Regulatory compliance tags for oversight

Enhanced AI Analysis:
- psychologicalPatterns: Deeper behavioral patterns (e.g., "perfectionism", "analysis_paralysis", "emotional_flooding", "cognitive_dissonance", "self_sabotage")
- confidenceLevel: Your confidence in this analysis (0-100%)
- emotionalIntensity: Intensity of emotions detected (1-10 scale)
- cognitiveLoad: Mental processing strain ("low", "medium", "high")
- tradingMindset: Current mindset state ("disciplined", "impulsive", "uncertain", "overconfident")
- personalizedInsights: Tailored insights based on specific language patterns and context

Look for subtle linguistic cues: word choice, sentence structure, emotional intensity, cognitive distortions, rationalization patterns, and trading-specific psychological phenomena. Consider the trader's emotional journey, stress indicators, and decision-making clarity.`
          },
          {
            role: "user",
            content: fullText
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        emotionalTriggers: result.emotionalTriggers || [],
        riskLevel: result.riskLevel || 'medium',
        planQuality: result.planQuality || 'fair',
        summary: result.summary || 'Journal entry analyzed.',
        recommendations: result.recommendations || [],
        complianceTags: result.complianceTags || [],
        // Enhanced AI analysis fields
        psychologicalPatterns: result.psychologicalPatterns || [],
        confidenceLevel: result.confidenceLevel || 85,
        emotionalIntensity: result.emotionalIntensity || 5,
        cognitiveLoad: result.cognitiveLoad || 'medium',
        tradingMindset: result.tradingMindset || 'uncertain',
        personalizedInsights: result.personalizedInsights || [],
      };
    } catch (error) {
      console.error('NLP analysis failed:', error);
      
      // Fallback analysis
      return {
        emotionalTriggers: this.extractBasicTriggers(trigger, entry),
        riskLevel: this.assessBasicRiskLevel(trigger, plan),
        planQuality: this.assessBasicPlanQuality(plan),
        summary: 'Basic analysis completed - NLP service temporarily unavailable.',
        recommendations: ['Review trading plan', 'Consider risk management rules'],
        complianceTags: ['manual_review_required'],
        // Enhanced AI analysis fallbacks
        psychologicalPatterns: ['analysis_unavailable'],
        confidenceLevel: 60,
        emotionalIntensity: this.assessBasicEmotionalIntensity(trigger, entry),
        cognitiveLoad: this.assessBasicCognitiveLoad(trigger, plan),
        tradingMindset: 'uncertain',
        personalizedInsights: ['AI analysis temporarily unavailable - consider manual review'],
      };
    }
  }

  async generateComplianceSummary(
    assessments: Array<{
      riskScore: number;
      verdict: string;
      reasonTags: string[];
      journalAnalysis?: JournalAnalysis;
      overrideUsed?: boolean;
      overrideReason?: string;
    }>
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Generate a concise compliance summary of trading behavior based on EmotionGuard assessments. Focus on patterns, risk trends, and regulatory compliance aspects. Keep it professional and factual.`
          },
          {
            role: "user",
            content: `Analyze these recent trading assessments: ${JSON.stringify(assessments)}`
          }
        ],
      });

      return response.choices[0].message.content || 'Compliance summary generated.';
    } catch (error) {
      console.error('Compliance summary generation failed:', error);
      return 'Compliance summary: Multiple trading assessments completed. Manual review recommended for detailed analysis.';
    }
  }

  private extractBasicTriggers(trigger: string, entry?: string): string[] {
    const triggerMap: Record<string, string> = {
      'Recent loss': 'revenge_trading',
      'FOMO (Fear of Missing Out)': 'FOMO',
      'Market volatility': 'volatility_stress',
      'Time pressure': 'time_pressure',
      'Fatigue': 'fatigue',
      'Other': 'unspecified'
    };

    const triggers = [triggerMap[trigger] || 'unspecified'];
    
    if (entry) {
      const text = entry.toLowerCase();
      if (text.includes('loss') || text.includes('losing')) triggers.push('loss_aversion');
      if (text.includes('fast') || text.includes('quick')) triggers.push('urgency');
      if (text.includes('tired') || text.includes('exhausted')) triggers.push('fatigue');
    }
    
    return Array.from(new Set(triggers)); // Remove duplicates
  }

  private assessBasicRiskLevel(trigger: string, plan: string): 'low' | 'medium' | 'high' {
    const highRiskTriggers = ['Recent loss', 'FOMO (Fear of Missing Out)'];
    const hasHighRiskTrigger = highRiskTriggers.includes(trigger);
    const hasPlan = plan.trim().length > 10;
    
    if (hasHighRiskTrigger && !hasPlan) return 'high';
    if (hasHighRiskTrigger || !hasPlan) return 'medium';
    return 'low';
  }

  private assessBasicPlanQuality(plan: string): 'poor' | 'fair' | 'good' | 'excellent' {
    const planLength = plan.trim().length;
    const hasSpecifics = /\d/.test(plan); // Contains numbers (likely specific actions)
    const hasActionWords = /(reduce|increase|wait|stop|limit|set)/i.test(plan);
    
    if (planLength < 10) return 'poor';
    if (planLength < 30 && !hasSpecifics) return 'fair';
    if (planLength >= 30 && (hasSpecifics || hasActionWords)) return 'good';
    if (planLength >= 50 && hasSpecifics && hasActionWords) return 'excellent';
    
    return 'fair';
  }

  private assessBasicEmotionalIntensity(trigger: string, entry?: string): number {
    const highIntensityTriggers = ['Recent loss', 'FOMO (Fear of Missing Out)'];
    const highIntensityWords = ['extremely', 'very', 'incredibly', 'massive', 'huge', 'devastated', 'panicked'];
    
    let intensity = 5; // Base intensity
    
    if (highIntensityTriggers.includes(trigger)) intensity += 2;
    
    if (entry) {
      const text = entry.toLowerCase();
      const intensityMatches = highIntensityWords.filter(word => text.includes(word)).length;
      intensity += intensityMatches;
      
      // Check for exclamation marks and caps
      const exclamations = (text.match(/!/g) || []).length;
      const capsWords = (text.match(/[A-Z]{2,}/g) || []).length;
      intensity += Math.min(exclamations + capsWords, 2);
    }
    
    return Math.min(Math.max(intensity, 1), 10); // Clamp between 1-10
  }

  private assessBasicCognitiveLoad(trigger: string, plan: string): 'low' | 'medium' | 'high' {
    const complexTriggers = ['Market volatility', 'Time pressure'];
    const planComplexity = plan.split(/[.!?]/).length; // Number of sentences
    const hasComplexThought = plan.length > 100;
    
    if (complexTriggers.includes(trigger) && hasComplexThought) return 'high';
    if (complexTriggers.includes(trigger) || planComplexity > 3) return 'medium';
    return 'low';
  }
}
