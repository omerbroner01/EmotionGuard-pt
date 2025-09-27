import { useState, useCallback } from 'react';
import { BiometricTracker, BiometricData } from '@/lib/biometrics';
import { AdvancedBiometricTracker, AdvancedBiometricData } from '@/lib/advancedBiometrics';

interface BiometricsConfig {
  useAdvanced?: boolean;
  enablePatternAnalysis?: boolean;
}

export function useBiometrics(config: BiometricsConfig = {}) {
  const { useAdvanced = true, enablePatternAnalysis = true } = config;
  
  const [basicTracker] = useState(() => new BiometricTracker());
  const [advancedTracker] = useState(() => new AdvancedBiometricTracker());
  const [isTracking, setIsTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState<'basic' | 'advanced'>('basic');

  const startTracking = useCallback((mode: 'basic' | 'advanced' = useAdvanced ? 'advanced' : 'basic') => {
    if (!isTracking) {
      console.log(`🔬 Starting ${mode} biometric tracking...`);
      setTrackingMode(mode);
      
      if (mode === 'advanced') {
        advancedTracker.start();
      } else {
        basicTracker.start();
      }
      setIsTracking(true);
    }
  }, [basicTracker, advancedTracker, isTracking, useAdvanced]);

  const stopTracking = useCallback((): BiometricData | AdvancedBiometricData => {
    if (isTracking) {
      let data: BiometricData | AdvancedBiometricData;
      
      if (trackingMode === 'advanced') {
        console.log('🔬 Stopping advanced biometric tracking...');
        data = advancedTracker.stop();
        
        // Log analysis results for debugging
        const advancedData = data as AdvancedBiometricData;
        console.log(`🔬 Advanced analysis complete: 
          Mouse Events: ${advancedData.rawMetrics.totalMouseEvents}
          Key Events: ${advancedData.rawMetrics.totalKeyEvents}
          Stress Indicators: Stability=${advancedData.analysis.stressIndicators.mouseStability.toFixed(2)}, Tremors=${advancedData.analysis.stressIndicators.microTremors.toFixed(2)}
          Confidence: ${(advancedData.analysis.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('🔬 Stopping basic biometric tracking...');
        data = basicTracker.stop();
      }
      
      setIsTracking(false);
      return data;
    }
    
    // Return empty basic data for backward compatibility
    return {
      mouseMovements: [],
      keystrokeTimings: [],
    };
  }, [basicTracker, advancedTracker, isTracking, trackingMode]);

  const convertToBasicFormat = useCallback((data: BiometricData | AdvancedBiometricData): BiometricData => {
    // Check if it's already basic format
    if ('mouseMovements' in data && 'keystrokeTimings' in data && !('mousePatterns' in data)) {
      return data as BiometricData;
    }
    
    // Convert advanced data to basic format for backward compatibility
    const advancedData = data as AdvancedBiometricData;
    
    return {
      mouseMovements: advancedData.mousePatterns.map(pattern => pattern.velocity),
      keystrokeTimings: advancedData.keystrokeDynamics.map(key => key.dwellTime),
      clickLatency: advancedData.mousePatterns.find(p => p.pressure > 0.8)?.timestamp
    };
  }, []);

  const getAnalysisMetrics = useCallback(() => {
    if (!isTracking || trackingMode !== 'advanced') {
      return null;
    }
    
    // Return real-time analysis metrics if needed
    return {
      confidence: 0.7, // Would need to implement real-time analysis
      samplingRate: 60,
      dataQuality: 'good'
    };
  }, [isTracking, trackingMode]);

  return {
    startTracking,
    stopTracking,
    convertToBasicFormat,
    getAnalysisMetrics,
    isTracking,
    trackingMode,
    isAdvancedMode: trackingMode === 'advanced'
  };
}
