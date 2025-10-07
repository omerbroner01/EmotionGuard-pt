import { useState, useEffect, useCallback } from 'react';
import { faceDetectionService, type FaceMetrics, type BlinkEvent, type FaceDetectionSettings } from '@/lib/faceDetection';

export interface FaceDetectionHook {
  metrics: FaceMetrics | null;
  isActive: boolean;
  isInitialized: boolean;
  error: string | null;
  blinkHistory: BlinkEvent[];
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<FaceDetectionSettings>) => void;
  settings: FaceDetectionSettings;
}

export function useFaceDetection(): FaceDetectionHook {
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blinkHistory, setBlinkHistory] = useState<BlinkEvent[]>([]);
  const [settings, setSettings] = useState<FaceDetectionSettings>(faceDetectionService.getSettings());

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

  const updateSettings = useCallback((partial: Partial<FaceDetectionSettings>) => {
    faceDetectionService.setSettings(partial);
    setSettings(faceDetectionService.getSettings());
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
    clearHistory,
    updateSettings,
    settings,
  };
}