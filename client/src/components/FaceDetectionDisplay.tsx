import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Camera, CameraOff, Eye, User } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import type { FaceMetrics } from '@/lib/faceDetection';

interface FaceDetectionDisplayProps {
  onMetricsUpdate?: (metrics: FaceMetrics) => void;
  autoStart?: boolean;
}

export function FaceDetectionDisplay({ onMetricsUpdate, autoStart = false }: FaceDetectionDisplayProps) {
  const { 
    metrics, 
    isActive, 
    isInitialized, 
    error, 
    blinkHistory, 
    startDetection, 
    stopDetection, 
    clearHistory 
  } = useFaceDetection();
  
  const [sessionDuration, setSessionDuration] = useState(0);

  // Update parent component with metrics
  useEffect(() => {
    if (metrics && onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isActive && !error) {
      startDetection();
    }
  }, [autoStart, isActive, error, startDetection]);

  // Track session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const handleToggleDetection = async () => {
    if (isActive) {
      stopDetection();
    } else {
      await startDetection();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStressLevel = (metrics: FaceMetrics): 'low' | 'medium' | 'high' => {
    if (!metrics.isPresent) return 'low';
    
    const blinkRateScore = metrics.blinkRate > 25 ? 1 : metrics.blinkRate > 15 ? 0.5 : 0;
    const browFurrowScore = metrics.browFurrow > 0.6 ? 1 : metrics.browFurrow > 0.3 ? 0.5 : 0;
    const gazeScore = metrics.gazeStability < 0.5 ? 1 : metrics.gazeStability < 0.8 ? 0.5 : 0;
    
    const totalScore = (blinkRateScore + browFurrowScore + gazeScore) / 3;
    
    if (totalScore > 0.6) return 'high';
    if (totalScore > 0.3) return 'medium';
    return 'low';
  };

  const getStressColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'bg-chart-1 text-white';
      case 'medium': return 'bg-chart-5 text-white';
      case 'high': return 'bg-chart-3 text-white';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Facial Analysis</span>
          </div>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleDetection}
            disabled={!isInitialized && !error}
            data-testid="button-toggle-face-detection"
          >
            {isActive ? (
              <>
                <CameraOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isActive && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Session Duration: {formatDuration(sessionDuration)}</span>
            <span>Blinks Recorded: {blinkHistory.length}</span>
          </div>
        )}

        {metrics ? (
          <div className="space-y-4">
            {/* Presence & Overall Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Face Present</span>
              </div>
              <Badge 
                variant={metrics.isPresent ? "default" : "secondary"}
                data-testid="badge-face-present"
              >
                {metrics.isPresent ? "Yes" : "No"}
              </Badge>
            </div>

            {metrics.isPresent && (
              <>
                {/* Stress Level Indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Stress Level</span>
                  <Badge 
                    className={getStressColor(getStressLevel(metrics))}
                    data-testid="badge-stress-level"
                  >
                    {getStressLevel(metrics).toUpperCase()}
                  </Badge>
                </div>

                {/* Detailed Metrics */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Blink Rate</span>
                      <span data-testid="text-blink-rate">{metrics.blinkRate}/min</span>
                    </div>
                    <Progress 
                      value={Math.min((metrics.blinkRate / 60) * 100, 100)} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Normal: 12-20/min
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Brow Tension</span>
                      <span data-testid="text-brow-furrow">{Math.round(metrics.browFurrow * 100)}%</span>
                    </div>
                    <Progress 
                      value={metrics.browFurrow * 100} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Gaze Stability</span>
                      <span data-testid="text-gaze-stability">{Math.round(metrics.gazeStability * 100)}%</span>
                    </div>
                    <Progress 
                      value={metrics.gazeStability * 100} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Eye Openness</span>
                      <span data-testid="text-eye-openness">{Math.round(metrics.eyeAspectRatio * 100)}%</span>
                    </div>
                    <Progress 
                      value={metrics.eyeAspectRatio * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : isActive ? (
          <div className="text-center text-muted-foreground py-4">
            <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p>Analyzing facial features...</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <CameraOff className="w-8 h-8 mx-auto mb-2" />
            <p>Click Start to begin facial analysis</p>
          </div>
        )}

        {isActive && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="flex-1"
              data-testid="button-clear-history"
            >
              Clear History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}