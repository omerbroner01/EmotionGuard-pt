import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StroopTest } from './StroopTest';
import { BreathingExercise } from './BreathingExercise';
import { RiskDisplay } from './RiskDisplay';
import { MicroJournal } from './MicroJournal';
import { BiometricTracker } from './BiometricTracker';
import { FaceDetectionDisplay } from './FaceDetectionDisplay';
import type { OrderContext, StroopTrial } from '@/types/emotionGuard';
import type { FaceMetrics } from '@/lib/faceDetection';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Camera } from 'lucide-react';

interface PreTradeGateProps {
  onClose: () => void;
  orderAction: 'buy' | 'sell';
  orderContext: Partial<OrderContext>;
  currentAssessment: any;
  updateAssessment: any;
  completeCooldown: any;
  saveJournal: any;
  recordTradeOutcome: any;
  submitOverride: any;
  isAssessing: boolean;
  resetAssessment: any;
}

type AssessmentPhase = 
  | 'quickCheck' 
  | 'stroopTest' 
  | 'selfReport' 
  | 'riskResults' 
  | 'breathingExercise' 
  | 'microJournal' 
  | 'overrideJustification';

export function PreTradeGate({ 
  onClose, 
  orderAction, 
  orderContext,
  currentAssessment,
  updateAssessment,
  completeCooldown,
  saveJournal,
  recordTradeOutcome,
  submitOverride,
  isAssessing,
  resetAssessment
}: PreTradeGateProps) {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('quickCheck');
  const [quickCheckProgress, setQuickCheckProgress] = useState(0);
  const [stroopResults, setStroopResults] = useState<StroopTrial[]>([]);
  const [stressLevel, setStressLevel] = useState([5]);
  const [overrideReason, setOverrideReason] = useState('');
  const [facialMetrics, setFacialMetrics] = useState<FaceMetrics | null>(null);
  
  // All emotion guard functionality now comes from props

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
    console.log('📝 handleSelfReportComplete called');
    console.log('📝 currentAssessment exists:', !!currentAssessment);
    console.log('📝 facialMetrics:', facialMetrics);
    
    // CRITICAL: Don't proceed until assessment is created and currentAssessment exists
    if (!currentAssessment) {
      console.log('⏳ Assessment not ready yet - waiting for assessment creation to complete...');
      // Show a brief loading state and return early
      return;
    }
    
    try {
      // If we have facial metrics to add to the existing assessment, update them
      if (facialMetrics) {
        console.log('📝 Updating assessment with facial metrics');
        await updateAssessment(stroopResults, stressLevel[0], facialMetrics);
      } else {
        console.log('📝 No facial metrics to update - proceeding to results');
      }
      
      // Proceed to risk results only if we have a valid assessment
      console.log('📝 Proceeding to risk results with assessment:', currentAssessment.assessmentId);
      setCurrentPhase('riskResults');
    } catch (error) {
      console.error('Assessment update failed:', error);
      // Even if update fails, proceed to results if we have an assessment
      console.log('📝 Update failed but assessment exists - proceeding to results anyway');
      setCurrentPhase('riskResults');
    }
  };

  const handleFacialMetrics = (metrics: FaceMetrics) => {
    setFacialMetrics(metrics);
  };

  // Auto-progress to results when assessment becomes available
  useEffect(() => {
    console.log('🔍 useEffect triggered: currentAssessment=', !!currentAssessment, ', currentPhase=', currentPhase);
    if (currentAssessment && currentPhase === 'selfReport') {
      console.log('🎯 Assessment completed while in selfReport phase - auto-progressing to results');
      console.log('🎯 Assessment details:', currentAssessment.assessmentId, currentAssessment.verdict);
      // Give a brief moment for user to finish their current action, then progress
      setTimeout(() => {
        setCurrentPhase('riskResults');
      }, 500);
    }
  }, [currentAssessment, currentPhase]);

  // Debug current assessment changes
  useEffect(() => {
    console.log('🔧 PreTradeGate: currentAssessment changed to:', currentAssessment ? currentAssessment.assessmentId : 'null');
  }, [currentAssessment]);

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
            
            <div className="space-y-4">
              <BiometricTracker />
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Facial Stress Detection</h4>
                <div className="text-center py-4">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Facial detection running...</p>
                </div>
              </div>
            </div>
            
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
        {/* Hidden facial detection that runs throughout entire assessment */}
        <div style={{ display: 'none' }}>
          <FaceDetectionDisplay 
            onMetricsUpdate={handleFacialMetrics}
            autoStart={true}
          />
        </div>
        <div className="p-6">
          {renderPhase()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
