import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Clock, 
  Zap, 
  Eye, 
  Shield, 
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Pause
} from 'lucide-react';

// Real-time monitoring interfaces
interface LiveTraderStatus {
  userId: string;
  name: string;
  currentStress: number;
  status: 'active' | 'assessment' | 'intervention' | 'offline';
  lastUpdate: string;
  sessionDuration: number; // minutes
  assessmentCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentActivity: string;
}

interface TeamAlert {
  id: string;
  type: 'stress_spike' | 'intervention_needed' | 'recovery_completed' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  traderId: string;
  traderName: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface ActiveAssessment {
  id: string;
  userId: string;
  traderName: string;
  phase: 'biometrics' | 'cognitive' | 'self_report' | 'analysis';
  progress: number;
  startTime: string;
  estimatedCompletion: string;
  currentStress: number;
}

interface TeamMetrics {
  teamSize?: number;
  activeNow?: number;
  highStressCount?: number;
  assessmentsActive?: number;
  avgTeamStress?: number;
  interventionsToday?: number;
  alertsUnresolved?: number;
  systemHealth?: string;
}

export default function TeamMonitoring() {
  // Fetch real-time monitoring data
  const { data: liveStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/monitoring/live-status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: teamAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['/api/monitoring/team-alerts'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { data: activeAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['/api/monitoring/active-assessments'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const { data: teamMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/monitoring/team-metrics'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Use real data from API with meaningful fallbacks
  const traders: LiveTraderStatus[] = (liveStatus as LiveTraderStatus[]) || [];
  const alerts: TeamAlert[] = (teamAlerts as TeamAlert[]) || [];
  const assessments: ActiveAssessment[] = (activeAssessments as ActiveAssessment[]) || [];
  const metrics: TeamMetrics = (teamMetrics as TeamMetrics) || {};

  // Show loading state while fetching initial data
  if (isLoadingStatus || isLoadingAlerts || isLoadingAssessments || isLoadingMetrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading team monitoring data...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'assessment': return 'text-blue-600';
      case 'intervention': return 'text-yellow-600';
      case 'offline': return 'text-gray-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'assessment': return <Activity className="h-4 w-4" />;
      case 'intervention': return <Pause className="h-4 w-4" />;
      case 'offline': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stress_spike': return <TrendingUp className="h-4 w-4" />;
      case 'intervention_needed': return <AlertTriangle className="h-4 w-4" />;
      case 'recovery_completed': return <CheckCircle className="h-4 w-4" />;
      case 'system_issue': return <XCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStressLevelColor = (stress: number) => {
    if (stress <= 3) return 'text-green-600';
    if (stress <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="text-xl font-semibold text-primary cursor-pointer" data-testid="logo">EmotionGuard</div>
            </Link>
            <div className="text-sm text-muted-foreground">Real-time Team Monitoring</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live Updates</span>
            </div>
            <Badge variant="outline" data-testid="active-traders">
              {traders.filter(t => t.status === 'active').length} Active
            </Badge>
            <Link href="/admin">
              <Button variant="secondary" size="sm" data-testid="button-settings">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-card border-r border-border p-4">
          <nav className="space-y-2">
            <Link href="/">
              <div className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer" data-testid="nav-demo">
                <span className="text-sm">🎯</span>
                <span>Live Demo</span>
              </div>
            </Link>
            <Link href="/performance">
              <div className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer" data-testid="nav-performance">
                <span className="text-sm">📊</span>
                <span>Performance Analytics</span>
              </div>
            </Link>
            <Link href="/analytics">
              <div className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer" data-testid="nav-analytics">
                <span className="text-sm">🧠</span>
                <span>Stress Analytics</span>
              </div>
            </Link>
            <Link href="/monitoring">
              <span className="flex items-center space-x-3 bg-primary text-primary-foreground px-3 py-2 rounded-md cursor-pointer" data-testid="nav-monitoring">
                <span className="text-sm">👁️</span>
                <span>Team Monitoring</span>
              </span>
            </Link>
            <Link href="/admin">
              <div className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer" data-testid="nav-admin">
                <span className="text-sm">⚙️</span>
                <span>Admin Console</span>
              </div>
            </Link>
            <a href="#" className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" data-testid="nav-privacy">
              <span className="text-sm">🔒</span>
              <span>Privacy</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" data-testid="nav-audit">
              <span className="text-sm">📋</span>
              <span>Audit Logs</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground" data-testid="title-team-monitoring">
                Real-time Team Monitoring
              </h1>
              <p className="text-muted-foreground mt-2">
                Live oversight of trader stress levels, active assessments, and intervention status
              </p>
            </div>

            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold" data-testid="team-size">{metrics.teamSize || 0}</p>
                      <p className="text-sm text-muted-foreground">Team Size</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600" data-testid="active-now">{metrics.activeNow || 0}</p>
                      <p className="text-sm text-muted-foreground">Active Now</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-600" data-testid="high-stress">{metrics.highStressCount || 0}</p>
                      <p className="text-sm text-muted-foreground">High Stress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600" data-testid="assessments-active">{metrics.assessmentsActive || 0}</p>
                      <p className="text-sm text-muted-foreground">Assessments Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monitoring Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" data-testid="tab-overview">Live Overview</TabsTrigger>
                <TabsTrigger value="assessments" data-testid="tab-assessments">Active Assessments</TabsTrigger>
                <TabsTrigger value="alerts" data-testid="tab-alerts">Team Alerts</TabsTrigger>
                <TabsTrigger value="heatmap" data-testid="tab-heatmap">Stress Heatmap</TabsTrigger>
              </TabsList>

              {/* Live Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Current Team Status
                    </CardTitle>
                    <CardDescription>
                      Live view of all team members and their current stress levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {traders.map((trader, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className={getStatusColor(trader.status)}>
                                  {getStatusIcon(trader.status)}
                                </div>
                                <div>
                                  <h4 className="font-semibold" data-testid={`trader-name-${index}`}>{trader.name}</h4>
                                  <p className="text-sm text-muted-foreground" data-testid={`trader-activity-${index}`}>
                                    {trader.currentActivity}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {trader.status !== 'offline' && (
                                <>
                                  <div className="text-center">
                                    <p className={`text-lg font-bold ${getStressLevelColor(trader.currentStress)}`} data-testid={`trader-stress-${index}`}>
                                      {trader.currentStress}/10
                                    </p>
                                    <p className="text-xs text-muted-foreground">Stress</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-blue-600" data-testid={`trader-session-${index}`}>
                                      {trader.sessionDuration}m
                                    </p>
                                    <p className="text-xs text-muted-foreground">Session</p>
                                  </div>
                                </>
                              )}
                              <Badge 
                                variant={getRiskBadgeVariant(trader.riskLevel)}
                                data-testid={`trader-risk-${index}`}
                              >
                                {trader.riskLevel} risk
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Active Assessments Tab */}
              <TabsContent value="assessments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Active Stress Assessments
                    </CardTitle>
                    <CardDescription>
                      Ongoing assessments and their completion status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assessments.map((assessment, index) => {
                        const timeRemaining = new Date(assessment.estimatedCompletion).getTime() - Date.now();
                        const timeLeft = timeRemaining > 0 ? 
                          timeRemaining < 60000 ? `${Math.floor(timeRemaining / 1000)} sec` :
                          `${Math.floor(timeRemaining / 60000)} min` : 'Completing';
                        
                        return (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold" data-testid={`assessment-name-${index}`}>{assessment.traderName}</h4>
                              <p className="text-sm text-muted-foreground capitalize" data-testid={`assessment-phase-${index}`}>
                                {assessment.phase.replace('_', ' ')} Phase
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium" data-testid={`assessment-time-${index}`}>
                                {timeLeft} remaining
                              </p>
                              <p className={`text-lg font-bold ${getStressLevelColor(assessment.currentStress)}`} data-testid={`assessment-stress-${index}`}>
                                {assessment.currentStress}/10
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span data-testid={`assessment-progress-${index}`}>{assessment.progress}%</span>
                            </div>
                            <Progress value={assessment.progress} className="h-2" />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Alerts Tab */}
              <TabsContent value="alerts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Team Alerts & Notifications
                    </CardTitle>
                    <CardDescription>
                      Real-time alerts for stress spikes, interventions, and system events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {alerts.map((alert, index) => (
                        <div key={index} className={`p-4 border rounded-lg ${alert.resolved ? 'border-border bg-muted/20' : 'border-yellow-200 bg-yellow-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className={`mt-1 ${
                                alert.severity === 'critical' ? 'text-red-600' :
                                alert.severity === 'high' ? 'text-orange-600' :
                                alert.severity === 'medium' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                {getAlertIcon(alert.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold" data-testid={`alert-trader-${index}`}>{alert.traderName}</h4>
                                  <Badge 
                                    variant={
                                      alert.severity === 'critical' ? 'destructive' :
                                      alert.severity === 'high' ? 'destructive' :
                                      alert.severity === 'medium' ? 'secondary' :
                                      'outline'
                                    }
                                    data-testid={`alert-severity-${index}`}
                                  >
                                    {alert.severity}
                                  </Badge>
                                  {alert.resolved && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground" data-testid={`alert-message-${index}`}>
                                  {alert.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1" data-testid={`alert-time-${index}`}>
                                  {formatTimeAgo(alert.timestamp)}
                                </p>
                              </div>
                            </div>
                            {!alert.resolved && (
                              <Button variant="outline" size="sm" data-testid={`alert-resolve-${index}`}>
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stress Heatmap Tab */}
              <TabsContent value="heatmap" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Team Stress Distribution
                    </CardTitle>
                    <CardDescription>
                      Visual overview of current stress levels across the trading floor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Stress Distribution Summary */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 border border-green-200 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600" data-testid="low-stress-count">8</p>
                          <p className="text-sm text-green-600">Low Stress (1-3)</p>
                        </div>
                        <div className="text-center p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600" data-testid="optimal-stress-count">12</p>
                          <p className="text-sm text-yellow-600">Optimal (4-6)</p>
                        </div>
                        <div className="text-center p-4 border border-orange-200 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600" data-testid="high-stress-count">3</p>
                          <p className="text-sm text-orange-600">High (7-8)</p>
                        </div>
                        <div className="text-center p-4 border border-red-200 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600" data-testid="critical-stress-count">1</p>
                          <p className="text-sm text-red-600">Critical (9-10)</p>
                        </div>
                      </div>

                      {/* Heatmap Grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 24 }, (_, i) => {
                          const stressLevels = [4.2, 6.8, 7.4, 3.7, 5.9, 0, 5.1, 8.2, 4.6, 6.3, 3.9, 7.1, 5.4, 4.8, 6.7, 3.3, 5.8, 7.9, 4.1, 6.2, 3.6, 5.7, 8.1, 4.9];
                          const stress = stressLevels[i];
                          const isOffline = stress === 0;
                          
                          let bgColor = 'bg-gray-200';
                          if (!isOffline) {
                            if (stress <= 3) bgColor = 'bg-green-400';
                            else if (stress <= 6) bgColor = 'bg-yellow-400';
                            else if (stress <= 8) bgColor = 'bg-orange-400';
                            else bgColor = 'bg-red-400';
                          }
                          
                          return (
                            <div
                              key={i}
                              className={`aspect-square rounded-lg ${bgColor} flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity`}
                              data-testid={`heatmap-cell-${i}`}
                              title={`Trader ${i + 1}: ${isOffline ? 'Offline' : `${stress}/10 stress`}`}
                            >
                              {isOffline ? '-' : stress.toFixed(1)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center space-x-8 pt-4 border-t">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-400 rounded"></div>
                          <span className="text-sm">Low (1-3)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                          <span className="text-sm">Optimal (4-6)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-orange-400 rounded"></div>
                          <span className="text-sm">High (7-8)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-red-400 rounded"></div>
                          <span className="text-sm">Critical (9-10)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <span className="text-sm">Offline</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}