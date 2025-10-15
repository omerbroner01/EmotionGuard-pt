import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import type { StroopTrial } from '@/types/emotionGuard';

interface StroopTestProps {
  onComplete: (results: StroopTrial[]) => void;
  config?: {
    totalTrials?: number;
    adaptiveDifficulty?: boolean;
    fastMode?: boolean;
  };
}

// Test configuration
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

const COLOR_BUTTONS = [
  { name: 'RED', value: 'red', className: 'bg-red-500 hover:bg-red-600' },
  { name: 'BLUE', value: 'blue', className: 'bg-blue-500 hover:bg-blue-600' },
  { name: 'GREEN', value: 'green', className: 'bg-green-500 hover:bg-green-600' },
  { name: 'YELLOW', value: 'yellow', className: 'bg-yellow-500 hover:bg-yellow-600' },
  { name: 'ORANGE', value: 'orange', className: 'bg-orange-500 hover:bg-orange-600' },
  { name: 'PURPLE', value: 'purple', className: 'bg-purple-500 hover:bg-purple-600' }
];

export function StroopTest({ onComplete, config = {} }: StroopTestProps) {
  const {
    totalTrials = 20,
    adaptiveDifficulty = true,
    fastMode = false
  } = config;

  // State management
  const [currentTrial, setCurrentTrial] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [currentColorName, setCurrentColorName] = useState('');
  const [trialStartTime, setTrialStartTime] = useState<number>(0);
  const [results, setResults] = useState<StroopTrial[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);

  const handleAnswer = useCallback((response: string) => {
    const reactionTime = performance.now() - trialStartTime;
    const correct = response.toUpperCase() === currentColorName;
    
    const trial: StroopTrial = {
      word: currentWord,
      color: currentColor,
      response,
      reactionTimeMs: Math.round(reactionTime),
      correct
    };

    const newResults = [...results, trial];
    setResults(newResults);

    // Adjust difficulty based on performance
    adjustDifficulty(correct ? 1 : 0);

    if (currentTrial >= totalTrials) {
      onComplete(newResults);
    } else {
      setCurrentTrial(prev => prev + 1);
      generateTrial();
    }
  }, [trialStartTime, currentColorName, currentWord, currentColor, results, currentTrial, totalTrials, onComplete]);

  const adjustDifficulty = useCallback((recentPerformance: number) => {
    if (!adaptiveDifficulty) return;
    
    setPerformanceHistory(prev => {
      const newHistory = [...prev, recentPerformance].slice(-5); // Keep last 5 trials
      const avgPerformance = newHistory.reduce((sum, perf) => sum + perf, 0) / newHistory.length;
      
      if (avgPerformance > 0.8 && difficulty !== 'hard') {
        setDifficulty(prev => prev === 'easy' ? 'medium' : 'hard');
        console.log(`🎯 Difficulty increased to ${difficulty}`);
      } else if (avgPerformance < 0.5 && difficulty !== 'easy') {
        setDifficulty(prev => prev === 'hard' ? 'medium' : 'easy');
        console.log(`🎯 Difficulty decreased to ${difficulty}`);
      }
      
      return newHistory;
    });
  }, [adaptiveDifficulty, difficulty]);

  const generateTrial = useCallback(() => {
    const { words } = STROOP_CONFIG;
    const colorKeys = Object.keys(STROOP_CONFIG.colors) as Array<keyof typeof STROOP_CONFIG.colors>;
    
    let word = words[Math.floor(Math.random() * words.length)];
    let colorName: keyof typeof STROOP_CONFIG.colors;
    
    // Difficulty affects congruence rate
    if (difficulty === 'easy') {
      // 70% congruent trials
      colorName = Math.random() < 0.7 ? word as keyof typeof STROOP_CONFIG.colors : 
        colorKeys[Math.floor(Math.random() * colorKeys.length)];
    } else if (difficulty === 'medium') {
      // 30% congruent trials
      colorName = Math.random() < 0.3 ? word as keyof typeof STROOP_CONFIG.colors : 
        colorKeys[Math.floor(Math.random() * colorKeys.length)];
    } else {
      // 0% congruent trials (all incongruent)
      const otherColors = colorKeys.filter(color => color !== word);
      colorName = otherColors[Math.floor(Math.random() * otherColors.length)];
    }
    
    const color = STROOP_CONFIG.colors[colorName];
    
    setCurrentWord(word);
    setCurrentColor(color);
    setCurrentColorName(colorName);
    setTrialStartTime(performance.now());
  }, [difficulty]);

  useEffect(() => {
    generateTrial();
  }, [generateTrial]);

  // Enhanced keyboard support with visual feedback
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent page scrolling on Space
      if (event.code === 'Space') {
        event.preventDefault();
        return;
      }

      // Handle Digit1..Digit6 for quick answers
      if (event.code?.startsWith('Digit')) {
        const idx = parseInt(event.code.replace('Digit', ''), 10) - 1;
        if (idx >= 0 && idx < COLOR_BUTTONS.length) {
          const button = COLOR_BUTTONS[idx];
          const element = document.querySelector<HTMLButtonElement>(
            `[data-testid="button-color-${button.value}"]`
          );

          // Visual feedback
          if (element) {
            element.classList.add('ring-2', 'ring-white', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-white', 'ring-opacity-50');
            }, 100);
          }

          handleAnswer(button.value);
        }
      }
    };

        window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Color Recognition Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select the color you see, not what the word says.
        </p>
        <div className="space-y-1 mt-2">
          <div className="flex justify-between text-xs">
            <span>Progress</span>
            <span>{Math.round((currentTrial / totalTrials) * 100)}%</span>
          </div>
          <Progress 
            value={(currentTrial / totalTrials) * 100}
            className="h-2"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-center space-y-6">
          {/* Current difficulty indicator */}
          <div className="flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${difficulty === 'easy' ? 'bg-green-500' : 'bg-gray-300'}`} />
              Easy
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${difficulty === 'medium' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${difficulty === 'hard' ? 'bg-red-500' : 'bg-gray-300'}`} />
              Hard
            </span>
          </div>
          
          {/* Stimulus display */}
          <div 
            className="text-6xl font-bold animate-in fade-in duration-200"
            style={{ color: currentColor }}
            data-testid="text-stroopword"
          >
            {currentWord}
          </div>
          
          {/* Response buttons */}
          <div className="grid grid-cols-3 gap-3">
            {COLOR_BUTTONS.map((button, index) => (
              <Button
                key={button.value}
                className={`${button.className} text-white font-medium h-12`}
                onClick={() => handleAnswer(button.value)}
                data-testid={`button-color-${button.value}`}
              >
                {button.name}
                <span className="text-xs ml-1 opacity-50">{index + 1}</span>
              </Button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Press keys 1-6 to select colors quickly
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
