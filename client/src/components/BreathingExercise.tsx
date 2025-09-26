import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface BreathingExerciseProps {
  duration: number; // in seconds
  onComplete: (actualDuration: number) => void;
  onSkip: () => void;
}

export function BreathingExercise({ duration, onComplete, onSkip }: BreathingExerciseProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [breathingPhase, setBreathingPhase] = useState<'in' | 'out'>('in');
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const actualDuration = Date.now() - startTime;
          onComplete(actualDuration);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete, startTime]);

  useEffect(() => {
    // Alternate breathing phase every 2 seconds
    const phaseInterval = setInterval(() => {
      setBreathingPhase(prev => prev === 'in' ? 'out' : 'in');
    }, 2000);

    return () => clearInterval(phaseInterval);
  }, []);

  return (
    <div className="text-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Breathing Exercise</h3>
        <p className="text-sm text-muted-foreground">
          Follow the circle - breathe in as it grows, out as it shrinks
        </p>
      </div>
      
      <div className="mb-6">
        <div className="w-32 h-32 bg-primary rounded-full breathing-circle mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-medium" data-testid="text-breathing">
            {breathingPhase === 'in' ? 'Breathe In' : 'Breathe Out'}
          </span>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Time remaining: <span className="font-medium" data-testid="text-timer">{timeLeft}s</span>
        </div>
      </div>
      
      <Button 
        variant="ghost"
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground"
        data-testid="button-skip"
      >
        Skip (will require justification)
      </Button>
    </div>
  );
}
