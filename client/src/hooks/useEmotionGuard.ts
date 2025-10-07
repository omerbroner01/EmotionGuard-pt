import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { emotionGuard } from '@/lib/emotionGuardSDK';
import { useBiometrics } from './useBiometrics';
import type { OrderContext, AssessmentResult, Policy, UserBaseline } from '@/types/emotionGuard';
import type { FaceMetrics } from '@/lib/faceDetection';
import { queryClient } from '@/lib/queryClient';

export function useEmotionGuard(userId = 'demo-user') {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentResult | null>(null);
  
  // Debug currentAssessment changes
  const originalSetCurrentAssessment = setCurrentAssessment;
  const debugSetCurrentAssessment = useCallback((newAssessment: AssessmentResult | null) => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('setCurrentAssessment:', { newAssessment, prev: currentAssessment });
    }
    originalSetCurrentAssessment(newAssessment);
  }, [currentAssessment, originalSetCurrentAssessment]);
  const { startTracking, stopTracking, convertToBasicFormat, isTracking } = useBiometrics();

  // Get user baseline
  const { data: baseline } = useQuery<UserBaseline | null>({
    queryKey: ['/api/baselines', userId],
    enabled: !!userId,
  });

  // Get default policy
  const { data: policy } = useQuery<Policy>({
    queryKey: ['/api/policies/default'],
  });

  // Pre-trade assessment mutation
  const assessmentMutation = useMutation({
    mutationFn: async (data: {
      orderContext: OrderContext;
      fastMode?: boolean;
      stroopResults?: any[];
      cognitiveResults?: any[];
      stressLevel?: number;
      facialMetrics?: FaceMetrics | null;
    }) => {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('assessmentMutation.mutationFn', data);
      const rawBiometricData = stopTracking();
      const biometricData = convertToBasicFormat(rawBiometricData);
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('biometric data', biometricData);
      
      const signals = {
        mouseMovements: biometricData.mouseMovements,
        keystrokeTimings: biometricData.keystrokeTimings,
        clickLatency: biometricData.clickLatency,
        stroopTrials: data.stroopResults,
        cognitiveResults: data.cognitiveResults,
        stressLevel: data.stressLevel,
        facialMetrics: data.facialMetrics || undefined,
      };

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('calling checkBeforeTrade', signals);
      const result = await emotionGuard.checkBeforeTrade(data.orderContext, signals, userId, data.fastMode);
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('checkBeforeTrade result', result);
      return result;
    },
    onSuccess: (result) => {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('assessment onSuccess', result);
      // The server may return a lightweight pending response when running in fastMode
      // and no signals were provided. Normalize that into a currentAssessment object
      // the UI can consume safely.
      if (result && (result as any).pending) {
        debugSetCurrentAssessment({
          assessmentId: (result as any).assessmentId,
          pending: true,
        } as any);
      } else {
        debugSetCurrentAssessment(result as any);
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/assessments', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    },
    onError: (error) => {
      console.error('assessment onError', error);
    },
  });

  // Cooldown completion mutation
  const cooldownMutation = useMutation({
    mutationFn: async ({ assessmentId, durationMs }: { assessmentId: string; durationMs: number }) => {
      return emotionGuard.recordCooldownCompletion(assessmentId, durationMs);
    },
  });

  // Journal entry mutation
  const journalMutation = useMutation({
    mutationFn: async (data: {
      assessmentId: string;
      trigger: string;
      plan: string;
      entry?: string;
    }) => {
      return emotionGuard.saveJournalEntry(data.assessmentId, data.trigger, data.plan, data.entry);
    },
  });

  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ assessmentId, reason }: { assessmentId: string; reason: string }) => {
      return emotionGuard.submitOverride(assessmentId, reason, userId);
    },
  });

  // Trade outcome mutation
  const tradeOutcomeMutation = useMutation({
    mutationFn: async (data: {
      assessmentId: string;
      outcome: {
        executed: boolean;
        pnl?: number;
        duration?: number;
        maxFavorableExcursion?: number;
        maxAdverseExcursion?: number;
      };
    }) => {
      return emotionGuard.recordTradeOutcome(data.assessmentId, data.outcome);
    },
  });

  const startAssessment = useCallback(async (orderContext: OrderContext) => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('startAssessment', orderContext);
    // First, create a placeholder assessment (so components can safely push metrics)
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('creating placeholder assessment');
    try {
      const placeholderResult = await emotionGuard.checkBeforeTrade(orderContext, {}, userId, true);
      if (placeholderResult && (placeholderResult as any).pending) {
        debugSetCurrentAssessment({ assessmentId: (placeholderResult as any).assessmentId, pending: true } as any);
      }
    } catch (e) {
      console.warn('Failed to create placeholder assessment, proceeding to start tracking anyway', e);
    }

    // Now start biometric tracking and perform the full assessment mutate (which will stop tracking internally)
    startTracking();
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('calling mutateAsync');

    const result = await assessmentMutation.mutateAsync({ 
      orderContext,
      fastMode: true // Enable fast mode for B2B demo performance
    });

    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('assessment completed');
    return result;
  }, [startTracking, assessmentMutation]);

  const updateAssessment = useCallback(async (stroopResults?: any[], stressLevel?: number, facialMetrics?: FaceMetrics | null, cognitiveResults?: any[]) => {
    // Use the current assessment that was created by startAssessment
    if (!currentAssessment) {
      console.error('No current assessment to update');
      return null;
    }

    // Guard: avoid calling the server with a missing assessmentId (client observed
    // requests like /assessments/undefined). If we don't have a valid id yet, let
    // the caller know and allow retry later.
    const assessmentId = (currentAssessment as any).assessmentId;
    if (!assessmentId) {
      console.warn('Attempted to update assessment but assessmentId is missing. Will not call server.');
      return currentAssessment;
    }

    try {
      // If we have any data to update (facial metrics, stress level, or cognitive results), send it to the backend
      if (facialMetrics || stressLevel !== undefined || cognitiveResults) {
        const updateData: any = {};
        if (facialMetrics) {
          updateData.facialMetrics = facialMetrics;
        }
        if (stressLevel !== undefined) {
          updateData.stressLevel = stressLevel;
        }
        if (cognitiveResults && cognitiveResults.length > 0) {
          updateData.cognitiveResults = cognitiveResults;
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('including cognitive results', cognitiveResults.length);
        }
        
        await fetch(`/api/emotion-guard/assessments/${assessmentId}/facial-metrics`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('assessment updated', updateData);
      }

      // Fetch the updated assessment to get the latest data including calculated scores
  const response = await fetch(`/api/emotion-guard/assessments/${assessmentId}`);
      if (response.ok) {
        const updatedAssessment = await response.json();
        // Transform the database assessment object to match AssessmentResult interface
        const transformedAssessment: any = {
          assessmentId: updatedAssessment.id,
          riskScore: typeof updatedAssessment.riskScore === 'number' ? updatedAssessment.riskScore : undefined,
          verdict: updatedAssessment.verdict,
          reasonTags: updatedAssessment.reasonTags || [],
          confidence: updatedAssessment.confidence || 0,
          recommendedAction: currentAssessment?.recommendedAction || 'Continue with assessment',
          cooldownDuration: updatedAssessment.cooldownDurationMs,
          pending: updatedAssessment.riskScore === null || updatedAssessment.riskScore === undefined,
        };
        debugSetCurrentAssessment(transformedAssessment);
        return transformedAssessment;
      } else {
        console.error('Failed to fetch updated assessment');
        return currentAssessment; // Return original if fetch fails
      }
    } catch (error) {
      console.error('Failed to update assessment:', error);
      return currentAssessment; // Return original if update fails
    }
  }, [currentAssessment]);

  const completeCooldown = useCallback((durationMs: number) => {
    if (currentAssessment) {
      return cooldownMutation.mutateAsync({
        assessmentId: currentAssessment.assessmentId,
        durationMs,
      });
    }
  }, [currentAssessment, cooldownMutation]);

  const saveJournal = useCallback((trigger: string, plan: string, entry?: string) => {
    if (currentAssessment) {
      return journalMutation.mutateAsync({
        assessmentId: currentAssessment.assessmentId,
        trigger,
        plan,
        entry,
      });
    }
  }, [currentAssessment, journalMutation]);

  const submitOverride = useCallback((reason: string) => {
    if (currentAssessment) {
      return overrideMutation.mutateAsync({
        assessmentId: currentAssessment.assessmentId,
        reason,
      });
    }
  }, [currentAssessment, overrideMutation]);

  const recordTradeOutcome = useCallback((outcome: any) => {
    if (currentAssessment) {
      return tradeOutcomeMutation.mutateAsync({
        assessmentId: currentAssessment.assessmentId,
        outcome,
      });
    }
  }, [currentAssessment, tradeOutcomeMutation]);

  const resetAssessment = useCallback(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG) console.log('resetAssessment');
    debugSetCurrentAssessment(null);
  }, [debugSetCurrentAssessment]);

  return {
    // State
    currentAssessment,
    baseline,
    policy,
    isTracking,
    
    // Actions
    startAssessment,
    updateAssessment,
    completeCooldown,
    saveJournal,
    submitOverride,
    recordTradeOutcome,
    resetAssessment,
    
    // Loading states
    isAssessing: assessmentMutation.isPending,
    isSavingCooldown: cooldownMutation.isPending,
    isSavingJournal: journalMutation.isPending,
    isSubmittingOverride: overrideMutation.isPending,
    isRecordingOutcome: tradeOutcomeMutation.isPending,
    
    // Errors
    assessmentError: assessmentMutation.error,
    cooldownError: cooldownMutation.error,
    journalError: journalMutation.error,
    overrideError: overrideMutation.error,
    outcomeError: tradeOutcomeMutation.error,
  };
}
