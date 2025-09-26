import { useState, useCallback } from 'react';
import { BiometricTracker, BiometricData } from '@/lib/biometrics';

export function useBiometrics() {
  const [tracker] = useState(() => new BiometricTracker());
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = useCallback(() => {
    if (!isTracking) {
      tracker.start();
      setIsTracking(true);
    }
  }, [tracker, isTracking]);

  const stopTracking = useCallback((): BiometricData => {
    if (isTracking) {
      const data = tracker.stop();
      setIsTracking(false);
      return data;
    }
    return {
      mouseMovements: [],
      keystrokeTimings: [],
    };
  }, [tracker, isTracking]);

  return {
    startTracking,
    stopTracking,
    isTracking,
  };
}
