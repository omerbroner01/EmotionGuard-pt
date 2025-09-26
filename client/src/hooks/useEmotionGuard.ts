import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { emotionGuard } from '@/lib/emotionGuardSDK';
import { useBiometrics } from './useBiometrics';
import type { OrderContext, AssessmentResult, Policy, UserBaseline } from '@/types/emotionGuard';
import type { FaceMetrics } from '@/lib/faceDetection';
import { queryClient } from '@/lib/queryClient';

export function useEmotionGuard(userId = 'demo-user') {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentResult | null>(null);
  const { startTracking, stopTracking, isTracking } = useBiometrics();

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
      stroopResults?: any[];
      stressLevel?: number;
      facialMetrics?: FaceMetrics | null;
    }) => {
      const biometricData = stopTracking();
      
      const signals = {
        mouseMovements: biometricData.mouseMovements,
        keystrokeTimings: biometricData.keystrokeTimings,
        clickLatency: biometricData.clickLatency,
        stroopTrials: data.stroopResults,
        stressLevel: data.stressLevel,
        facialMetrics: data.facialMetrics || undefined,
      };

      return emotionGuard.checkBeforeTrade(data.orderContext, signals, userId);
    },
    onSuccess: (result) => {
      setCurrentAssessment(result);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/assessments', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
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

  const startAssessment = useCallback((orderContext: OrderContext) => {
    startTracking();
    return assessmentMutation.mutateAsync({ orderContext });
  }, [startTracking, assessmentMutation]);

  const updateAssessment = useCallback(async (stroopResults?: any[], stressLevel?: number, facialMetrics?: FaceMetrics | null) => {
    if (assessmentMutation.data) {
      // For updates, we use the same order context but with new data
      const currentData = assessmentMutation.variables;
      if (currentData) {
        const result = await assessmentMutation.mutateAsync({
          ...currentData,
          stroopResults,
          stressLevel,
          facialMetrics,
        });
        // Ensure the updated assessment is set
        setCurrentAssessment(result);
        
        // If we have facial metrics, also update the assessment with them via the dedicated endpoint
        if (facialMetrics && result.assessmentId) {
          try {
            await fetch(`/api/emotion-guard/assessments/${result.assessmentId}/facial-metrics`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                facialMetrics,
              }),
            });
            console.log('✓ Facial metrics successfully updated in assessment');
          } catch (error) {
            console.error('Failed to update facial metrics:', error);
          }
        }
        
        return result;
      }
    }
  }, [assessmentMutation]);

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
    setCurrentAssessment(null);
  }, []);

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
