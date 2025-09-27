import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Zap, Target, Brain } from 'lucide-react';

import type { CognitiveTestResult, TestTrial } from '@/types/emotionGuard';

interface AdvancedCognitiveAssessmentProps {
  onComplete: (results: CognitiveTestResult[]) => void;
  config?: {
    includeStroop?: boolean;
    includeReactionTime?: boolean;
    includeWorkingMemory?: boolean;
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
  visual: ['●', '■', '▲', '♦', '★'],
  color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
  auditory: ['BEEP', 'BUZZ', 'PING', 'CHIME']
};

const WORKING_MEMORY_CONFIG = {
  digitSpans: { easy: [3, 4], medium: [4, 5], hard: [5, 6, 7] },
  nBackLevels: { easy: 1, medium: 2, hard: 3 }
};

export function AdvancedCognitiveAssessment({ onComplete, config = {} }: AdvancedCognitiveAssessmentProps) {
  const {
    includeStroop = true,
    includeReactionTime = true,
    includeWorkingMemory = true,
    includeAttentionSwitch = false,
    fastMode = false,
    adaptiveDifficulty = true
  } = config;

  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [isInTrial, setIsInTrial] = useState(false);
  const [results, setResults] = useState<CognitiveTestResult[]>([]);
  const [currentTrial, setCurrentTrial] = useState<Partial<TestTrial>>({});
  const [testQueue, setTestQueue] = useState<string[]>([]);
  
  // Performance tracking
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const [hesitationTimer, setHesitationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Adaptive difficulty
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);

  const trialDataRef = useRef<TestTrial[]>([]);
  const responsePatternRef = useRef<string>('');

  // Initialize test queue
  useEffect(() => {
    const queue: string[] = [];
    if (includeStroop) queue.push('stroop');
    if (includeReactionTime) queue.push('reaction');
    if (includeWorkingMemory) queue.push('memory');
    if (includeAttentionSwitch) queue.push('attention');
    
    setTestQueue(queue);
    if (queue.length > 0) {
      setCurrentTest(queue[0]);
      initializeTest(queue[0]);
    }
  }, [includeStroop, includeReactionTime, includeWorkingMemory, includeAttentionSwitch]);

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
    console.log(`🧠 Initializing ${testType} test with ${currentDifficulty} difficulty`);
    trialDataRef.current = [];
    setIsInTrial(false);
    
    // Start first trial after brief delay
    setTimeout(() => {
      startTrial(testType);
    }, 1000);
  };

  const startTrial = (testType: string) => {
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
        const stimulusTypes = difficulty === 'easy' ? ['visual'] : 
                            difficulty === 'medium' ? ['visual', 'color'] : 
                            ['visual', 'color', 'auditory'];
        
        const stimulusType = stimulusTypes[Math.floor(Math.random() * stimulusTypes.length)];
        const stimulus = REACTION_STIMULI[stimulusType as keyof typeof REACTION_STIMULI][
          Math.floor(Math.random() * REACTION_STIMULI[stimulusType as keyof typeof REACTION_STIMULI].length)
        ];
        
        return {
          stimulus,
          stimulusType,
          correctResponse: 'space' // Space bar for all reaction trials
        };
      }
      
      case 'memory': {
        const spanLengths = WORKING_MEMORY_CONFIG.digitSpans[difficulty];
        const spanLength = spanLengths[Math.floor(Math.random() * spanLengths.length)];
        const digits = Array.from({ length: spanLength }, () => 
          Math.floor(Math.random() * 10).toString()
        ).join('');
        
        return {
          stimulus: digits,
          correctResponse: digits.split('').reverse().join(''), // Reverse for backward span
          memoryType: 'digit_span'
        };
      }
      
      default:
        return { stimulus: '', correctResponse: '' };
    }
  };

  const handleResponse = (response: string) => {
    if (!isInTrial || !currentTrial.stimulus) return;
    
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
                    currentTrial.testType === 'reaction' ? 25 :
                    20;
    
    if (trialDataRef.current.length >= maxTrials) {
      completeCurrentTest();
    } else {
      // Start next trial after brief delay
      setTimeout(() => {
        startTrial(currentTrial.testType!);
      }, 1000);
    }
    
    setTestProgress((trialDataRef.current.length / maxTrials) * 100);
  };

  const completeCurrentTest = () => {
    const testResult = analyzeTestResults(currentTest, trialDataRef.current);
    setResults(prev => [...prev, testResult]);
    
    // Move to next test or complete assessment
    const currentIndex = testQueue.indexOf(currentTest);
    if (currentIndex < testQueue.length - 1) {
      const nextTest = testQueue[currentIndex + 1];
      setCurrentTest(nextTest);
      setTestProgress(0);
      setCurrentDifficulty('easy'); // Reset difficulty for new test
      initializeTest(nextTest);
    } else {
      // All tests complete
      const allResults = [...results, testResult];
      console.log(`🧠 Cognitive assessment complete with ${allResults.length} tests`);
      onComplete(allResults);
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
          <div className="text-center space-y-6" data-testid="memory-interface">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                Working Memory Test
              </h3>
              <p className="text-sm text-muted-foreground">
                Remember these digits and type them in REVERSE order
              </p>
            </div>
            
            <div className="text-4xl font-mono mb-8 tracking-widest" data-testid="memory-digits">
              {currentTrial.stimulus}
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Type digits in reverse order"
                className="w-64 h-12 text-center text-xl border rounded-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleResponse((e.target as HTMLInputElement).value);
                  }
                }}
                data-testid="memory-input"
                autoFocus
              />
              <div>
                <Button
                  onClick={() => {
                    const input = document.querySelector('[data-testid="memory-input"]') as HTMLInputElement;
                    handleResponse(input.value);
                  }}
                  data-testid="memory-submit"
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown test type</div>;
    }
  };

  const getTestIcon = (testType: string) => {
    switch (testType) {
      case 'stroop': return AlertCircle;
      case 'reaction': return Zap;
      case 'memory': return Target;
      case 'attention': return Brain;
      default: return Brain;
    }
  };

  const formatTestName = (testType: string) => {
    switch (testType) {
      case 'stroop': return 'Color Recognition';
      case 'reaction': return 'Reaction Time';
      case 'memory': return 'Working Memory';
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
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Current Test: {formatTestName(currentTest)} ({testQueue.indexOf(currentTest) + 1} of {testQueue.length})
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{Math.round(testProgress)}%</span>
            </div>
            <Progress value={testProgress} className="h-2" data-testid="test-progress" />
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