import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Frown, Meh, Angry, Brain, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import type { FaceMetrics } from '@/lib/faceDetection';

export interface EmotionRecognitionTrial {
  trialNumber: number;
  targetEmotion: string;
  detectedEmotion: string | null;
  correct: boolean;
  reactionTimeMs: number;
  timestamp: number;
  faceMetricsAtResponse: FaceMetrics | null;
}

export interface EmotionRecognitionResult {
  trials: EmotionRecognitionTrial[];
  summary: {
    totalTrials: number;
    correctResponses: number;
    accuracy: number;
    meanReactionTime: number;
    overallScore: number; // 0-1, higher is better
  };
}

interface EmotionRecognitionTestProps {
  onComplete: (result: EmotionRecognitionResult) => void;
  totalTrials?: number;
  fastMode?: boolean;
}

const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral'];
const EMOTION_ICONS: { [key: string]: React.ElementType } = {
  happy: Smile,
  sad: Frown,
  angry: Angry,
  surprised: Lightbulb, // Replaced Surprised with Lightbulb
  neutral: Meh,
};

export function EmotionRecognitionTest({
  onComplete,
  totalTrials = 20,
  fastMode = false,
}: EmotionRecognitionTestProps) {
  const { metrics, startDetection, stopDetection, isActive, error } = useFaceDetection();

  const [phase, setPhase] = useState<'instructions' | 'ready' | 'testing' | 'complete'>('instructions');
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [targetEmotion, setTargetEmotion] = useState<string>('');
  const [trials, setTrials] = useState<EmotionRecognitionTrial[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [trialStartTime, setTrialStartTime] = useState<number>(0);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null); // State for selected emotion

  const trialSequence = useRef<string[]>([]);
  const responseTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generate trial sequence
    const sequence: string[] = [];
    for (let i = 0; i < totalTrials; i++) {
      sequence.push(EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)]);
    }
    trialSequence.current = sequence;

    return () => {
      if (responseTimeout.current) clearTimeout(responseTimeout.current);
      stopDetection();
    };
  }, [totalTrials, stopDetection]);

  const startTest = useCallback(async () => {
    setPhase('ready');
    setTrials([]);
    setCurrentTrialIndex(0);
    setFeedback(null);

    try {
      if (!isActive) {
        await startDetection();
      }
      setTimeout(() => {
        setPhase('testing');
        startTrial(0);
      }, 2000); // Give time for camera to warm up and user to get ready
    } catch (err) {
      console.error("Failed to start face detection for emotion test:", err);
      // Handle error, maybe switch to fallback or show message
    }
  }, [isActive, startDetection]);

  const startTrial = useCallback((index: number) => {
    if (index >= totalTrials) {
      setPhase('complete');
      calculateResults();
      return;
    }

    setTargetEmotion(trialSequence.current[index]);
    setTrialStartTime(performance.now());
    setFeedback(null);

    // Set a timeout for each trial (e.g., 5 seconds to recognize emotion)
    responseTimeout.current = setTimeout(() => {
      handleResponse(null); // No response within time limit
    }, 5000); // 5 seconds per trial
  }, [totalTrials]);

  const handleResponse = useCallback((selectedEmotion: string | null) => {
    if (responseTimeout.current) {
      clearTimeout(responseTimeout.current);
      responseTimeout.current = null;
    }

    const reactionTime = selectedEmotion ? Math.round(performance.now() - trialStartTime) : 5000; // Max time if no response
    const correct = selectedEmotion === targetEmotion;

    const trial: EmotionRecognitionTrial = {
      trialNumber: currentTrialIndex + 1,
      targetEmotion,
      detectedEmotion: selectedEmotion,
      correct,
      reactionTimeMs: reactionTime,
      timestamp: Date.now(),
      faceMetricsAtResponse: metrics, // Capture face metrics at the moment of response
    };

    setTrials(prev => [...prev, trial]);
    setFeedback(correct ? 'correct' : 'incorrect');
    setSelectedEmotion(selectedEmotion); // Set selected emotion for visual feedback

    setTimeout(() => {
      setFeedback(null);
      setSelectedEmotion(null); // Clear selected emotion after feedback
      setCurrentTrialIndex(prev => prev + 1);
    }, 500); // Brief feedback display

  }, [currentTrialIndex, targetEmotion, trialStartTime, metrics]);

  useEffect(() => {
    if (phase === 'testing' && currentTrialIndex < totalTrials) {
      startTrial(currentTrialIndex);
    } else if (phase === 'testing' && currentTrialIndex >= totalTrials) {
      setPhase('complete');
      calculateResults();
    }
  }, [currentTrialIndex, phase, totalTrials, startTrial]);

  const calculateResults = useCallback(() => {
    stopDetection(); // Stop camera when test is complete

    const correctResponses = trials.filter(t => t.correct).length;
    const accuracy = trials.length > 0 ? correctResponses / trials.length : 0;
    const validReactionTimes = trials.filter(t => t.correct && t.reactionTimeMs < 5000).map(t => t.reactionTimeMs);
    const meanReactionTime = validReactionTimes.length > 0
      ? validReactionTimes.reduce((sum, rt) => sum + rt, 0) / validReactionTimes.length
      : 0;

    // Simple overall score: accuracy weighted higher
    const overallScore = (accuracy * 0.7) + (Math.max(0, 1 - (meanReactionTime / 2000)) * 0.3); // Max RT 2000ms for 0 score

    const result: EmotionRecognitionResult = {
      trials,
      summary: {
        totalTrials: trials.length,
        correctResponses,
        accuracy,
        meanReactionTime: Math.round(meanReactionTime),
        overallScore: Math.max(0, Math.min(1, overallScore)), // Ensure score is between 0 and 1
      },
    };

    console.log('🧠 Emotion Recognition Test Complete:', result.summary);
    onComplete(result);
  }, [trials, onComplete, stopDetection]);

  const progress = (currentTrialIndex / totalTrials) * 100;

  const CurrentEmotionIcon = targetEmotion ? EMOTION_ICONS[targetEmotion] : Brain;

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="emotion-recognition-test">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Smile className="w-6 h-6" />
          Facial Emotion Recognition Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        {phase === 'instructions' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Smile className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">Instructions</h3>
            <div className="text-left space-y-3 bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Goal:</strong> Identify the target emotion displayed on the screen.
              </p>
              <p className="text-sm">
                You will see an emotion word. Your task is to select the corresponding emotion button as quickly and accurately as possible.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                The test will use your camera to detect your face, but your facial expressions are not being scored in this test.
              </p>
            </div>
            <Button onClick={startTest} size="lg" className="mt-4">
              Start Test
            </Button>
          </div>
        )}

        {phase === 'ready' && (
          <div className="text-center space-y-4">
            <Brain className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <h3 className="text-xl font-semibold">Get Ready!</h3>
            <p className="text-muted-foreground">Starting test shortly...</p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}

        {phase === 'testing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Trial {currentTrialIndex + 1} / {totalTrials}
              </span>
              <Progress value={progress} className="w-1/2" />
            </div>

            <div className="relative h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4">
              <p className="text-lg text-muted-foreground mb-2">Target Emotion:</p>
              <div className="text-6xl font-bold text-primary animate-in fade-in duration-200"
                   data-testid="emotion-stimulus">
                {targetEmotion.toUpperCase()}
              </div>
              <div className="mt-4">
                {feedback === 'correct' && <CheckCircle className="w-10 h-10 text-green-600" />}
                {feedback === 'incorrect' && <XCircle className="w-10 h-10 text-red-600" />}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {EMOTIONS.map((emotion) => {
                const Icon = EMOTION_ICONS[emotion];
                return (
                  <Button
                    key={emotion}
                    onClick={() => handleResponse(emotion)}
                    className="h-12 text-white font-semibold capitalize"
                    variant={selectedEmotion === emotion ? 'default' : 'outline'}
                    data-testid={`emotion-button-${emotion}`}
                  >
                    {Icon && <Icon className="w-5 h-5 mr-2" />}
                    {emotion}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
            <h3 className="text-xl font-semibold">Test Complete!</h3>
            <p className="text-muted-foreground">Analyzing your performance...</p>
            <Progress value={100} className="mt-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
