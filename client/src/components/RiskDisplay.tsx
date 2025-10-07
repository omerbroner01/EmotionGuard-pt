import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Target, AlertCircle } from 'lucide-react';
import type { AssessmentResult } from '@/types/emotionGuard';

interface RiskDisplayProps {
  assessment: AssessmentResult & {
    cognitiveAnalytics?: {
      overallScore: number;
      reactionTimeMs: number;
      accuracy: number;
      consistency: number;
      attentionMetrics: {
        focusLapses: number;
        vigilanceDecline: number;
      };
      stressIndicators: {
        performanceDecline: number;
        errorRate: number;
        responseVariability: number;
      };
    };
  };
  onProceed: () => void;
  onCooldown: () => void;
  onBlock: () => void;
  onOverride: () => void;
}

export function RiskDisplay({ assessment, onProceed, onCooldown, onBlock, onOverride }: RiskDisplayProps) {
  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score >= 80) return 'high';
    if (score >= 65) return 'medium';
    return 'low';
  };

  const numericScore = typeof assessment.riskScore === 'number' ? assessment.riskScore : undefined;
  const riskLevel = typeof numericScore === 'number' ? getRiskLevel(numericScore) : 'low';

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'high':
        return { icon: '🚫', bg: 'bg-destructive', title: 'High Stress Detected' };
      case 'medium':
        return { icon: '⚠️', bg: 'bg-accent', title: 'Elevated Stress Levels' };
      case 'low':
        return { icon: '✅', bg: 'bg-chart-1', title: 'Normal Stress Levels' };
    }
  };

  const riskInfo = getRiskIcon();

  const getDescription = () => {
    switch (riskLevel) {
      case 'high':
        return 'We recommend taking a moment to collect yourself';
      case 'medium':
        return 'Consider taking a short break before trading';
      case 'low':
        return 'You appear ready to trade safely';
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <div className={`w-16 h-16 ${riskInfo.bg} rounded-full flex items-center justify-center mx-auto mb-3`}>
          <span className="text-2xl">{riskInfo.icon}</span>
        </div>
        <h3 className="text-lg font-semibold" data-testid="text-risktitle">{riskInfo.title}</h3>
        <p className="text-sm text-muted-foreground" data-testid="text-riskdescription">
          {getDescription()}
        </p>
      </div>
      
      {/* Risk Score Display */}
      <div className="mb-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Risk Score</span>
            <span className="text-2xl font-bold text-accent" data-testid="text-riskscore">
              {typeof numericScore === 'number' ? numericScore : 'Pending'}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div 
              className="gradient-progress h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${typeof numericScore === 'number' ? numericScore : 0}%` }}
              data-testid="progress-risk"
            ></div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Factors: {assessment.reasonTags.join(', ')}
          </div>
        </div>
      </div>

      {/* Advanced Cognitive Analytics */}
      {assessment.cognitiveAnalytics && (
        <div className="mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Cognitive Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Performance Score */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Overall Performance</span>
                <span className="text-lg font-semibold">
                  {(assessment.cognitiveAnalytics.overallScore * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={assessment.cognitiveAnalytics.overallScore * 100} className="h-2" />

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span className="text-muted-foreground">Reaction Time</span>
                  </div>
                  <span className="font-mono text-lg">
                    {assessment.cognitiveAnalytics.reactionTimeMs}ms
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {assessment.cognitiveAnalytics.reactionTimeMs < 500 ? 'Fast' : 
                     assessment.cognitiveAnalytics.reactionTimeMs < 800 ? 'Normal' : 'Slow'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="text-muted-foreground">Accuracy</span>
                  </div>
                  <span className="font-mono text-lg">
                    {(assessment.cognitiveAnalytics.accuracy * 100).toFixed(0)}%
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {assessment.cognitiveAnalytics.accuracy > 0.9 ? 'Excellent' : 
                     assessment.cognitiveAnalytics.accuracy > 0.7 ? 'Good' : 'Needs Focus'}
                  </div>
                </div>
              </div>

              {/* Attention & Stress Indicators */}
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Stress Indicators
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Focus Lapses</span>
                    <span className={`font-medium ${
                      assessment.cognitiveAnalytics.attentionMetrics.focusLapses > 3 ? 'text-destructive' : 
                      assessment.cognitiveAnalytics.attentionMetrics.focusLapses > 1 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {assessment.cognitiveAnalytics.attentionMetrics.focusLapses}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Vigilance Decline</span>
                    <span className={`font-medium ${
                      assessment.cognitiveAnalytics.attentionMetrics.vigilanceDecline > 0.2 ? 'text-destructive' : 
                      assessment.cognitiveAnalytics.attentionMetrics.vigilanceDecline > 0.1 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {(assessment.cognitiveAnalytics.attentionMetrics.vigilanceDecline * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Response Variability</span>
                    <span className={`font-medium ${
                      assessment.cognitiveAnalytics.stressIndicators.responseVariability > 0.3 ? 'text-destructive' : 
                      assessment.cognitiveAnalytics.stressIndicators.responseVariability > 0.2 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {(assessment.cognitiveAnalytics.stressIndicators.responseVariability * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground">
                  {assessment.cognitiveAnalytics.stressIndicators.performanceDecline > 0.15 ? (
                    <span className="text-destructive">⚠️ Performance declined during assessment - consider taking a break</span>
                  ) : assessment.cognitiveAnalytics.stressIndicators.errorRate > 0.2 ? (
                    <span className="text-yellow-600">⚡ Elevated error rate detected - attention may be compromised</span>
                  ) : (
                    <span className="text-green-600">✅ Cognitive performance within normal ranges</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="space-y-2" data-testid="container-actions">
        {riskLevel === 'low' && (
          <Button 
            onClick={onProceed}
            className="w-full bg-chart-1 text-background hover:bg-chart-1/90"
            data-testid="button-proceed"
          >
            Proceed with Trade
          </Button>
        )}
        
        {(riskLevel === 'medium' || riskLevel === 'high') && (
          <Button 
            onClick={onCooldown}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="button-cooldown"
          >
            Take Breathing Break ({assessment.cooldownDuration || 30}s)
          </Button>
        )}
        
        {riskLevel === 'medium' && (
          <Button 
            onClick={onProceed}
            variant="outline"
            className="w-full"
            data-testid="button-proceed-anyway"
          >
            Proceed Anyway
          </Button>
        )}
        
        {riskLevel === 'high' && (
          <Button 
            onClick={onBlock}
            className="w-full bg-chart-3 text-background hover:bg-chart-3/90"
            data-testid="button-journal"
          >
            Trade Blocked - Add Note
          </Button>
        )}
      </div>
      
      {/* Override Option */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          onClick={onOverride}
          variant="ghost"
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          data-testid="button-override"
        >
          Override with Justification
        </Button>
      </div>
    </div>
  );
}
