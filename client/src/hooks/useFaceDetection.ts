import { useState, useEffect, useCallback } from 'react';
import { faceDetectionService, type FaceMetrics, type BlinkEvent } from '@/lib/faceDetection';

export interface FaceDetectionHook {
  metrics: FaceMetrics | null;
  isActive: boolean;
  isInitialized: boolean;
  error: string | null;
  blinkHistory: BlinkEvent[];
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  clearHistory: () => void;
}

export function useFaceDetection(): FaceDetectionHook {
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blinkHistory, setBlinkHistory] = useState<BlinkEvent[]>([]);

  const updateMetrics = useCallback((newMetrics: FaceMetrics) => {
    setMetrics(newMetrics);
    setBlinkHistory(faceDetectionService.getBlinkHistory());
  }, []);

  const startDetection = useCallback(async () => {
    if (isActive) return;

    try {
      setError(null);
      
      if (!isInitialized) {
        await faceDetectionService.initialize();
        setIsInitialized(true);
      }

      faceDetectionService.startDetection(updateMetrics);
      setIsActive(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start face detection';
      setError(errorMessage);
      console.error('Face detection start error:', err);
    }
  }, [isActive, isInitialized, updateMetrics]);

  const stopDetection = useCallback(() => {
    if (!isActive) return;

    faceDetectionService.stopDetection();
    setIsActive(false);
    setMetrics(null);
  }, [isActive]);

  const clearHistory = useCallback(() => {
    faceDetectionService.clearBlinkHistory();
    setBlinkHistory([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        faceDetectionService.stopDetection();
      }
    };
  }, [isActive]);

  return {
    metrics,
    isActive,
    isInitialized,
    error,
    blinkHistory,
    startDetection,
    stopDetection,
    clearHistory
  };
}