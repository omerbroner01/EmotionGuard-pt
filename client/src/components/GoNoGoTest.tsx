/**
 * Go/No-Go Test Component
 * 
 * A stress-sensitive cognitive test that measures response inhibition.
 * Participants must respond quickly to "Go" stimuli (common) but withhold 
 * responses to "No-Go" stimuli (rare, ~20% of trials).
 * 
 * Stress indicators:
 * - Increased false alarms (responding to No-Go)
 * - Slower reaction times on Go trials
 * - Increased response variability
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';

export interface GoNoGoTrial {
  trialNumber: number;
  stimulusType: 'go' | 'nogo';
  stimulus: string;
  userResponse: 'press' | 'withhold';
  correct: boolean;
  reactionTimeMs: number;
  timestamp: number;
  isi: number; // Inter-stimulus interval (jitter for unpredictability)
}

export interface GoNoGoResult {
  trials: GoNoGoTrial[];
  summary: {
    totalTrials: number;
    goTrials: number;
    nogoTrials: number;
    goAccuracy: number;
    nogoAccuracy: number;
    falseAlarms: number; // Responding to No-Go
    misses: number; // Not responding to Go
    meanReactionTime: number;
    reactionTimeStdDev: number;
    overallScore: number; // 0-1, higher is better
  };
}

interface GoNoGoTestProps {
  onComplete: (result: GoNoGoResult) => void;
  totalTrials?: number;
  nogoFrequency?: number; // Proportion of No-Go trials (default 0.2)
}

const GO_STIMULI = ['→', '↑', '▶', '▲', '●'];
const NOGO_STIMULI = ['X', '✕', '⊗', '⛔', '🛑'];

const RESPONSE_WINDOW = 1000; // ms to respond
const MIN_ISI = 800; // Minimum inter-stimulus interval
const MAX_ISI = 1500; // Maximum inter-stimulus interval

export function GoNoGoTest({ 
  onComplete, 
  totalTrials = 30,
  nogoFrequency = 0.2 
}: GoNoGoTestProps) {
  const [phase, setPhase] = useState<'instructions' | 'practice' | 'ready' | 'testing' | 'complete'>('instructions');
  const [currentTrial, setCurrentTrial] = useState(0);
  const [stimulus, setStimulus] = useState<string>('');
  const [stimulusType, setStimulusType] = useState<'go' | 'nogo'>('go');
  const [showStimulus, setShowStimulus] = useState(false);
  const [trials, setTrials] = useState<GoNoGoTrial[]>([]);
  const [responseDisabled, setResponseDisabled] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const stimulusStartTime = useRef<number>(0);
  const trialTimeout = useRef<NodeJS.Timeout | null>(null);
  const isiTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasResponded = useRef<boolean>(false);
  const currentISI = useRef<number>(MIN_ISI);

  // Generate trial sequence (fixed for consistency)
  const trialSequence = useRef<('go' | 'nogo')[]>([]);
  
  useEffect(() => {
    // Generate balanced trial sequence
    const nogoCount = Math.floor(totalTrials * nogoFrequency);
    const goCount = totalTrials - nogoCount;
    
    const sequence: ('go' | 'nogo')[] = [
      ...Array(goCount).fill('go'),
      ...Array(nogoCount).fill('nogo')
    ];
    
    // Shuffle using Fisher-Yates
    for (let i = sequence.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    
    trialSequence.current = sequence;
  }, [totalTrials, nogoFrequency]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (trialTimeout.current) clearTimeout(trialTimeout.current);
      if (isiTimeout.current) clearTimeout(isiTimeout.current);
    };
  }, []);

  const handleResponse = useCallback(() => {
    if (!showStimulus || responseDisabled || hasResponded.current) return;
    
    hasResponded.current = true;
    const reactionTime = performance.now() - stimulusStartTime.current;
    
    const correct = stimulusType === 'go';
    
    // Record trial
    const trial: GoNoGoTrial = {
      trialNumber: currentTrial + 1,
      stimulusType,
      stimulus,
      userResponse: 'press',
      correct,
      reactionTimeMs: Math.round(reactionTime),
      timestamp: Date.now(),
      isi: currentISI.current
    };
    
    setTrials(prev => [...prev, trial]);
    
    // Show brief feedback during practice
    if (phase === 'practice') {
      setFeedback(correct ? 'correct' : 'incorrect');
      setTimeout(() => setFeedback(null), 300);
    }
    
    // Hide stimulus and move to next trial
    setShowStimulus(false);
    setResponseDisabled(true);
    
    // Clear the timeout since user responded
    if (trialTimeout.current) {
      clearTimeout(trialTimeout.current);
      trialTimeout.current = null;
    }
    
    // Schedule next trial
    scheduleNextTrial();
  }, [showStimulus, responseDisabled, stimulusType, stimulus, currentTrial, phase]);

  // Keyboard response handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'testing' || phase === 'practice') {
        e.preventDefault();
        handleResponse();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleResponse, phase]);

  const scheduleNextTrial = () => {
    const nextTrial = currentTrial + 1;
    
    if (nextTrial >= totalTrials) {
      // Test complete
      setPhase('complete');
      calculateResults();
      return;
    }
    
    // Random ISI for unpredictability (increases stress/attention demands)
    const isi = MIN_ISI + Math.random() * (MAX_ISI - MIN_ISI);
    currentISI.current = isi;
    
    isiTimeout.current = setTimeout(() => {
      startTrial(nextTrial);
    }, isi);
  };

  const handleStimulusTimeout = () => {
    // Time ran out - record as withhold
    if (!hasResponded.current && showStimulus) {
      const correct = stimulusType === 'nogo';
      
      const trial: GoNoGoTrial = {
        trialNumber: currentTrial + 1,
        stimulusType,
        stimulus,
        userResponse: 'withhold',
        correct,
        reactionTimeMs: RESPONSE_WINDOW,
        timestamp: Date.now(),
        isi: currentISI.current
      };
      
      setTrials(prev => [...prev, trial]);
      
      // Show brief feedback during practice
      if (phase === 'practice') {
        setFeedback(correct ? 'correct' : 'incorrect');
        setTimeout(() => setFeedback(null), 300);
      }
      
      setShowStimulus(false);
      setResponseDisabled(true);
      scheduleNextTrial();
    }
  };

  const startTrial = (trialNum: number) => {
    setCurrentTrial(trialNum);
    hasResponded.current = false;
    setResponseDisabled(false);
    
    // Determine stimulus type from sequence
    const type = trialSequence.current[trialNum];
    setStimulusType(type);
    
    // Select random stimulus
    const stimArray = type === 'go' ? GO_STIMULI : NOGO_STIMULI;
    const stim = stimArray[Math.floor(Math.random() * stimArray.length)];
    setStimulus(stim);
    
    // Show stimulus
    setShowStimulus(true);
    stimulusStartTime.current = performance.now();
    
    // Set timeout for response window
    trialTimeout.current = setTimeout(handleStimulusTimeout, RESPONSE_WINDOW);
  };

  const startPractice = () => {
    setPhase('practice');
    setCurrentTrial(0);
    setTrials([]);
    
    // Override trial sequence for practice (3 go, 2 nogo)
    trialSequence.current = ['go', 'go', 'nogo', 'go', 'nogo'];
    
    setTimeout(() => startTrial(0), 1000);
  };

  const startTest = () => {
    setPhase('ready');
    setCurrentTrial(0);
    setTrials([]);
    
    // Regenerate main trial sequence
    const nogoCount = Math.floor(totalTrials * nogoFrequency);
    const goCount = totalTrials - nogoCount;
    
    const sequence: ('go' | 'nogo')[] = [
      ...Array(goCount).fill('go'),
      ...Array(nogoCount).fill('nogo')
    ];
    
    // Shuffle
    for (let i = sequence.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    
    trialSequence.current = sequence;
    
    setTimeout(() => {
      setPhase('testing');
      startTrial(0);
    }, 2000);
  };

  const calculateResults = () => {
    const goTrialsData = trials.filter(t => t.stimulusType === 'go');
    const nogoTrialsData = trials.filter(t => t.stimulusType === 'nogo');
    
    const goCorrect = goTrialsData.filter(t => t.correct).length;
    const nogoCorrect = nogoTrialsData.filter(t => t.correct).length;
    
    const falseAlarms = nogoTrialsData.filter(t => !t.correct).length;
    const misses = goTrialsData.filter(t => !t.correct).length;
    
    const goAccuracy = goTrialsData.length > 0 ? goCorrect / goTrialsData.length : 0;
    const nogoAccuracy = nogoTrialsData.length > 0 ? nogoCorrect / nogoTrialsData.length : 0;
    
    // Calculate RT stats for Go trials only
    const goRTs = goTrialsData.filter(t => t.correct).map(t => t.reactionTimeMs);
    const meanRT = goRTs.length > 0 ? goRTs.reduce((sum, rt) => sum + rt, 0) / goRTs.length : 0;
    
    const variance = goRTs.length > 0 
      ? goRTs.reduce((sum, rt) => sum + Math.pow(rt - meanRT, 2), 0) / goRTs.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    
    // Overall score: weighted combination of Go accuracy, No-Go accuracy, and RT
    // No-Go accuracy is weighted higher as it's the key stress measure
    const rtScore = Math.max(0, Math.min(1, 1 - (meanRT - 300) / 700)); // Normalize RT
    const overallScore = (goAccuracy * 0.3) + (nogoAccuracy * 0.5) + (rtScore * 0.2);
    
    const result: GoNoGoResult = {
      trials,
      summary: {
        totalTrials: trials.length,
        goTrials: goTrialsData.length,
        nogoTrials: nogoTrialsData.length,
        goAccuracy,
        nogoAccuracy,
        falseAlarms,
        misses,
        meanReactionTime: Math.round(meanRT),
        reactionTimeStdDev: Math.round(stdDev),
        overallScore
      }
    };
    
    console.log('🎯 Go/No-Go test complete:', result.summary);
    
    setTimeout(() => onComplete(result), 1000);
  };

  const progress = phase === 'testing' ? (currentTrial / totalTrials) * 100 : 
                   phase === 'practice' ? (currentTrial / 5) * 100 : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="gonogo-test">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="w-6 h-6" />
          Response Control Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        {phase === 'instructions' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">Instructions</h3>
            <div className="text-left space-y-3 bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Goal:</strong> Test your ability to respond quickly while maintaining control.
              </p>
              <div className="text-sm space-y-2">
                <p><strong>When you see these symbols (Go):</strong></p>
                <div className="flex gap-2 justify-center text-2xl my-2">
                  {GO_STIMULI.map((s, i) => <span key={i} className="text-green-600">{s}</span>)}
                </div>
                <p className="text-green-600">→ Press SPACEBAR as fast as you can!</p>
              </div>
              <div className="text-sm space-y-2 mt-4">
                <p><strong>When you see these symbols (No-Go):</strong></p>
                <div className="flex gap-2 justify-center text-2xl my-2">
                  {NOGO_STIMULI.map((s, i) => <span key={i} className="text-red-600">{s}</span>)}
                </div>
                <p className="text-red-600">→ DO NOT press anything!</p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                You have {RESPONSE_WINDOW}ms to respond. Most symbols will be Go (green), but No-Go (red) symbols appear occasionally. Stay focused!
              </p>
            </div>
            <Button onClick={startPractice} size="lg" className="mt-4">
              Start Practice (5 trials)
            </Button>
          </div>
        )}

        {(phase === 'practice' || phase === 'testing') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {phase === 'practice' ? 'Practice' : 'Test'}: Trial {currentTrial + 1} / {phase === 'practice' ? 5 : totalTrials}
              </span>
              <Progress value={progress} className="w-1/2" />
            </div>

            <div className="relative h-64 flex items-center justify-center border-2 border-dashed rounded-lg"
                 style={{ borderColor: showStimulus ? (stimulusType === 'go' ? '#22c55e' : '#ef4444') : '#d1d5db' }}>
              {showStimulus ? (
                <div className="text-center">
                  <div className={`text-8xl animate-pulse ${stimulusType === 'go' ? 'text-green-600' : 'text-red-600'}`}
                       data-testid="gonogo-stimulus">
                    {stimulus}
                  </div>
                  {feedback && (
                    <div className="mt-4">
                      {feedback === 'correct' ? (
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-4xl text-muted-foreground">+</div>
              )}
            </div>

            <Button 
              onClick={handleResponse}
              disabled={responseDisabled || !showStimulus}
              size="lg"
              className="w-full"
              data-testid="gonogo-response-button"
            >
              PRESS SPACEBAR
            </Button>

            {phase === 'practice' && currentTrial >= 4 && trials.length >= 5 && (
              <div className="text-center mt-4">
                <Button onClick={startTest} size="lg" variant="default">
                  Start Real Test
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === 'ready' && (
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Get Ready!</h3>
            <p className="text-muted-foreground">The test will begin shortly...</p>
            <div className="text-4xl font-bold">3...</div>
          </div>
        )}

        {phase === 'complete' && trials.length > 0 && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
            <h3 className="text-xl font-semibold">Test Complete!</h3>
            <p className="text-sm text-muted-foreground">Processing your results...</p>
            <Progress value={100} className="mt-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
