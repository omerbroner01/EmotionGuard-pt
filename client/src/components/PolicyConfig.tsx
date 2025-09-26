import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Policy } from '@/types/emotionGuard';

export function PolicyConfig() {
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current policy
  const { data: policy, isLoading } = useQuery<Policy>({
    queryKey: ['/api/policies/default'],
  });

  // Local state for form
  const [formData, setFormData] = useState<Partial<Policy>>({});

  // Update local state when policy loads
  useState(() => {
    if (policy && Object.keys(formData).length === 0) {
      setFormData(policy);
    }
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async (updates: Partial<Policy>) => {
      if (!policy) throw new Error('No policy loaded');
      
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update policy');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Policy Updated',
        description: 'Configuration has been saved successfully.',
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/policies/default'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update policy',
        variant: 'destructive',
      });
    },
  });

  const handleFieldChange = (field: keyof Policy, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleModeChange = (mode: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabledModes: {
        ...prev.enabledModes,
        [mode]: enabled,
      },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updatePolicyMutation.mutate(formData);
  };

  const handleReset = () => {
    if (policy) {
      setFormData(policy);
      setIsDirty(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Policy Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strictness">Strictness Level</Label>
              <Select 
                value={formData.strictnessLevel} 
                onValueChange={(value) => handleFieldChange('strictnessLevel', value)}
              >
                <SelectTrigger data-testid="select-strictness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lenient">Lenient (Low intervention)</SelectItem>
                  <SelectItem value="standard">Standard (Balanced)</SelectItem>
                  <SelectItem value="strict">Strict (High intervention)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Policy Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Policy name"
                data-testid="input-policyname"
              />
            </div>
          </div>

          <Separator />

          {/* Risk Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="threshold">Risk Threshold (0-100)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={formData.riskThreshold || 65}
                onChange={(e) => handleFieldChange('riskThreshold', parseInt(e.target.value))}
                data-testid="input-threshold"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Scores above this trigger intervention
              </p>
            </div>

            <div>
              <Label htmlFor="cooldown">Cooldown Duration (seconds)</Label>
              <Select 
                value={formData.cooldownDuration?.toString()} 
                onValueChange={(value) => handleFieldChange('cooldownDuration', parseInt(value))}
              >
                <SelectTrigger data-testid="select-cooldown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                  <SelectItem value="120">120 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Assessment Modes */}
          <div>
            <Label className="text-base font-medium">Assessment Modes</Label>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cognitive">Cognitive interference test</Label>
                  <p className="text-xs text-muted-foreground">Stroop-like color-word tasks</p>
                </div>
                <Switch
                  id="cognitive"
                  checked={formData.enabledModes?.cognitiveTest ?? true}
                  onCheckedChange={(checked) => handleModeChange('cognitiveTest', checked)}
                  data-testid="switch-cognitive"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="biometrics">Behavioral biometrics</Label>
                  <p className="text-xs text-muted-foreground">Mouse and keystroke patterns</p>
                </div>
                <Switch
                  id="biometrics"
                  checked={formData.enabledModes?.behavioralBiometrics ?? true}
                  onCheckedChange={(checked) => handleModeChange('behavioralBiometrics', checked)}
                  data-testid="switch-biometrics"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="selfreport">Self-report stress scale</Label>
                  <p className="text-xs text-muted-foreground">0-10 subjective stress rating</p>
                </div>
                <Switch
                  id="selfreport"
                  checked={formData.enabledModes?.selfReport ?? true}
                  onCheckedChange={(checked) => handleModeChange('selfReport', checked)}
                  data-testid="switch-selfreport"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="voice">Voice prosody analysis</Label>
                  <p className="text-xs text-muted-foreground">Stress detection from speech patterns</p>
                </div>
                <Switch
                  id="voice"
                  checked={formData.enabledModes?.voiceProsody ?? false}
                  onCheckedChange={(checked) => handleModeChange('voiceProsody', checked)}
                  data-testid="switch-voice"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="facial">Facial expression detection</Label>
                  <p className="text-xs text-muted-foreground">Computer vision stress indicators</p>
                </div>
                <Switch
                  id="facial"
                  checked={formData.enabledModes?.facialExpression ?? false}
                  onCheckedChange={(checked) => handleModeChange('facialExpression', checked)}
                  data-testid="switch-facial"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Override Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="override">Allow Override</Label>
                <p className="text-xs text-muted-foreground">Traders can bypass blocks with justification</p>
              </div>
              <Switch
                id="override"
                checked={formData.overrideAllowed ?? true}
                onCheckedChange={(checked) => handleFieldChange('overrideAllowed', checked)}
                data-testid="switch-override"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify">Supervisor Notification</Label>
                <p className="text-xs text-muted-foreground">Alert supervisors when overrides are used</p>
              </div>
              <Switch
                id="notify"
                checked={formData.supervisorNotification ?? true}
                onCheckedChange={(checked) => handleFieldChange('supervisorNotification', checked)}
                data-testid="switch-notify"
              />
            </div>
          </div>

          <Separator />

          {/* Data Retention */}
          <div>
            <Label htmlFor="retention">Data Retention (days)</Label>
            <Select 
              value={formData.dataRetentionDays?.toString()} 
              onValueChange={(value) => handleFieldChange('dataRetentionDays', parseInt(value))}
            >
              <SelectTrigger data-testid="select-retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days (Minimal)</SelectItem>
                <SelectItem value="30">30 days (Standard)</SelectItem>
                <SelectItem value="90">90 days (Extended)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!isDirty}
              data-testid="button-reset"
            >
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isDirty || updatePolicyMutation.isPending}
              data-testid="button-save"
            >
              {updatePolicyMutation.isPending ? 'Saving...' : 'Save Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-chart-1">✓</span>
            <span>Privacy-First Design</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• No raw audio/video storage</li>
            <li>• Ephemeral processing only</li>
            <li>• On-device feature extraction</li>
            <li>• PII auto-redaction</li>
            <li>• GDPR/CCPA compliance built-in</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
