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

export interface StroopTrial {
  word: string;
  color: string;
  response: string;
  reactionTimeMs: number;
  correct: boolean;
}

export interface AssessmentSignals {
  mouseMovements?: number[];
  keystrokeTimings?: number[];
  clickLatency?: number;
  stroopTrials?: StroopTrial[];
  stressLevel?: number;
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
}

export interface AssessmentResult {
  assessmentId: string;
  riskScore: number;
  verdict: 'go' | 'hold' | 'block';
  reasonTags: string[];
  confidence: number;
  recommendedAction: string;
  cooldownDuration?: number;
}

export interface Policy {
  id: string;
  name: string;
  strictnessLevel: 'lenient' | 'standard' | 'strict' | 'custom';
  riskThreshold: number;
  cooldownDuration: number;
  enabledModes: {
    cognitiveTest: boolean;
    behavioralBiometrics: boolean;
    selfReport: boolean;
    voiceProsody: boolean;
    facialExpression: boolean;
  };
  overrideAllowed: boolean;
  supervisorNotification: boolean;
  dataRetentionDays: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserBaseline {
  id: string;
  userId: string;
  reactionTimeMs?: number;
  reactionTimeStdDev?: number;
  accuracy?: number;
  accuracyStdDev?: number;
  mouseStability?: number;
  keystrokeRhythm?: number;
  calibrationCount: number;
  lastCalibrated: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  userId: string;
  policyId: string;
  orderContext: OrderContext;
  quickCheckDurationMs?: number;
  stroopTestResults?: StroopTrial[];
  selfReportStress?: number;
  behavioralMetrics?: any;
  voiceProsodyScore?: number;
  facialExpressionScore?: number;
  riskScore: number;
  verdict: 'go' | 'hold' | 'block';
  reasonTags: string[];
  confidence?: number;
  cooldownCompleted?: boolean;
  cooldownDurationMs?: number;
  journalEntry?: string;
  journalTrigger?: string;
  journalPlan?: string;
  overrideUsed?: boolean;
  overrideReason?: string;
  supervisorNotified?: boolean;
  tradeExecuted?: boolean;
  tradeOutcome?: any;
  createdAt: string;
}

export interface AnalyticsStats {
  totalAssessments: number;
  triggerRate: number;
  blockRate: number;
  overrideRate: number;
  averageRiskScore: number;
}

export interface RealTimeEvent {
  id: string;
  eventType: string;
  userId?: string;
  assessmentId?: string;
  data: any;
  processed: boolean;
  createdAt: string;
}
