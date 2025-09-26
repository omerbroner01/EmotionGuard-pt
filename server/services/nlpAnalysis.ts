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
            content: `You are an expert in trading psychology and risk management. Analyze the following trader's journal entry and provide insights in JSON format.

Your analysis should include:
- emotionalTriggers: Array of identified emotional triggers (e.g., "FOMO", "revenge trading", "fatigue", "overconfidence", "fear of loss")
- riskLevel: Overall risk level assessment ("low", "medium", "high")
- planQuality: Quality of the trader's plan ("poor", "fair", "good", "excellent")
- summary: Brief 1-2 sentence summary of the entry
- recommendations: Array of actionable recommendations for the trader
- complianceTags: Array of compliance-relevant tags for regulatory review

Focus on identifying psychological patterns, emotional states, and risk factors that could impact trading decisions.`
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
}
