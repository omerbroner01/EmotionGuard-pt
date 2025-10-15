import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Zap, Brain } from 'lucide-react';
import { GoNoGoTest, type GoNoGoResult } from './GoNoGoTest';
import { EmotionRecognitionTest, type EmotionRecognitionResult } from './EmotionRecognitionTest';

interface TestTrial {
  testType: string;
  trialNumber: number;
  stimulus: string;
  correctResponse: string;
  userResponse: string;
  reactionTimeMs: number;
  correct: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: number;
  hesitationCount: number;
  responsePattern: string;
  stimulusType?: string;
  displayColor?: string;
  memoryType?: string;
}

interface CognitiveTestResult {
  testType: string;
  overallScore: number;
  trials: TestTrial[];
  reactionTimeStats: {
    mean: number;
    median: number;
    standardDeviation: number;
    consistency: number;
  };
  accuracyStats: {
    overall: number;
    byDifficulty: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  attentionMetrics: {
    focusLapses: number;
    vigilanceDecline: number;
    taskSwitchingCost: number;
  };
  stressIndicators: {
    performanceDecline: number;
    errorRate: number;
    responseVariability: number;
  };
}

interface AdvancedCognitiveAssessmentProps {
  onComplete: (results: CognitiveTestResult[]) => void;
  config?: {
    includeStroop?: boolean;
    includeReactionTime?: boolean;
    includeEmotionRecognition?: boolean; // New test type
    includeAttentionSwitch?: boolean;
    fastMode?: boolean;
    adaptiveDifficulty?: boolean;
  };
}

// Test configurations
const STROOP_CONFIG = {
  words: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE'],
  colors: {
    RED: '#ef4444',
    BLUE: '#3b82f6', 
    GREEN: '#10b981',
    YELLOW: '#eab308',
    ORANGE: '#f97316',
    PURPLE: '#8b5cf6'
  },
  trialCounts: { easy: 8, medium: 12, hard: 10 }
};

const REACTION_STIMULI = {
  visual: ['→', '↑', '▶', '▲', '●'], // Go stimuli for GoNoGo
  nogo: ['X', '✕', '⊗', '⛔', '🛑'] // No-Go stimuli for GoNoGo
};

const generateStimulus = (testType: string, difficulty: 'easy' | 'medium' | 'hard') => {
  switch (testType) {
    case 'stroop': {
      const words = STROOP_CONFIG.words;
      const colorKeys = Object.keys(STROOP_CONFIG.colors) as Array<keyof typeof STROOP_CONFIG.colors>;
      
      const word = words[Math.floor(Math.random() * words.length)];
      let colorName: keyof typeof STROOP_CONFIG.colors;
      
      // Difficulty affects congruence
      if (difficulty === 'easy') {
        // 70% congruent trials
        colorName = Math.random() < 0.7 ? (word as keyof typeof STROOP_CONFIG.colors) : 
          colorKeys[Math.floor(Math.random() * colorKeys.length)];
      } else if (difficulty === 'medium') {
        // 30% congruent trials
        colorName = Math.random() < 0.3 ? (word as keyof typeof STROOP_CONFIG.colors) : 
          colorKeys[Math.floor(Math.random() * colorKeys.length)];
      } else {
        // 0% congruent trials (all incongruent)
        const otherColors = colorKeys.filter(color => color !== word);
        colorName = otherColors[Math.floor(Math.random() * otherColors.length)];
      }
      
      return {
        stimulus: word,
        displayColor: STROOP_CONFIG.colors[colorName],
        correctResponse: colorName.toLowerCase()
      };
    }
    
    case 'reaction': {
      // This case is now handled by GoNoGoTest component directly,
      // but keeping a placeholder for type consistency if needed elsewhere.
      return {
        stimulus: 'Press Space',
        stimulusType: 'go',
        correctResponse: 'space'
      };
    }
    
    case 'emotion_recognition': {
      // Stimulus generation is handled within EmotionRecognitionTest
      return {
        stimulus: 'Recognize Emotion',
        correctResponse: '', // Response handled by EmotionRecognitionTest
        stimulusType: 'emotion'
      };
    }
    
    default:
      return { stimulus: '', correctResponse: '' };
  }
};

export function AdvancedCognitiveAssessment({ onComplete, config = {} }: AdvancedCognitiveAssessmentProps) {
  // FIX #2: Replace reaction time with Go/No-Go test (more stress-sensitive)
  const useGoNoGo = config.includeReactionTime ?? true;
  
  const {
    includeStroop = true,
    includeReactionTime = true,
    includeEmotionRecognition = true, // New test type
    includeAttentionSwitch = false,
    fastMode = false,
    adaptiveDifficulty = true
  } = config;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [assessmentStatus, setAssessmentStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [testQueue, setTestQueue] = useState<string[]>([]);
  const [isInTrial, setIsInTrial] = useState(false);
  const [results, setResults] = useState<CognitiveTestResult[]>([]);
  const [currentTrial, setCurrentTrial] = useState<Partial<TestTrial>>({});
  
  // Performance tracking
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const [hesitationTimer, setHesitationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Adaptive difficulty
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);

  const trialDataRef = useRef<TestTrial[]>([]);
  const responsePatternRef = useRef<string>('');

  // State validation helper
  const validateTestState = useCallback(() => {
    if (!currentTest || !testQueue.includes(currentTest)) {
      throw new Error('Invalid test state - current test not in queue');
    }

    const allTests = new Set(testQueue);
    const completedTestsList = Array.from(completedTests);
    
    // Validate no unexpected tests were completed
    const unexpectedTests = completedTestsList.filter(test => !allTests.has(test));
    if (unexpectedTests.length > 0) {
      console.error('Found completion state for unexpected tests:', unexpectedTests);
      // Reset to valid state
      setCompletedTests(new Set(completedTestsList.filter(test => allTests.has(test))));
    }

    const allTestsComplete = testQueue.every(test => completedTests.has(test));
    const hasValidResults = results.length === completedTests.size &&
                         results.every(r => r && typeof r.overallScore === 'number');

    // Update assessment status
    if (allTestsComplete && hasValidResults) {
      if (assessmentStatus !== 'completed') {
        console.log('🧠 All tests complete with valid results - marking assessment completed');
        setAssessmentStatus('completed');
      }
    } else if (testQueue.length > 0) {
      if (assessmentStatus === 'pending' && completedTests.size > 0) {
        setAssessmentStatus('in-progress');
      } else if (assessmentStatus === 'completed') {
        console.warn('Assessment marked completed but has incomplete/invalid tests - reverting to in-progress');
        setAssessmentStatus('in-progress');
      }
    }
  }, [currentTest, testQueue, completedTests, results, assessmentStatus]);

  // Initialize test queue and handle cleanup
  useEffect(() => {
    let isInitializing = true; // Flag to prevent setState after unmount
    let cleanupTimer: NodeJS.Timeout;
    
    const initializeTests = async () => {
      setIsLoading(true);
      setHasError(null);
      try {
        const queue: string[] = [];
        if (includeStroop) queue.push('stroop');
        if (includeReactionTime) queue.push('reaction');
        if (includeEmotionRecognition) queue.push('emotion_recognition'); // Add new test
        if (includeAttentionSwitch) queue.push('attention');
        
        if (queue.length === 0) {
          throw new Error('No tests configured for assessment');
        }
        
        if (isInitializing) {
          setTestQueue(queue);
          setCurrentTest(queue[0]);
          setCompletedTests(new Set()); // Reset completion state
          cleanupTimer = setTimeout(() => {
            if (isInitializing) {
              initializeTest(queue[0]);
            }
          }, 500); // Brief delay for UI
        }
      } catch (err) {
        if (isInitializing) {
          setHasError('Failed to initialize tests: ' + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        if (isInitializing) {
          setIsLoading(false);
        }
      }
    };

    initializeTests();

    return () => {
      isInitializing = false; // Prevent state updates after unmount
      if (hesitationTimer) {
        clearTimeout(hesitationTimer);
      }
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
      }
      setCompletedTests(new Set()); // Reset completion state on unmount
    };
  }, [includeStroop, includeReactionTime, includeEmotionRecognition, includeAttentionSwitch]);

  // Adaptive difficulty adjustment
  const adjustDifficulty = useCallback((recentPerformance: number) => {
    if (!adaptiveDifficulty) return;
    
    setPerformanceHistory(prev => {
      const newHistory = [...prev, recentPerformance].slice(-5); // Keep last 5 trials
      const avgPerformance = newHistory.reduce((sum, perf) => sum + perf, 0) / newHistory.length;
      
      if (avgPerformance > 0.8 && currentDifficulty !== 'hard') {
        setCurrentDifficulty(prev => prev === 'easy' ? 'medium' : 'hard');
        console.log(`🧠 Difficulty increased to ${currentDifficulty}`);
      } else if (avgPerformance < 0.5 && currentDifficulty !== 'easy') {
        setCurrentDifficulty(prev => prev === 'hard' ? 'medium' : 'easy');
        console.log(`🧠 Difficulty decreased to ${currentDifficulty}`);
      }
      
      return newHistory;
    });
  }, [adaptiveDifficulty, currentDifficulty]);

  const initializeTest = (testType: string) => {
    setIsLoading(true);
    setHasError(null);
    try {
      console.log(`🧠 Initializing ${testType} test with ${currentDifficulty} difficulty`);
      trialDataRef.current = [];
      setIsInTrial(false);
      
      // Update assessment status when starting test
      if (assessmentStatus === 'pending' && testQueue.length > 0) {
        // Verify clean state before starting
        setIsInTrial(false);
        trialDataRef.current = [];
        responsePatternRef.current = '';
        setCurrentDifficulty('easy');
        setTestProgress(0);
        setAssessmentStatus('in-progress');
      }
      
      // Start first trial after brief delay
      setTimeout(() => {
        startTrial(testType);
      }, 1000);
    } catch (err) {
      setHasError('Failed to initialize test: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };



  const startTrial = (testType: string) => {
    setIsLoading(true);
    setHasError(null);
    try {
      setIsInTrial(true);
      setTrialStartTime(performance.now());
      setKeyPressCount(0);
      responsePatternRef.current = '';
      
      // Generate trial stimulus based on test type
      const stimulus = generateStimulus(testType, currentDifficulty);
      setCurrentTrial({
        testType,
        trialNumber: trialDataRef.current.length + 1,
        difficulty: currentDifficulty,
        timestamp: Date.now(),
        ...stimulus
      });

      // Start hesitation detection
      setHesitationTimer(setTimeout(() => {
        setKeyPressCount(prev => prev + 1);
        responsePatternRef.current += 'H'; // H for hesitation
      }, 2000));
    } catch (err) {
      setHasError('Failed to start trial: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (response: string) => {
    if (!isInTrial || !currentTrial.stimulus) return;
    setIsLoading(true);
    
    try {
      const reactionTime = performance.now() - trialStartTime;
      const correct = response.toLowerCase() === currentTrial.correctResponse?.toLowerCase();
      
      // Clear hesitation timer
      if (hesitationTimer) {
        clearTimeout(hesitationTimer);
        setHesitationTimer(null);
      }
      
      // Record response pattern
      responsePatternRef.current += response.length === 1 ? 'R' : 'M'; // R for single response, M for multiple
      
      const trial: TestTrial = {
        testType: currentTrial.testType!,
        trialNumber: currentTrial.trialNumber!,
        stimulus: currentTrial.stimulus,
        correctResponse: currentTrial.correctResponse!,
        userResponse: response,
        reactionTimeMs: Math.round(reactionTime),
        correct,
        difficulty: currentTrial.difficulty!,
        timestamp: currentTrial.timestamp!,
        hesitationCount: keyPressCount,
        responsePattern: responsePatternRef.current
      };
      
      trialDataRef.current.push(trial);
      setIsInTrial(false);
      
      // Adjust difficulty based on performance
      const performanceScore = correct ? 1 : 0;
      adjustDifficulty(performanceScore);
      
      // Check if test is complete
      const maxTrials = fastMode ? 10 : 
                      currentTrial.testType === 'stroop' ? 30 :
                      currentTrial.testType === 'reaction' ? 25 : // Go/No-Go trials
                      currentTrial.testType === 'emotion_recognition' ? 20 : // Emotion recognition trials
                      20;
      
      const isTestComplete = trialDataRef.current.length >= maxTrials;
      
      // Update progress before state changes
      setTestProgress((trialDataRef.current.length / maxTrials) * 100);
      
      if (isTestComplete && currentTrial.testType) {
        // Mark this test as completed
        setCompletedTests(prev => {
          const newSet = new Set(Array.from(prev));
          newSet.add(currentTrial.testType!);
          return newSet;
        });
        
        // Check if this was the last test
        const remainingTests = testQueue.filter(test => !completedTests.has(test));
        if (remainingTests.length === 1 && remainingTests[0] === currentTrial.testType) {
          setAssessmentStatus('completed');
        }
        
        await completeCurrentTest();
      } else if (!isTestComplete && currentTrial.testType) {
        // Start next trial after brief delay
        setTimeout(() => {
          startTrial(currentTrial.testType!);
        }, 1000);
      }
    } catch (err) {
      console.error('Error during test progression:', err);
      setHasError('Failed to progress test: ' + (err instanceof Error ? err.message : String(err)));
      setIsInTrial(false); // Ensure we're not stuck in trial state
    } finally {
      setIsLoading(false);
    }
  };

  // Global keyboard handling for reaction tests: treat Space as response
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        // Only handle space when we're in a reaction trial
        if (currentTest === 'reaction' && isInTrial && currentTrial.correctResponse === 'space') {
          event.preventDefault();
          handleResponse('space');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentTest, isInTrial, currentTrial, handleResponse]);

  const completeCurrentTest = async () => {
    try {
      setIsLoading(true);

      // Validate we have sufficient valid trial data
      if (!trialDataRef.current || trialDataRef.current.length === 0) {
        throw new Error('No trial data available for test completion');
      }

      // Ensure we have enough valid trials
      const validTrials = trialDataRef.current.filter(trial => 
        trial && trial.reactionTimeMs > 0 && 
        typeof trial.correct === 'boolean' &&
        trial.stimulus && trial.correctResponse
      );

      if (validTrials.length < Math.floor(trialDataRef.current.length * 0.75)) {
        throw new Error('Insufficient valid trial data - please retry the test');
      }

      // Analyze and store results
      const testResult = analyzeTestResults(currentTest, validTrials);
      
      // Validate test result before storing
      if (!testResult || typeof testResult.overallScore !== 'number' || 
          !Array.isArray(testResult.trials) || testResult.trials.length === 0) {
        throw new Error('Invalid test result generated');
      }

      setResults(prev => [...prev, testResult]);
      
      // Update completion state
      if (currentTest) {
        setCompletedTests(prev => {
          const newSet = new Set(Array.from(prev));
          newSet.add(currentTest);
          return newSet;
        });
      }

      // Move to next test or complete assessment
      const currentIndex = testQueue.indexOf(currentTest);
      if (currentIndex < testQueue.length - 1) {
        const nextTest = testQueue[currentIndex + 1];
        
        // Reset state atomically before transition
        setIsInTrial(false);
        setTestProgress(0);
        setCurrentDifficulty('easy');
        setPerformanceHistory([]);
        trialDataRef.current = [];
        responsePatternRef.current = '';
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Transition to next test
        setCurrentTest(nextTest);
        initializeTest(nextTest);
      } else {
        // Verify all tests are complete and have valid results
        const allResults = [...results, testResult];
        const allTestsComplete = testQueue.every(test => completedTests.has(test));
        const allResultsValid = allResults.every(result => {
          return result && 
                 typeof result.overallScore === 'number' && 
                 Array.isArray(result.trials) && 
                 result.trials.length > 0;
        });

        if (!allTestsComplete || !allResultsValid) {
          throw new Error('Assessment incomplete or invalid results detected');
        }

        console.log(`🧠 Cognitive assessment complete with ${allResults.length} validated tests`);
        onComplete(allResults);
      }
    } catch (err) {
      console.error('Error completing test:', err);
      setHasError('Failed to complete test: ' + (err instanceof Error ? err.message : String(err)));
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeTestResults = (testType: string, trials: TestTrial[]): CognitiveTestResult => {
    const reactionTimes = trials.map(t => t.reactionTimeMs);
    const accuracy = trials.filter(t => t.correct).length / trials.length;
    
    const reactionTimeStats = {
      mean: reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length,
      median: reactionTimes.sort((a, b) => a - b)[Math.floor(reactionTimes.length / 2)],
      standardDeviation: Math.sqrt(
        reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - (reactionTimes.reduce((s, r) => s + r, 0) / reactionTimes.length), 2), 0) / reactionTimes.length
      ),
      consistency: 1 - (Math.sqrt(
        reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - (reactionTimes.reduce((s, r) => s + r, 0) / reactionTimes.length), 2), 0) / reactionTimes.length
      ) / (reactionTimes.reduce((s, r) => s + r, 0) / reactionTimes.length))
    };
    
    const accuracyStats = {
      overall: accuracy,
      byDifficulty: {
        easy: trials.filter(t => t.difficulty === 'easy' && t.correct).length / Math.max(1, trials.filter(t => t.difficulty === 'easy').length),
        medium: trials.filter(t => t.difficulty === 'medium' && t.correct).length / Math.max(1, trials.filter(t => t.difficulty === 'medium').length),
        hard: trials.filter(t => t.difficulty === 'hard' && t.correct).length / Math.max(1, trials.filter(t => t.difficulty === 'hard').length)
      }
    };
    
    // Analyze attention patterns
    const firstHalf = trials.slice(0, Math.floor(trials.length / 2));
    const secondHalf = trials.slice(Math.floor(trials.length / 2));
    
    const focusLapses = trials.filter(t => t.hesitationCount > 2).length;
    const vigilanceDecline = (firstHalf.filter(t => t.correct).length / firstHalf.length) - 
                           (secondHalf.filter(t => t.correct).length / secondHalf.length);
    
    const attentionMetrics = {
      focusLapses,
      vigilanceDecline,
      taskSwitchingCost: 0 // Would need multiple test types to calculate
    };
    
    // Stress indicators
    const errorRate = 1 - accuracy;
    const performanceDecline = Math.max(0, vigilanceDecline);
    const responseVariability = reactionTimeStats.standardDeviation / reactionTimeStats.mean;
    
    const stressIndicators = {
      performanceDecline,
      errorRate,
      responseVariability
    };
    
    // Overall score calculation
    const overallScore = (
      accuracy * 0.4 +
      Math.max(0, Math.min(1, 1 - (reactionTimeStats.mean - 500) / 2000)) * 0.3 +
      reactionTimeStats.consistency * 0.2 +
      Math.max(0, 1 - performanceDecline) * 0.1
    );
    
    console.log(`🧠 ${testType} test analysis:`, {
      trials: trials.length,
      accuracy,
      meanRT: reactionTimeStats.mean,
      overallScore
    });
    
    return {
      testType,
      trials,
      overallScore,
      reactionTimeStats,
      accuracyStats,
      attentionMetrics,
      stressIndicators
    };
  };

  const renderTestInterface = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8" data-testid="cognitive-loading">
          <Brain className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg">Processing...</p>
        </div>
      );
    }

    if (!isInTrial || !currentTrial.stimulus) {
      return (
        <div className="text-center py-8" data-testid="cognitive-waiting">
          <Brain className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <p className="text-lg">Preparing next assessment...</p>
        </div>
      );
    }

    switch (currentTest) {
      case 'stroop':
        return (
          <div className="text-center space-y-6" data-testid="stroop-interface">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Color Recognition Test
              </h3>
              <p className="text-sm text-muted-foreground">
                Click the button that matches the COLOR of the word (not what it says)
              </p>
            </div>
            
            <div className="text-6xl font-bold mb-8" 
                 style={{ color: currentTrial.displayColor }}
                 data-testid="stroop-word">
              {currentTrial.stimulus}
            </div>
            
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {Object.entries(STROOP_CONFIG.colors).map(([colorName, colorValue]) => (
                <Button
                  key={colorName}
                  onClick={() => handleResponse(colorName.toLowerCase())}
                  className="h-12 text-white font-semibold"
                  style={{ backgroundColor: colorValue }}
                  data-testid={`color-button-${colorName.toLowerCase()}`}
                >
                  {colorName}
                </Button>
              ))}
            </div>
          </div>
        );
        
            case 'reaction':
        // FIX #2: Use Go/No-Go test instead of simple reaction time
        // Go/No-Go is much more stress-sensitive (inhibitory control)
        if (useGoNoGo) {
          return (
            <GoNoGoTest 
              onComplete={(result: GoNoGoResult) => {
                // Convert Go/No-Go result to CognitiveTestResult format
                const trials: TestTrial[] = result.trials.map((trial): TestTrial => ({
                  testType: 'reaction',
                  trialNumber: trial.trialNumber,
                  stimulus: trial.stimulus,
                  correctResponse: trial.stimulusType === 'go' ? 'press' : 'withhold',
                  userResponse: trial.userResponse,
                  reactionTimeMs: trial.reactionTimeMs,
                  correct: trial.correct,
                  difficulty: 'medium' as const,
                  timestamp: trial.timestamp,
                  hesitationCount: 0,
                  responsePattern: trial.correct ? 'C' : 'E',
                  stimulusType: trial.stimulusType
                }));

                const testResult: CognitiveTestResult = {
                  testType: 'reaction',
                  trials,
                  overallScore: result.summary.overallScore,
                  reactionTimeStats: {
                    mean: result.summary.meanReactionTime,
                    median: result.summary.meanReactionTime,
                    standardDeviation: result.summary.reactionTimeStdDev,
                    consistency: 1 - (result.summary.reactionTimeStdDev / Math.max(1, result.summary.meanReactionTime))
                  },
                  accuracyStats: {
                    overall: (result.summary.goAccuracy + result.summary.nogoAccuracy) / 2,
                    byDifficulty: {
                      easy: result.summary.goAccuracy,
                      medium: (result.summary.goAccuracy + result.summary.nogoAccuracy) / 2,
                      hard: result.summary.nogoAccuracy
                    }
                  },
                  attentionMetrics: {
                    focusLapses: result.summary.falseAlarms,
                    vigilanceDecline: 0,
                    taskSwitchingCost: 0
                  },
                  stressIndicators: {
                    performanceDecline: result.summary.falseAlarms / Math.max(1, result.summary.nogoTrials),
                    errorRate: (result.summary.falseAlarms + result.summary.misses) / result.summary.totalTrials,
                    responseVariability: result.summary.reactionTimeStdDev / Math.max(1, result.summary.meanReactionTime)
                  }
                };

                setResults(prev => [...prev, testResult]);
                setCompletedTests(prev => {
                  const newSet = new Set(Array.from(prev));
                  newSet.add('reaction');
                  return newSet;
                });

                completeCurrentTest();
              }}
              totalTrials={fastMode ? 20 : 30}
              nogoFrequency={0.25}
            />
          );
        }
        
        // Fallback to simple reaction time (legacy)
        return (
          <div className="text-center space-y-6" data-testid="reaction-interface">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Reaction Time Test
              </h3>
              <p className="text-sm text-muted-foreground">
                Press the SPACE bar as soon as you see the stimulus
              </p>
            </div>
            
            <div className="text-8xl mb-8" data-testid="reaction-stimulus">
              {currentTrial.stimulus}
            </div>
            
            <Button
              onClick={() => handleResponse('space')}
              size="lg"
              className="text-xl px-12 py-4"
              data-testid="reaction-button"
            >
              SPACE
            </Button>
          </div>
        );
        
      case 'memory':
        return (
          <EmotionRecognitionTest
            onComplete={(result: EmotionRecognitionResult) => {
              const trials: TestTrial[] = result.trials.map((trial): TestTrial => ({
                testType: 'emotion_recognition',
                trialNumber: trial.trialNumber,
                stimulus: trial.targetEmotion,
                correctResponse: trial.targetEmotion,
                userResponse: trial.detectedEmotion || 'none',
                reactionTimeMs: trial.reactionTimeMs,
                correct: trial.correct,
                difficulty: 'medium' as const, // Emotion recognition doesn't have explicit difficulty levels yet
                timestamp: trial.timestamp,
                hesitationCount: 0,
                responsePattern: trial.correct ? 'C' : 'E',
                stimulusType: 'emotion'
              }));

              const testResult: CognitiveTestResult = {
                testType: 'emotion_recognition',
                trials,
                overallScore: result.summary.overallScore,
                reactionTimeStats: {
                  mean: result.summary.meanReactionTime,
                  median: result.summary.meanReactionTime,
                  standardDeviation: 0, // Not calculated in EmotionRecognitionTest summary
                  consistency: 0, // Not calculated in EmotionRecognitionTest summary
                },
                accuracyStats: {
                  overall: result.summary.accuracy,
                  byDifficulty: {
                    easy: result.summary.accuracy,
                    medium: result.summary.accuracy,
                    hard: result.summary.accuracy,
                  },
                },
                attentionMetrics: {
                  focusLapses: 0,
                  vigilanceDecline: 0,
                  taskSwitchingCost: 0,
                },
                stressIndicators: {
                  performanceDecline: 0,
                  errorRate: 1 - result.summary.accuracy,
                  responseVariability: 0,
                },
              };

              setResults(prev => [...prev, testResult]);
              setCompletedTests(prev => {
                const newSet = new Set(Array.from(prev));
                newSet.add('emotion_recognition');
                return newSet;
              });

              completeCurrentTest();
            }}
            totalTrials={fastMode ? 10 : 20}
          />
        );
        
      default:
        return <div>Unknown test type</div>;
    }
  };

  const getTestIcon = (testType: string) => {
    switch (testType) {
      case 'stroop': return AlertCircle;
      case 'reaction': return Zap;
      case 'emotion_recognition': return Brain; // Use Brain icon for emotion recognition
      case 'attention': return Brain;
      default: return Brain;
    }
  };

    const formatTestName = (testType: string) => {
    switch (testType) {
      case 'stroop': return 'Color Recognition';
      case 'reaction': return useGoNoGo ? 'Response Control (Go/No-Go)' : 'Reaction Time';
      case 'emotion_recognition': return 'Facial Emotion Recognition'; // New test name
      case 'attention': return 'Attention Switch';
      default: return testType;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="cognitive-assessment">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {(() => {
            const Icon = getTestIcon(currentTest);
            return <Icon className="w-6 h-6" />;
          })()}
          Advanced Cognitive Assessment
        </CardTitle>
        {hasError && (
          <div className="text-sm text-red-500 mt-2 p-2 bg-red-50 rounded" role="alert">
            {hasError}
          </div>
        )}
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Current Test: {formatTestName(currentTest)} ({testQueue.indexOf(currentTest) + 1} of {testQueue.length})
            </p>
            <p className="text-xs text-muted-foreground">
              Assessment Status: 
              {assessmentStatus === 'pending' && (
                <span className="text-yellow-500 font-medium">Starting...</span>
              )}
              {assessmentStatus === 'in-progress' && (
                <span className="text-blue-500 font-medium">In Progress</span>
              )}
              {assessmentStatus === 'completed' && (
                <span className="text-green-500 font-medium">Completed</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2">
                Progress
                {isLoading && (
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-ping"/>
                )}
              </span>
              <span>{Math.round(testProgress)}%</span>
            </div>
            <Progress 
              value={testProgress} 
              className="h-2" 
              data-testid="test-progress" 
              color={assessmentStatus === 'completed' ? 'green' : 'blue'}
            />
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${currentDifficulty === 'easy' ? 'bg-green-500' : 'bg-gray-300'}`} />
              Easy
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${currentDifficulty === 'medium' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${currentDifficulty === 'hard' ? 'bg-red-500' : 'bg-gray-300'}`} />
              Hard
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderTestInterface()}
      </CardContent>
    </Card>
  );
}
