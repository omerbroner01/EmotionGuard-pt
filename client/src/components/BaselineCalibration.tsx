import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { StroopTest } from './StroopTest';
import { BiometricTracker } from './BiometricTracker';
import { useBiometrics } from '@/hooks/useBiometrics';
import type { UserBaseline, StroopTrial } from '@/types/emotionGuard';

const DEMO_USER_ID = 'demo-user';

type CalibrationPhase = 'idle' | 'instructions' | 'biometric_tracking' | 'cognitive_test' | 'processing' | 'complete';

export function BaselineCalibration() {
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<CalibrationPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [stroopResults, setStroopResults] = useState<StroopTrial[]>([]);
  const { startTracking, stopTracking, isTracking } = useBiometrics();

  // Fetch current baseline
  const { data: baseline, isLoading } = useQuery<UserBaseline | null>({
    queryKey: ['/api/baselines', DEMO_USER_ID],
  });

  // Create/update baseline mutation
  const updateBaselineMutation = useMutation({
    mutationFn: async (baselineData: {
      reactionTimeMs: number;
      reactionTimeStdDev: number;
      accuracy: number;
      accuracyStdDev: number;
      mouseStability: number;
      keystrokeRhythm: number;
    }) => {
      const response = await fetch(`/api/baselines/${DEMO_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baselineData),
      });

      if (!response.ok) {
        throw new Error('Failed to update baseline');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Baseline Updated',
        description: 'Personal calibration has been saved successfully.',
      });
      setCurrentPhase('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/baselines', DEMO_USER_ID] });
    },
    onError: (error) => {
      toast({
        title: 'Calibration Failed',
        description: error instanceof Error ? error.message : 'Failed to save baseline',
        variant: 'destructive',
      });
      setCurrentPhase('idle');
    },
  });

  const startCalibration = () => {
    setCurrentPhase('instructions');
    setProgress(10);
  };

  const startBiometricTracking = () => {
    setCurrentPhase('biometric_tracking');
    setProgress(30);
    startTracking();
    
    // Simulate biometric tracking phase
    setTimeout(() => {
      setCurrentPhase('cognitive_test');
      setProgress(50);
    }, 3000);
  };

  const handleStroopComplete = (results: StroopTrial[]) => {
    setStroopResults(results);
    setCurrentPhase('processing');
    setProgress(80);
    
    // Stop biometric tracking and calculate baseline
    const biometricData = stopTracking();
    
    // Calculate baseline metrics
    const reactionTimes = results.map(r => r.reactionTimeMs);
    const accuracy = results.filter(r => r.correct).length / results.length;
    
    const avgReactionTime = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
    const reactionTimeVariance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - avgReactionTime, 2), 0) / reactionTimes.length;
    const reactionTimeStdDev = Math.sqrt(reactionTimeVariance);
    
    // Calculate biometric baselines
    const mouseStability = biometricData.mouseMovements.length > 0 ? 
      Math.max(0, 1 - (biometricData.mouseMovements.reduce((sum, m) => sum + m, 0) / biometricData.mouseMovements.length / 100)) : 0.8;
    
    const keystrokeRhythm = biometricData.keystrokeTimings.length > 0 ?
      Math.max(0, 1 - (Math.sqrt(biometricData.keystrokeTimings.reduce((sum, t, i, arr) => {
        if (i === 0) return 0;
        return sum + Math.pow(t - arr[i-1], 2);
      }, 0) / (biometricData.keystrokeTimings.length - 1)) / 1000)) : 0.8;

    const baselineData = {
      reactionTimeMs: Math.round(avgReactionTime),
      reactionTimeStdDev: Math.round(reactionTimeStdDev),
      accuracy: Math.round(accuracy * 1000) / 1000, // 3 decimal places
      accuracyStdDev: 0.05, // Default value
      mouseStability: Math.round(mouseStability * 1000) / 1000,
      keystrokeRhythm: Math.round(keystrokeRhythm * 1000) / 1000,
    };

    setProgress(100);
    updateBaselineMutation.mutate(baselineData);
  };

  const resetCalibration = () => {
    setCurrentPhase('idle');
    setProgress(0);
    setStroopResults([]);
  };

  const formatLastCalibrated = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const renderCalibrationPhase = () => {
    switch (currentPhase) {
      case 'instructions':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📏</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Baseline Calibration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This process will establish your personal baseline for reaction time, accuracy, and behavioral patterns.
                It takes about 2-3 minutes.
              </p>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• Mouse movement and keystroke tracking</li>
                <li>• Cognitive performance tests</li>
                <li>• No personal data is stored</li>
                <li>• You can recalibrate anytime</li>
              </ul>
            </div>
            <Button onClick={startBiometricTracking} data-testid="button-start-tracking">
              Start Calibration
            </Button>
          </div>
        );

      case 'biometric_tracking':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto breathing-circle">
              <span className="text-2xl">🖱️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Behavioral Tracking</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Move your mouse naturally and type a few words. We're measuring your baseline patterns.
              </p>
            </div>
            <BiometricTracker />
            <p className="text-xs text-muted-foreground">
              Tracking will continue automatically into the next phase...
            </p>
          </div>
        );

      case 'cognitive_test':
        return (
          <div>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Cognitive Baseline</h3>
              <p className="text-sm text-muted-foreground">
                Complete this color-word test to establish your cognitive baseline
              </p>
            </div>
            <StroopTest onComplete={handleStroopComplete} />
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-chart-1 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Processing Results</h3>
              <p className="text-sm text-muted-foreground">
                Calculating your personal baseline metrics...
              </p>
            </div>
            <div className="animate-pulse">
              <div className="h-2 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-chart-1 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-chart-1">Calibration Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your personal baseline has been established and saved.
              </p>
            </div>
            <Button onClick={resetCalibration} variant="outline" data-testid="button-done">
              Done
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Baseline Calibration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Baseline Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Personal Baseline Status
            <Badge variant={baseline ? 'default' : 'secondary'} data-testid="badge-status">
              {baseline ? 'Active' : 'Not Set'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {baseline ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Last updated: <span className="font-medium">{formatLastCalibrated(baseline.lastCalibrated)}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Reaction Time</div>
                  <div className="text-sm font-medium" data-testid="metric-reactiontime">
                    {baseline.reactionTimeMs}ms ± {baseline.reactionTimeStdDev}ms
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                  <div className="text-sm font-medium" data-testid="metric-accuracy">
                    {((baseline.accuracy || 0) * 100).toFixed(1)}% ± {((baseline.accuracyStdDev || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Mouse Stability</div>
                  <div className="text-sm font-medium" data-testid="metric-mouse">
                    {((baseline.mouseStability || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Keystroke Rhythm</div>
                  <div className="text-sm font-medium" data-testid="metric-keystroke">
                    {((baseline.keystrokeRhythm || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No baseline has been established yet. Calibration improves assessment accuracy.
              </p>
              <Button onClick={startCalibration} data-testid="button-calibrate">
                Start Calibration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calibration Process */}
      {currentPhase !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Calibration Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress} className="mb-4" data-testid="progress-calibration" />
              {renderCalibrationPhase()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recalibration Options */}
      {baseline && currentPhase === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Calibration Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Regular recalibration ensures optimal assessment accuracy. Consider recalibrating if:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• You're experiencing different stress levels than usual</li>
              <li>• Your trading setup has changed (new keyboard, mouse, monitor)</li>
              <li>• It's been more than 30 days since last calibration</li>
              <li>• You feel the assessments are not accurate</li>
            </ul>
            <div className="flex space-x-2">
              <Button onClick={startCalibration} variant="outline" data-testid="button-recalibrate">
                Recalibrate Baseline
              </Button>
              <Button variant="ghost" className="text-muted-foreground" data-testid="button-history">
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
