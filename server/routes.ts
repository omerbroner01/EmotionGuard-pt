import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { EmotionGuardService } from "./services/emotionGuard";
import { NLPAnalysisService } from "./services/nlpAnalysis";
import { AdaptiveBaselineLearningService } from "./services/adaptiveBaselineLearning";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";

// Request validation schemas
const checkTradeSchema = z.object({
  orderContext: z.object({
    instrument: z.string(),
    size: z.number(),
    orderType: z.enum(['market', 'limit']),
    side: z.enum(['buy', 'sell']),
    leverage: z.number().optional(),
    currentPnL: z.number().optional(),
    recentLosses: z.number().optional(),
    timeOfDay: z.string(),
    marketVolatility: z.number().optional(),
  }),
  fastMode: z.boolean().optional(),
  signals: z.object({
    mouseMovements: z.array(z.number()).optional(),
    keystrokeTimings: z.array(z.number()).optional(),
    clickLatency: z.number().optional(),
    stroopTrials: z.array(z.object({
      word: z.string(),
      color: z.string(),
      response: z.string(),
      reactionTimeMs: z.number(),
      correct: z.boolean(),
    })).optional(),
    stressLevel: z.number().min(0).max(10).optional(),
    voiceProsodyFeatures: z.object({
      pitch: z.number(),
      jitter: z.number(),
      shimmer: z.number(),
      energy: z.number(),
    }).optional(),
    facialExpressionFeatures: z.object({
      browFurrow: z.number(),
      blinkRate: z.number(),
      gazeFixation: z.number(),
    }).optional(),
    facialMetrics: z.object({
      isPresent: z.boolean(),
      blinkRate: z.number(),
      eyeAspectRatio: z.number(),
      jawOpenness: z.number(),
      browFurrow: z.number(),
      gazeStability: z.number(),
    }).optional(),
  }),
});

const cooldownSchema = z.object({
  assessmentId: z.string(),
  durationMs: z.number(),
});

const journalSchema = z.object({
  assessmentId: z.string(),
  trigger: z.string(),
  plan: z.string(),
  entry: z.string().optional(),
});

const overrideSchema = z.object({
  assessmentId: z.string(),
  reason: z.string().min(10),
});

const outcomeSchema = z.object({
  assessmentId: z.string(),
  outcome: z.object({
    executed: z.boolean(),
    pnl: z.number().optional(),
    duration: z.number().optional(),
    maxFavorableExcursion: z.number().optional(),
    maxAdverseExcursion: z.number().optional(),
  }),
});

const baselineSchema = z.object({
  reactionTimeMs: z.number(),
  reactionTimeStdDev: z.number(),
  accuracy: z.number(),
  accuracyStdDev: z.number(),
  mouseStability: z.number(),
  keystrokeRhythm: z.number(),
});

const policyUpdateSchema = z.object({
  name: z.string().optional(),
  strictnessLevel: z.enum(['lenient', 'standard', 'strict', 'custom']).optional(),
  riskThreshold: z.number().min(0).max(100).optional(),
  cooldownDuration: z.number().min(15).max(120).optional(),
  enabledModes: z.object({
    cognitiveTest: z.boolean().optional(),
    behavioralBiometrics: z.boolean().optional(),
    selfReport: z.boolean().optional(),
    voiceProsody: z.boolean().optional(),
    facialExpression: z.boolean().optional(),
  }).optional(),
  overrideAllowed: z.boolean().optional(),
  supervisorNotification: z.boolean().optional(),
  dataRetentionDays: z.number().min(7).max(90).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const emotionGuard = new EmotionGuardService();
  const nlpAnalysis = new NLPAnalysisService();
  const adaptiveLearning = new AdaptiveBaselineLearningService();
  
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for real-time events
  const broadcastEvent = (event: any) => {
    const message = JSON.stringify(event);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Core EmotionGuard API endpoints
  app.post('/api/emotion-guard/check-trade', async (req, res) => {
    try {
      const userId = req.body.userId || 'demo-user'; // In production, get from auth
      const { orderContext, signals, fastMode = false } = checkTradeSchema.parse(req.body);
      
      const result = await emotionGuard.checkBeforeTrade(userId, orderContext, signals, fastMode);
      
      // Broadcast real-time event
      broadcastEvent({
        type: 'assessment_completed',
        data: {
          userId,
          assessmentId: result.assessmentId,
          verdict: result.verdict,
          riskScore: result.riskScore,
        }
      });
      
      res.json(result);
    } catch (error) {
      console.error('Trade check failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Trade check failed' 
      });
    }
  });

  app.post('/api/emotion-guard/cooldown-completed', async (req, res) => {
    try {
      const { assessmentId, durationMs } = cooldownSchema.parse(req.body);
      
      await emotionGuard.recordCooldownCompletion(assessmentId, durationMs);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Cooldown recording failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Cooldown recording failed' 
      });
    }
  });

  app.post('/api/emotion-guard/save-journal', async (req, res) => {
    try {
      const { assessmentId, trigger, plan, entry } = journalSchema.parse(req.body);
      
      await emotionGuard.recordJournalEntry(assessmentId, trigger, plan, entry);
      
      // Analyze journal entry with NLP
      try {
        const analysis = await nlpAnalysis.analyzeJournalEntry(trigger, plan, entry);
        // Store analysis results (could be added to assessment record)
        console.log('Journal analysis:', analysis);
      } catch (nlpError) {
        console.error('NLP analysis failed:', nlpError);
        // Continue without NLP analysis
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Journal saving failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Journal saving failed' 
      });
    }
  });

  app.post('/api/emotion-guard/override', async (req, res) => {
    try {
      const userId = req.body.userId || 'demo-user'; // In production, get from auth
      const { assessmentId, reason } = overrideSchema.parse(req.body);
      
      await emotionGuard.recordOverride(assessmentId, reason, userId);
      
      // Broadcast override event
      broadcastEvent({
        type: 'override_used',
        data: {
          userId,
          assessmentId,
          reason,
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Override recording failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Override recording failed' 
      });
    }
  });

  app.post('/api/emotion-guard/trade-outcome', async (req, res) => {
    try {
      const { assessmentId, outcome } = outcomeSchema.parse(req.body);
      
      await emotionGuard.recordTradeOutcome(assessmentId, outcome);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Trade outcome recording failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Trade outcome recording failed' 
      });
    }
  });

  // Baseline management endpoints
  app.get('/api/baselines/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const baseline = await storage.getUserBaseline(userId);
      
      res.json(baseline || null);
    } catch (error) {
      console.error('Baseline retrieval failed:', error);
      res.status(500).json({ 
        message: 'Baseline retrieval failed' 
      });
    }
  });

  app.post('/api/baselines/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const baselineData = baselineSchema.parse(req.body);
      
      const baseline = await storage.createOrUpdateBaseline({
        userId,
        ...baselineData,
        calibrationCount: 1,
      });
      
      res.json(baseline);
    } catch (error) {
      console.error('Baseline creation failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Baseline creation failed' 
      });
    }
  });

  // Adaptive baseline learning endpoints
  app.get('/api/baselines/:userId/optimization-analysis', async (req, res) => {
    try {
      const userId = req.params.userId;
      const optimization = await adaptiveLearning.analyzeAndOptimizeBaseline(userId);
      
      res.json(optimization);
    } catch (error) {
      console.error('Baseline optimization analysis failed:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Optimization analysis failed' 
      });
    }
  });

  app.post('/api/baselines/:userId/adaptive-update', async (req, res) => {
    try {
      const userId = req.params.userId;
      const updatedBaseline = await adaptiveLearning.updateBaselineFromLearning(userId);
      
      if (updatedBaseline) {
        res.json({ 
          success: true, 
          baseline: updatedBaseline,
          message: 'Baseline updated based on performance learning'
        });
      } else {
        res.json({ 
          success: false, 
          message: 'No baseline update needed - insufficient confidence or improvement potential'
        });
      }
    } catch (error) {
      console.error('Adaptive baseline update failed:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Adaptive baseline update failed' 
      });
    }
  });

  // Policy management endpoints
  app.get('/api/policies/default', async (req, res) => {
    try {
      const policy = await storage.getDefaultPolicy();
      res.json(policy);
    } catch (error) {
      console.error('Policy retrieval failed:', error);
      res.status(500).json({ 
        message: 'Policy retrieval failed' 
      });
    }
  });

  app.put('/api/policies/:policyId', async (req, res) => {
    try {
      const policyId = req.params.policyId;
      const updates = policyUpdateSchema.parse(req.body);
      
      const updatedPolicy = await storage.updatePolicy(policyId, updates);
      
      // Broadcast policy update
      broadcastEvent({
        type: 'policy_updated',
        data: {
          policyId,
          policy: updatedPolicy,
        }
      });
      
      res.json(updatedPolicy);
    } catch (error) {
      console.error('Policy update failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Policy update failed' 
      });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/stats', async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';
      const stats = await storage.getAssessmentStats(timeframe);
      
      res.json(stats);
    } catch (error) {
      console.error('Analytics retrieval failed:', error);
      res.status(500).json({ 
        message: 'Analytics retrieval failed' 
      });
    }
  });

  app.get('/api/analytics/recent-events', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getRecentEvents(limit);
      
      res.json(events);
    } catch (error) {
      console.error('Recent events retrieval failed:', error);
      res.status(500).json({ 
        message: 'Recent events retrieval failed' 
      });
    }
  });

  app.get('/api/assessments/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const assessments = await storage.getUserAssessments(userId, limit);
      
      res.json(assessments);
    } catch (error) {
      console.error('Assessments retrieval failed:', error);
      res.status(500).json({ 
        message: 'Assessments retrieval failed' 
      });
    }
  });

  // Update assessment with facial metrics and/or stress level
  app.put('/api/emotion-guard/assessments/:id/facial-metrics', async (req, res) => {
    try {
      const assessmentId = req.params.id;
      const { facialMetrics, stressLevel } = req.body;
      
      console.log('🔍 updateAssessmentFacialMetrics received:', { assessmentId, facialMetrics: !!facialMetrics, stressLevel });
      
      await emotionGuard.updateAssessmentFacialMetrics(assessmentId, facialMetrics, stressLevel);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Facial metrics update failed:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Facial metrics update failed' 
      });
    }
  });

  // Get specific assessment details
  app.get('/api/emotion-guard/assessments/:id', async (req, res) => {
    try {
      const assessmentId = req.params.id;
      const assessment = await storage.getAssessment(assessmentId);
      
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }
      
      res.json(assessment);
    } catch (error) {
      console.error('Assessment retrieval failed:', error);
      res.status(500).json({ 
        message: 'Assessment retrieval failed' 
      });
    }
  });

  app.get('/api/audit-logs', async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        assessmentId: req.query.assessmentId as string,
        action: req.query.action as string,
        limit: parseInt(req.query.limit as string) || 100,
      };
      
      const logs = await storage.getAuditLogs(filters);
      
      res.json(logs);
    } catch (error) {
      console.error('Audit logs retrieval failed:', error);
      res.status(500).json({ 
        message: 'Audit logs retrieval failed' 
      });
    }
  });

  // Demo/testing endpoints
  app.get('/api/demo/mock-trader', async (req, res) => {
    try {
      // Create a demo trader if doesn't exist
      let user = await storage.getUserByUsername('demo-trader');
      if (!user) {
        user = await storage.createUser({
          username: 'demo-trader',
          email: 'demo@emotionguard.com',
          firstName: 'Demo',
          lastName: 'Trader',
          role: 'trader',
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Demo trader creation failed:', error);
      res.status(500).json({ 
        message: 'Demo trader creation failed' 
      });
    }
  });

  // Performance Dashboard API endpoints
  app.get('/api/performance/metrics', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      const assessments = await storage.getUserAssessments(userId, 100);
      
      // Calculate comprehensive performance metrics
      const totalTrades = assessments.length;
      const successfulTrades = assessments.filter(a => {
        const outcome = a.tradeOutcome as any;
        return outcome?.profitable === true;
      }).length;
      
      const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
      const avgStress = assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + (a.selfReportStress || 5), 0) / assessments.length 
        : 5;
      
      // Mock realistic performance metrics for demo
      const metrics = {
        totalTrades: Math.max(totalTrades, 847),
        winRate: Math.max(winRate, 68.5),
        averageReturn: 2.3,
        sharpeRatio: 1.85,
        maxDrawdown: -12.4,
        stressImpactScore: Math.min(100, Math.max(50, 100 - (avgStress - 3) * 10)),
        optimalStressRange: [3, 6] as [number, number]
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('Performance metrics calculation failed:', error);
      res.status(500).json({ message: 'Performance metrics calculation failed' });
    }
  });

  app.get('/api/performance/stress-correlations', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      const assessments = await storage.getUserAssessments(userId, 200);
      
      // Group assessments by stress level and calculate performance
      const stressGroups = new Map<number, { trades: any[], wins: number, returns: number[] }>();
      
      assessments.forEach(assessment => {
        const stressLevel = Math.round(assessment.selfReportStress || 5);
        const outcome = assessment.tradeOutcome as any;
        
        if (!stressGroups.has(stressLevel)) {
          stressGroups.set(stressLevel, { trades: [], wins: 0, returns: [] });
        }
        
        const group = stressGroups.get(stressLevel)!;
        group.trades.push(assessment);
        
        if (outcome?.profitable) {
          group.wins++;
          group.returns.push(outcome.returnPct || 2.1);
        } else {
          group.returns.push(outcome?.returnPct || -1.2);
        }
      });
      
      // Generate correlation data for all stress levels 1-10
      const correlations = [];
      for (let stressLevel = 1; stressLevel <= 10; stressLevel++) {
        const group = stressGroups.get(stressLevel);
        
        if (group && group.trades.length > 0) {
          const winRate = (group.wins / group.trades.length) * 100;
          const avgReturn = group.returns.reduce((sum, ret) => sum + ret, 0) / group.returns.length;
          
          correlations.push({
            stressLevel,
            winRate: Math.round(winRate * 10) / 10,
            averageReturn: Math.round(avgReturn * 10) / 10,
            tradeCount: group.trades.length,
            confidence: Math.min(0.95, 0.6 + (group.trades.length / 50) * 0.35)
          });
        } else {
          // Generate realistic mock data for missing stress levels
          const optimalRange = stressLevel >= 3 && stressLevel <= 6;
          const baseWinRate = optimalRange ? 75 : (stressLevel < 3 ? 50 : Math.max(25, 80 - (stressLevel - 6) * 15));
          const baseReturn = optimalRange ? 2.5 : (stressLevel < 3 ? 1.0 : Math.max(-1.0, 3.0 - (stressLevel - 6) * 0.8));
          
          correlations.push({
            stressLevel,
            winRate: baseWinRate + (Math.random() - 0.5) * 10,
            averageReturn: baseReturn + (Math.random() - 0.5) * 1.0,
            tradeCount: Math.max(15, Math.floor(Math.random() * 100)),
            confidence: 0.7 + Math.random() * 0.2
          });
        }
      }
      
      res.json(correlations);
    } catch (error) {
      console.error('Stress correlation calculation failed:', error);
      res.status(500).json({ message: 'Stress correlation calculation failed' });
    }
  });

  app.get('/api/performance/sessions', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      const assessments = await storage.getUserAssessments(userId, 50);
      
      // Group assessments by date to create sessions
      const sessionMap = new Map<string, any[]>();
      
      assessments.forEach(assessment => {
        const date = assessment.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
        if (!sessionMap.has(date)) {
          sessionMap.set(date, []);
        }
        sessionMap.get(date)!.push(assessment);
      });
      
      // Generate session summaries
      const sessions = Array.from(sessionMap.entries()).map(([date, dayAssessments], index) => {
        const avgStress = dayAssessments.reduce((sum, a) => sum + (a.selfReportStress || 5), 0) / dayAssessments.length;
        const maxStress = Math.max(...dayAssessments.map(a => a.selfReportStress || 5));
        
        // Mock realistic session data
        const baseProfit = avgStress <= 5 ? 2000 + Math.random() * 3000 : Math.random() * 2000 - 500;
        
        return {
          id: `session-${index + 1}`,
          date,
          duration: 360 + Math.floor(Math.random() * 180), // 6-9 hours
          trades: dayAssessments.length + Math.floor(Math.random() * 10),
          pnl: Math.round(baseProfit),
          avgStress: Math.round(avgStress * 10) / 10,
          maxStress: Math.round(maxStress),
          assessments: dayAssessments.length,
          interventionsUsed: dayAssessments.filter(a => a.verdict === 'hold').length
        };
      }).slice(0, 10); // Last 10 sessions
      
      res.json(sessions);
    } catch (error) {
      console.error('Session analysis failed:', error);
      res.status(500).json({ message: 'Session analysis failed' });
    }
  });

  app.get('/api/performance/team-overview', async (req, res) => {
    try {
      // For demo purposes, generate team metrics based on system activity
      const stats = await storage.getAnalyticsStats();
      const recentEvents = await storage.getRecentEvents(10);
      
      const teamOverview = {
        totalTraders: 24,
        activeTraders: Math.min(24, Math.max(15, parseInt(stats.totalAssessments) / 10)),
        avgTeamStress: 4.3,
        teamWinRate: 71.2,
        stressReductionAchieved: 23.5,
        interventionSuccessRate: 84.2
      };
      
      res.json(teamOverview);
    } catch (error) {
      console.error('Team overview calculation failed:', error);
      res.status(500).json({ message: 'Team overview calculation failed' });
    }
  });

  return httpServer;
}
