import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StroopTest } from './StroopTest';
import { BreathingExercise } from './BreathingExercise';
import { RiskDisplay } from './RiskDisplay';
import { MicroJournal } from './MicroJournal';
import { BiometricTracker } from './BiometricTracker';
import { useEmotionGuard } from '@/hooks/useEmotionGuard';
import type { OrderContext, StroopTrial } from '@/types/emotionGuard';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

interface PreTradeGateProps {
  onClose: () => void;
  orderAction: 'buy' | 'sell';
  orderContext: Partial<OrderContext>;
}

type AssessmentPhase = 
  | 'quickCheck' 
  | 'stroopTest' 
  | 'selfReport' 
  | 'riskResults' 
  | 'breathingExercise' 
  | 'microJournal' 
  | 'overrideJustification';

export function PreTradeGate({ onClose, orderAction, orderContext }: PreTradeGateProps) {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('quickCheck');
  const [quickCheckProgress, setQuickCheckProgress] = useState(0);
  const [stroopResults, setStroopResults] = useState<StroopTrial[]>([]);
  const [stressLevel, setStressLevel] = useState([5]);
  const [overrideReason, setOverrideReason] = useState('');
  
  const {
    currentAssessment,
    updateAssessment,
    completeCooldown,
    saveJournal,
    submitOverride,
    recordTradeOutcome,
    resetAssessment,
    isAssessing,
  } = useEmotionGuard();

  // Quick check simulation
  useEffect(() => {
    if (currentPhase === 'quickCheck') {
      const interval = setInterval(() => {
        setQuickCheckProgress(prev => {
          const newProgress = prev + 20;
          if (newProgress >= 100) {
            clearInterval(interval);
            // Decide next phase based on quick check results
            setTimeout(() => {
              const needsDeepCheck = Math.random() > 0.6; // 40% chance for demo
              if (needsDeepCheck) {
                setCurrentPhase('stroopTest');
              } else {
                setCurrentPhase('selfReport');
              }
            }, 500);
          }
          return newProgress;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [currentPhase]);

  const handleStroopComplete = (results: StroopTrial[]) => {
    setStroopResults(results);
    setCurrentPhase('selfReport');
  };

  const handleSelfReportComplete = async () => {
    try {
      // Update assessment with Stroop results and stress level
      await updateAssessment(stroopResults, stressLevel[0]);
      setCurrentPhase('riskResults');
    } catch (error) {
      console.error('Assessment update failed:', error);
    }
  };

  const handleProceedWithTrade = async () => {
    if (currentAssessment) {
      await recordTradeOutcome({
        executed: true,
        pnl: Math.random() > 0.5 ? 150 : -75, // Random demo outcome
      });
    }
    onClose();
  };

  const handleStartCooldown = () => {
    setCurrentPhase('breathingExercise');
  };

  const handleCooldownComplete = async (duration: number) => {
    if (currentAssessment) {
      await completeCooldown(duration);
      // Re-assess after cooldown
      setCurrentPhase('riskResults');
    }
  };

  const handleShowJournal = () => {
    setCurrentPhase('microJournal');
  };

  const handleJournalComplete = async (trigger: string, plan: string, entry?: string) => {
    if (currentAssessment) {
      await saveJournal(trigger, plan, entry);
    }
    onClose();
  };

  const handleShowOverride = () => {
    setCurrentPhase('overrideJustification');
  };

  const handleOverrideSubmit = async () => {
    if (currentAssessment && overrideReason.trim()) {
      await submitOverride(overrideReason);
      await handleProceedWithTrade();
    }
  };

  const renderPhase = () => {
    switch (currentPhase) {
      case 'quickCheck':
        return (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold">Pre-Trade Check</h3>
              <p className="text-sm text-muted-foreground">Quick assessment in progress...</p>
            </div>
            
            <Progress value={quickCheckProgress} className="mb-4" data-testid="progress-quickcheck" />
            
            <BiometricTracker />
            
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="text-sm text-muted-foreground hover:text-foreground"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        );

      case 'stroopTest':
        return (
          <StroopTest 
            onComplete={handleStroopComplete}
            data-testid="component-strooptest"
          />
        );

      case 'selfReport':
        return (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">How are you feeling?</h3>
              <p className="text-sm text-muted-foreground">Rate your current stress level</p>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Calm</span>
                <span>Stressed</span>
              </div>
              <Slider
                value={stressLevel}
                onValueChange={setStressLevel}
                max={10}
                step={1}
                className="mb-4"
                data-testid="slider-stress"
              />
              <div className="text-center">
                <span className="text-2xl font-bold" data-testid="text-stresslevel">{stressLevel[0]}</span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
            </div>
            
            <Button 
              onClick={handleSelfReportComplete}
              className="w-full"
              disabled={isAssessing}
              data-testid="button-continue"
            >
              {isAssessing ? 'Processing...' : 'Continue'}
            </Button>
          </div>
        );

      case 'riskResults':
        return currentAssessment ? (
          <RiskDisplay
            assessment={currentAssessment}
            onProceed={handleProceedWithTrade}
            onCooldown={handleStartCooldown}
            onBlock={handleShowJournal}
            onOverride={handleShowOverride}
          />
        ) : (
          <div className="text-center">
            <p>Processing assessment...</p>
          </div>
        );

      case 'breathingExercise':
        return (
          <BreathingExercise
            duration={30}
            onComplete={handleCooldownComplete}
            onSkip={handleShowOverride}
          />
        );

      case 'microJournal':
        return (
          <MicroJournal
            onComplete={handleJournalComplete}
            onCancel={onClose}
          />
        );

      case 'overrideJustification':
        return (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-accent">Override Required</h3>
              <p className="text-sm text-muted-foreground">
                Explain why you need to proceed despite the warning
              </p>
            </div>
            
            <div className="space-y-4">
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Justification required for supervisor review..."
                className="resize-none"
                rows={4}
                data-testid="textarea-override"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  onClick={onClose}
                  data-testid="button-cancel-override"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleOverrideSubmit}
                  disabled={overrideReason.trim().length < 10}
                  data-testid="button-submit-override"
                >
                  Override & Proceed
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md" data-testid="dialog-pretrademain">
        <div className="p-6">
          {renderPhase()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
