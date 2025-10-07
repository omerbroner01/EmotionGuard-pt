import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { StroopTrial } from '@/types/emotionGuard';

interface StroopTestProps {
  onComplete: (results: StroopTrial[]) => void;
}

const WORDS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const COLORS = {
  RED: '#ef4444',
  BLUE: '#3b82f6', 
  GREEN: '#10b981',
  YELLOW: '#eab308'
};

const COLOR_BUTTONS = [
  { name: 'RED', value: 'red', className: 'bg-red-500 hover:bg-red-600' },
  { name: 'BLUE', value: 'blue', className: 'bg-blue-500 hover:bg-blue-600' },
  { name: 'GREEN', value: 'green', className: 'bg-green-500 hover:bg-green-600' },
  { name: 'YELLOW', value: 'yellow', className: 'bg-yellow-500 hover:bg-yellow-600' }
];

export function StroopTest({ onComplete }: StroopTestProps) {
  const [currentTrial, setCurrentTrial] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [currentColorName, setCurrentColorName] = useState('');
  const [trialStartTime, setTrialStartTime] = useState<number>(0);
  const [results, setResults] = useState<StroopTrial[]>([]);

  const generateTrial = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const colorKeys = Object.keys(COLORS) as Array<keyof typeof COLORS>;
    const colorName = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    const color = COLORS[colorName];
    
    setCurrentWord(word);
    setCurrentColor(color);
    setCurrentColorName(colorName);
    setTrialStartTime(performance.now());
  }, []);

  useEffect(() => {
    generateTrial();
  }, [generateTrial]);

  // Keyboard support: map Digit1..4 to color buttons and prevent default for Space
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent page scrolling on Space while test is active
      if (event.code === 'Space') {
        event.preventDefault();
        return;
      }

      // Accept Digit1..Digit4 for quick answers
      if (event.code && event.code.startsWith('Digit')) {
        const idx = parseInt(event.code.replace('Digit', ''), 10) - 1;
        if (idx >= 0 && idx < COLOR_BUTTONS.length) {
          // map to the button value
          const value = COLOR_BUTTONS[idx].value;
          handleAnswer(value);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trialStartTime, currentWord, currentColorName, results]);

  const handleAnswer = (response: string) => {
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

    if (currentTrial >= 5) {
      onComplete(newResults);
    } else {
      setCurrentTrial(prev => prev + 1);
      generateTrial();
    }
  };

  return (
    <div className="text-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Cognitive Check</h3>
        <p className="text-sm text-muted-foreground">
          Select the color of the word, not what it says
        </p>
      </div>
      
      <div className="mb-6">
        <div 
          className="stroop-word mb-4"
          style={{ color: currentColor }}
          data-testid="text-stroopword"
        >
          {currentWord}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {COLOR_BUTTONS.map((button) => (
            <Button
              key={button.value}
              className={`${button.className} text-white font-medium`}
              onClick={() => handleAnswer(button.value)}
              data-testid={`button-color-${button.value}`}
            >
              {button.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">Hint: You can press keys 1-4 to choose the corresponding color.</div>
      
      <div className="text-sm text-muted-foreground">
        Trial <span data-testid="text-trialnumber">{currentTrial}</span> of 5
      </div>
    </div>
  );
}
