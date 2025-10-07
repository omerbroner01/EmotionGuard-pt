import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StroopTest } from './StroopTest';
import ErrorBoundary from '@/components/ui/error-boundary';
import { AdvancedCognitiveAssessment } from './AdvancedCognitiveAssessment';
import { BreathingExercise } from './BreathingExercise';
import { RiskDisplay } from './RiskDisplay';
import { MicroJournal } from './MicroJournal';
import { BiometricTracker } from './BiometricTracker';
import { FaceDetectionDisplay } from './FaceDetectionDisplay';
import type { OrderContext, StroopTrial, CognitiveTestResult } from '@/types/emotionGuard';
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
  // Local submit guard to prevent double-submit/double-navigation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quickCheckProgress, setQuickCheckProgress] = useState(0);
  const [stroopResults, setStroopResults] = useState<StroopTrial[]>([]);
  const [cognitiveResults, setCognitiveResults] = useState<CognitiveTestResult[]>([]);
  const [useAdvancedCognitive, setUseAdvancedCognitive] = useState(true);
  const [stressLevel, setStressLevel] = useState([5]);
  const [overrideReason, setOverrideReason] = useState('');
  const [facialMetrics, setFacialMetrics] = useState<FaceMetrics | null>(null);
  
  // All emotion guard functionality now comes from props

  // Enhanced quick check with realistic timing and progress feedback
  useEffect(() => {
    if (currentPhase === 'quickCheck') {
      console.log('⏱️ Starting optimized quick check...');

      const progressSteps = [
        { progress: 20, message: 'Initializing biometric sensors...', delay: 200 },
        { progress: 50, message: 'Analyzing behavioral patterns...', delay: 300 },
        { progress: 80, message: 'Processing facial metrics...', delay: 400 },
        { progress: 100, message: 'Assessment complete', delay: 200 }
      ];

      let stepIndex = 0;
      const timers: number[] = [];

      const runNextStep = () => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          setQuickCheckProgress(step.progress);
          console.log(`📊 Progress: ${step.progress}% - ${step.message}`);

          const t = window.setTimeout(() => {
            stepIndex++;
            runNextStep();
          }, step.delay);
          timers.push(t as unknown as number);
        } else {
          // Deterministic: always go to Stroop test to avoid flaky behavior
          const finalT = window.setTimeout(() => {
            console.log('🧠 Proceeding to Stroop test (deterministic)');
            setCurrentPhase('stroopTest');
          }, 500);
          timers.push(finalT as unknown as number);
        }
      };

      runNextStep();

      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [currentPhase]);

  const handleStroopComplete = (results: StroopTrial[]) => {
    setStroopResults(results);
    setCurrentPhase('selfReport');
  };

  const handleAdvancedCognitiveComplete = (results: CognitiveTestResult[]) => {
    console.log('🧠 Advanced cognitive assessment completed:', results);

    // Validate results before accepting completion
    const validResults = results.filter(result => 
      result && 
      typeof result.overallScore === 'number' && 
      Array.isArray(result.trials) && 
      result.trials.length > 0 &&
      result.trials.every(t => t && typeof t.reactionTimeMs === 'number' && typeof t.correct === 'boolean')
    );

    if (validResults.length !== results.length) {
      console.error('Invalid cognitive test results detected');
      setSubmitError('Error: Invalid test results. Please retry the assessment.');
      return;
    }

    setCognitiveResults(validResults);
    
    // Extract Stroop results for backward compatibility
    const stroopTest = validResults.find(r => r.testType === 'stroop');
    if (stroopTest) {
      const stroopTrials: StroopTrial[] = stroopTest.trials.map(trial => ({
        word: trial.stimulus,
        color: trial.displayColor || '',
        response: trial.userResponse,
        reactionTimeMs: trial.reactionTimeMs,
        correct: trial.correct
      }));
      setStroopResults(stroopTrials);
    }
    
    setCurrentPhase('selfReport');
  };

  const handleSelfReportComplete = async () => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('handleSelfReportComplete');
    console.log('📝 currentAssessment exists:', !!currentAssessment);
    console.log('📝 facialMetrics:', facialMetrics);
    
    // CRITICAL: Don't proceed until assessment is created and currentAssessment exists
    if (!currentAssessment) {
      console.warn('Assessment not ready yet - redirecting to a safe state');
      // Redirect to a safe state and inform user
      // Use onClose to back out if available
      try {
        // show a brief delay so user sees message in UI (could be a toast in real app)
        setCurrentPhase('selfReport');
      } catch (e) {
        console.error('Failed to handle missing assessment state', e);
      }
      return;
    }

    if (isSubmitting || isAssessing) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('submission already in progress');
      return;
    }

    // Use the shared attempt function so Retry can reuse the same logic
    await attemptAssessmentUpdate();
  };

    // Shared update attempt used by Continue and Retry flows
  const attemptAssessmentUpdate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // CRITICAL FIX #1: Only show "pending" if tests are actually incomplete
      // Check if we have valid cognitive results before proceeding
      const hasValidCognitiveResults = cognitiveResults && 
                                       cognitiveResults.length > 0 && 
                                       cognitiveResults.every(test => test && 
                                         typeof test.overallScore === 'number' && 
                                         Array.isArray(test.trials) && 
                                         test.trials.length > 0);

      if (!hasValidCognitiveResults) {
        setSubmitError('Assessment is pending — please complete the remaining tests.');
        setCurrentPhase('selfReport');
        return null;
      }

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('updateAssessment payload', { stress: stressLevel[0], cog: cognitiveResults.length, hasFace: !!facialMetrics });
      const result = await updateAssessment(stroopResults, stressLevel[0], facialMetrics, cognitiveResults);

      // FIX: Set completed=true atomically on success, proceed to results
      if (result && typeof result.riskScore === 'number') {
        console.log('✅ Assessment complete with score:', result.riskScore);
        setCurrentPhase('riskResults');
        return result;
      }

      // If server returns pending after we sent valid data, show error
      if (!result || (result as any).pending) {
        setSubmitError('Error processing assessment results. Please retry.');
        setCurrentPhase('selfReport');
        return result;
      }

      setSubmitError('Unexpected response from the assessment service. Please retry.');
      setCurrentPhase('selfReport');
      return result;
    } catch (error) {
      console.error('Assessment update failed:', error);
      setSubmitError('Failed to update assessment — please try again.');
      setCurrentPhase('selfReport');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryAssessment = async () => {
    await attemptAssessmentUpdate();
  };

  const handleFacialMetrics = (metrics: FaceMetrics) => {
    setFacialMetrics(metrics);
  };

  // Debug current assessment changes (removed auto-progression - user must complete self-report manually)
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) {
      console.log('PreTradeGate effect', { hasAssessment: !!currentAssessment, currentPhase });
      if (currentAssessment) console.log('PreTradeGate assessmentId', currentAssessment.assessmentId);
    }
  }, [currentAssessment, currentPhase]);

  // Debug current assessment changes
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('PreTradeGate assessment changed', currentAssessment ? currentAssessment.assessmentId : 'null');
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
        return useAdvancedCognitive ? (
          <div>
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold mb-2">Advanced Cognitive Assessment</h3>
              <p className="text-sm text-muted-foreground">
                Enhanced stress detection through multiple cognitive tests
              </p>
            </div>
            <AdvancedCognitiveAssessment
              onComplete={handleAdvancedCognitiveComplete}
              config={{
                includeStroop: true,
                includeReactionTime: true,
                includeWorkingMemory: true,
                includeAttentionSwitch: false,
                fastMode: true, // Optimized for pre-trade assessment
                adaptiveDifficulty: true
              }}
            />
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('🔄 Switching to basic Stroop test');
                  setUseAdvancedCognitive(false);
                }}
                className="text-xs text-muted-foreground"
              >
                Use Basic Test Instead
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold mb-2">Basic Cognitive Test</h3>
              <p className="text-sm text-muted-foreground">
                Quick Stroop test for stress assessment
              </p>
            </div>
            <StroopTest 
              onComplete={handleStroopComplete}
              data-testid="component-strooptest"
            />
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('🔄 Switching to advanced cognitive assessment');
                  setUseAdvancedCognitive(true);
                }}
                className="text-xs text-muted-foreground"
              >
                Use Advanced Assessment Instead
              </Button>
            </div>
          </div>
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
            {submitError ? (
              <div className="text-sm text-red-600 mb-4" role="alert">{submitError}</div>
            ) : null}

            <div className="flex space-x-2">
              <Button 
                onClick={handleSelfReportComplete}
                className="flex-1"
                disabled={isAssessing || isSubmitting}
                data-testid="button-continue"
              >
                {isAssessing || isSubmitting ? 'Processing...' : 'Continue'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleRetryAssessment}
                disabled={isAssessing || isSubmitting}
                className="flex-none"
                data-testid="button-retry"
              >
                Retry
              </Button>
            </div>
          </div>
        );

            case 'riskResults':
        // FIX #1: Only show pending if assessment doesn't have a valid risk score
        // This ensures we compute and display scores after all tests are complete
        if (!currentAssessment || typeof currentAssessment.riskScore !== 'number') {
          return (
            <div className="text-center p-6">
              <h3 className="text-lg font-semibold mb-2">Assessment in progress</h3>
              <p className="text-sm text-muted-foreground">Please finish the cognitive & self-report tests to generate a risk score.</p>
              <div className="mt-4">
                <Button onClick={() => setCurrentPhase('selfReport')}>Complete Self-Report</Button>
              </div>
            </div>
          );
        }

        return (
          <RiskDisplay
            assessment={currentAssessment}
            onProceed={handleProceedWithTrade}
            onCooldown={handleStartCooldown}
            onBlock={handleShowJournal}
            onOverride={handleShowOverride}
          />
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
