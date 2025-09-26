import { Button } from '@/components/ui/button';
import type { AssessmentResult } from '@/types/emotionGuard';

interface RiskDisplayProps {
  assessment: AssessmentResult;
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

  const riskLevel = getRiskLevel(assessment.riskScore);

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
              {assessment.riskScore}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div 
              className="gradient-progress h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${assessment.riskScore}%` }}
              data-testid="progress-risk"
            ></div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Factors: {assessment.reasonTags.join(', ')}
          </div>
        </div>
      </div>
      
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
