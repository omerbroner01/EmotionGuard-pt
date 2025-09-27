import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Bell, 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  Activity,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface AlertPolicy {
  id: string;
  name: string;
  description: string;
  warningThreshold: number;
  urgentThreshold: number;
  criticalThreshold: number;
  escalationDelay: number;
  autoResolveDelay: number;
  targetRoles: string[];
  targetDesks: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AlertAnalytics {
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  avgResponseTime: number;
  resolutionRate: number;
  escalationRate: number;
  topTriggers: Array<{ trigger: string; count: number }>;
  channelEffectiveness: Record<string, { delivered: number; success_rate: number }>;
}

export default function AlertManagement() {
  const [selectedPolicy, setSelectedPolicy] = useState<AlertPolicy | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch alert policies
  const { data: policies = [], isLoading: isLoadingPolicies } = useQuery<AlertPolicy[]>({
    queryKey: ['/api/alerts/policies'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch alert analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<AlertAnalytics>({
    queryKey: ['/api/alerts/analytics'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch active alerts
  const { data: activeAlerts = [], isLoading: isLoadingActive } = useQuery<any[]>({
    queryKey: ['/api/alerts/active'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: (newPolicy: Partial<AlertPolicy>) => 
      apiRequest('POST', '/api/alerts/policies', newPolicy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/policies'] });
      setIsCreateModalOpen(false);
    }
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, ...updates }: Partial<AlertPolicy> & { id: string }) =>
      apiRequest('PUT', `/api/alerts/policies/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/policies'] });
      setIsEditModalOpen(false);
      setSelectedPolicy(null);
    }
  });

  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/alerts/policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/policies'] });
    }
  });

  // Show loading state
  if (isLoadingPolicies || isLoadingAnalytics) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="animate-pulse bg-muted h-8 w-48 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-alert-management">
            Alert Management
          </h1>
          <p className="text-muted-foreground">
            Configure stress alert policies and monitor alert effectiveness
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="button-create-policy"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Alert Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-alerts">
              {activeAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-response-time">
              {analytics ? `${Math.floor(analytics.avgResponseTime / 60)}m` : '0m'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-resolution-rate">
              {analytics ? `${Math.round(analytics.resolutionRate * 100)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-policies">
              {policies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured policies
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies" data-testid="tab-policies">Alert Policies</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active Alerts</TabsTrigger>
        </TabsList>

        {/* Alert Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Policies</CardTitle>
              <CardDescription>
                Configure stress thresholds and escalation rules for different trading scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {policies.map((policy: AlertPolicy) => (
                  <Card key={policy.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg" data-testid={`policy-name-${policy.id}`}>
                            {policy.name}
                          </CardTitle>
                          <CardDescription data-testid={`policy-description-${policy.id}`}>
                            {policy.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={policy.isActive}
                            onCheckedChange={(checked) => 
                              updatePolicyMutation.mutate({ id: policy.id, isActive: checked })
                            }
                            data-testid={`policy-active-${policy.id}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setIsEditModalOpen(true);
                            }}
                            data-testid={`button-edit-${policy.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePolicyMutation.mutate(policy.id)}
                            data-testid={`button-delete-${policy.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Threshold Indicators */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Warning</span>
                          <Badge variant="outline" data-testid={`threshold-warning-${policy.id}`}>
                            {policy.warningThreshold}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Urgent</span>
                          <Badge variant="secondary" data-testid={`threshold-urgent-${policy.id}`}>
                            {policy.urgentThreshold}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Critical</span>
                          <Badge variant="destructive" data-testid={`threshold-critical-${policy.id}`}>
                            {policy.criticalThreshold}%
                          </Badge>
                        </div>
                      </div>

                      {/* Target Roles */}
                      <div>
                        <p className="text-sm font-medium mb-2">Target Roles</p>
                        <div className="flex flex-wrap gap-1">
                          {policy.targetRoles.map((role) => (
                            <Badge key={role} variant="outline" data-testid={`role-${policy.id}-${role}`}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Escalation Settings */}
                      <div className="text-xs text-muted-foreground">
                        <p>Escalation: {Math.floor(policy.escalationDelay / 60)}m</p>
                        <p>Auto-resolve: {Math.floor(policy.autoResolveDelay / 60)}m</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Alert Distribution by Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics && Object.entries(analytics.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          severity === 'critical' ? 'destructive' :
                          severity === 'urgent' ? 'secondary' : 'outline'
                        }
                        data-testid={`severity-${severity}`}
                      >
                        {severity}
                      </Badge>
                    </div>
                    <span className="font-medium" data-testid={`count-${severity}`}>{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Channel Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics && Object.entries(analytics.channelEffectiveness).map(([channel, stats]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {channel === 'email' && <Mail className="w-4 h-4" />}
                      {channel === 'sms' && <Smartphone className="w-4 h-4" />}
                      {channel === 'webhook' && <Webhook className="w-4 h-4" />}
                      {channel === 'dashboard' && <Activity className="w-4 h-4" />}
                      <span className="capitalize" data-testid={`channel-${channel}`}>{channel}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium" data-testid={`success-rate-${channel}`}>
                        {Math.round(stats.success_rate * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`delivered-${channel}`}>
                        {stats.delivered} sent
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Triggers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Alert Triggers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.topTriggers.map((trigger, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm" data-testid={`trigger-${index}`}>{trigger.trigger}</span>
                    <Badge variant="outline" data-testid={`trigger-count-${index}`}>
                      {trigger.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Alerts</span>
                  <span className="font-medium" data-testid="total-alerts">
                    {analytics?.totalAlerts || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Escalation Rate</span>
                  <span className="font-medium" data-testid="escalation-rate">
                    {analytics ? `${Math.round(analytics.escalationRate * 100)}%` : '0%'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Unresolved alerts requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active alerts</p>
                  <p className="text-sm">All alerts have been resolved</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert: any, index: number) => (
                    <div 
                      key={alert.id}
                      className={`p-4 border rounded-lg ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                        alert.severity === 'urgent' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                              data-testid={`alert-severity-${index}`}
                            >
                              {alert.severity}
                            </Badge>
                            <span className="font-medium" data-testid={`alert-trader-${index}`}>
                              {alert.userName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Stress: {alert.stressLevel}/10
                            </span>
                          </div>
                          <p className="text-sm mb-2" data-testid={`alert-message-${index}`}>
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                            {alert.timeToEscalation && (
                              <span className="ml-2">
                                • Escalates in {Math.floor(alert.timeToEscalation / 60)}m
                              </span>
                            )}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-resolve-${index}`}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}