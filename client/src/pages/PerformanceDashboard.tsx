import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, TrendingDown, Activity, Target, Zap, AlertTriangle, BarChart3, Calendar, Users, Gauge } from 'lucide-react';

// Performance metrics interfaces
interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  stressImpactScore: number;
  optimalStressRange: [number, number];
}

interface StressPerformanceCorrelation {
  stressLevel: number;
  winRate: number;
  averageReturn: number;
  tradeCount: number;
  confidence: number;
}

interface TradingSession {
  id: string;
  date: string;
  duration: number;
  trades: number;
  pnl: number;
  avgStress: number;
  maxStress: number;
  assessments: number;
  interventionsUsed: number;
}

interface TeamPerformanceOverview {
  totalTraders: number;
  activeTraders: number;
  avgTeamStress: number;
  teamWinRate: number;
  stressReductionAchieved: number;
  interventionSuccessRate: number;
}

export default function PerformanceDashboard() {
  // Fetch performance data
  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/performance/metrics'],
  });

  const { data: correlations, isLoading: correlationsLoading } = useQuery<StressPerformanceCorrelation[]>({
    queryKey: ['/api/performance/stress-correlations'],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<TradingSession[]>({
    queryKey: ['/api/performance/sessions'],
  });

  const { data: teamOverview, isLoading: teamLoading } = useQuery<TeamPerformanceOverview>({
    queryKey: ['/api/performance/team-overview'],
  });

  if (metricsLoading || correlationsLoading || sessionsLoading || teamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance analytics...</p>
        </div>
      </div>
    );
  }

  // Mock data for compelling demo (in production this would come from API)
  const mockMetrics: PerformanceMetrics = {
    totalTrades: 847,
    winRate: 68.5,
    averageReturn: 2.3,
    sharpeRatio: 1.85,
    maxDrawdown: -12.4,
    stressImpactScore: 78,
    optimalStressRange: [3, 6]
  };

  const mockCorrelations: StressPerformanceCorrelation[] = [
    { stressLevel: 1, winRate: 45.2, averageReturn: 0.8, tradeCount: 23, confidence: 0.6 },
    { stressLevel: 2, winRate: 58.7, averageReturn: 1.4, tradeCount: 67, confidence: 0.8 },
    { stressLevel: 3, winRate: 71.3, averageReturn: 2.1, tradeCount: 124, confidence: 0.9 },
    { stressLevel: 4, winRate: 76.8, averageReturn: 2.7, tradeCount: 198, confidence: 0.95 },
    { stressLevel: 5, winRate: 79.2, averageReturn: 3.1, tradeCount: 203, confidence: 0.95 },
    { stressLevel: 6, winRate: 75.4, averageReturn: 2.8, tradeCount: 156, confidence: 0.9 },
    { stressLevel: 7, winRate: 62.1, averageReturn: 1.9, tradeCount: 98, confidence: 0.85 },
    { stressLevel: 8, winRate: 48.3, averageReturn: 0.7, tradeCount: 67, confidence: 0.8 },
    { stressLevel: 9, winRate: 32.6, averageReturn: -0.4, tradeCount: 34, confidence: 0.7 },
    { stressLevel: 10, winRate: 21.8, averageReturn: -1.2, tradeCount: 18, confidence: 0.6 }
  ];

  const mockSessions: TradingSession[] = [
    { id: '1', date: '2025-09-27', duration: 480, trades: 23, pnl: 4780, avgStress: 4.2, maxStress: 7, assessments: 12, interventionsUsed: 3 },
    { id: '2', date: '2025-09-26', duration: 420, trades: 18, pnl: 2340, avgStress: 5.1, maxStress: 8, assessments: 15, interventionsUsed: 5 },
    { id: '3', date: '2025-09-25', duration: 360, trades: 15, pnl: -890, avgStress: 6.8, maxStress: 9, assessments: 18, interventionsUsed: 8 },
    { id: '4', date: '2025-09-24', duration: 450, trades: 21, pnl: 3210, avgStress: 3.9, maxStress: 6, assessments: 11, interventionsUsed: 2 },
    { id: '5', date: '2025-09-23', duration: 390, trades: 19, pnl: 1560, avgStress: 4.7, maxStress: 7, assessments: 14, interventionsUsed: 4 }
  ];

  const mockTeamOverview: TeamPerformanceOverview = {
    totalTraders: 24,
    activeTraders: 18,
    avgTeamStress: 4.3,
    teamWinRate: 71.2,
    stressReductionAchieved: 23.5,
    interventionSuccessRate: 84.2
  };

  const getStressLevelColor = (stress: number) => {
    if (stress <= 3) return 'text-green-600';
    if (stress <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (value: number, isPositive = true) => {
    const positive = isPositive ? value > 0 : value < 0;
    return positive ? 'text-green-600' : 'text-red-600';
  };

  const optimalStressData = mockCorrelations.filter(c => 
    c.stressLevel >= mockMetrics.optimalStressRange[0] && 
    c.stressLevel <= mockMetrics.optimalStressRange[1]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-performance-dashboard">Trading Performance Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive stress-performance correlation analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-export-report">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" data-testid="button-schedule-review">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Review
          </Button>
        </div>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Traders</p>
                <p className="text-2xl font-bold" data-testid="metric-active-traders">{mockTeamOverview.activeTraders}/{mockTeamOverview.totalTraders}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Team utilization: {Math.round((mockTeamOverview.activeTraders / mockTeamOverview.totalTraders) * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Win Rate</p>
                <p className="text-2xl font-bold text-green-600" data-testid="metric-team-winrate">{mockTeamOverview.teamWinRate}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">+5.2% from last month</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Team Stress</p>
                <p className={`text-2xl font-bold ${getStressLevelColor(mockTeamOverview.avgTeamStress)}`} data-testid="metric-team-stress">
                  {mockTeamOverview.avgTeamStress}/10
                </p>
              </div>
              <Gauge className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-green-600">-{mockTeamOverview.stressReductionAchieved}% stress reduction</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Intervention Success</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="metric-intervention-success">{mockTeamOverview.interventionSuccessRate}%</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">AI recommendations effectiveness</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="correlations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="correlations" data-testid="tab-correlations">Stress Correlations</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">Session Analysis</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Stress-Performance Correlations */}
        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stress Level vs Trading Performance</CardTitle>
              <CardDescription>
                Analysis shows optimal performance at stress levels {mockMetrics.optimalStressRange[0]}-{mockMetrics.optimalStressRange[1]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCorrelations.map((correlation, index) => {
                  const isOptimal = correlation.stressLevel >= mockMetrics.optimalStressRange[0] && 
                                   correlation.stressLevel <= mockMetrics.optimalStressRange[1];
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${isOptimal ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-16 text-center">
                          <Badge variant={isOptimal ? "default" : "secondary"} data-testid={`stress-level-${correlation.stressLevel}`}>
                            Stress {correlation.stressLevel}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-sm text-muted-foreground">Win Rate</p>
                              <p className={`font-bold ${getPerformanceColor(correlation.winRate - 50)}`} data-testid={`winrate-${correlation.stressLevel}`}>
                                {correlation.winRate.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Return</p>
                              <p className={`font-bold ${getPerformanceColor(correlation.averageReturn)}`} data-testid={`return-${correlation.stressLevel}`}>
                                {correlation.averageReturn > 0 ? '+' : ''}{correlation.averageReturn.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Trades</p>
                              <p className="font-bold" data-testid={`trades-${correlation.stressLevel}`}>{correlation.tradeCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Confidence</p>
                              <Progress value={correlation.confidence * 100} className="w-16" />
                            </div>
                          </div>
                        </div>
                      </div>
                      {isOptimal && (
                        <Badge variant="default" className="bg-green-600">Optimal Zone</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Analysis */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trading Sessions</CardTitle>
              <CardDescription>Performance breakdown by trading session with stress correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="font-medium" data-testid={`session-date-${session.id}`}>{session.date}</p>
                        <p className="text-sm text-muted-foreground">{Math.round(session.duration / 60)}h {session.duration % 60}m</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">P&L</p>
                        <p className={`font-bold ${getPerformanceColor(session.pnl)}`} data-testid={`session-pnl-${session.id}`}>
                          ${session.pnl > 0 ? '+' : ''}{session.pnl.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Trades</p>
                        <p className="font-bold" data-testid={`session-trades-${session.id}`}>{session.trades}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Stress</p>
                        <p className={`font-bold ${getStressLevelColor(session.avgStress)}`} data-testid={`session-avgstress-${session.id}`}>
                          {session.avgStress}/10
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Max Stress</p>
                        <p className={`font-bold ${getStressLevelColor(session.maxStress)}`} data-testid={`session-maxstress-${session.id}`}>
                          {session.maxStress}/10
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Interventions</p>
                        <p className="font-bold text-blue-600" data-testid={`session-interventions-${session.id}`}>{session.interventionsUsed}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.avgStress >= mockMetrics.optimalStressRange[0] && session.avgStress <= mockMetrics.optimalStressRange[1] ? (
                        <Badge variant="default" className="bg-green-600">Optimal</Badge>
                      ) : session.avgStress > mockMetrics.optimalStressRange[1] ? (
                        <Badge variant="destructive">High Stress</Badge>
                      ) : (
                        <Badge variant="secondary">Low Stress</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Overall Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-green-600" data-testid="metric-overall-winrate">{mockMetrics.winRate}%</p>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Based on {mockMetrics.totalTrades} trades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Average Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-green-600" data-testid="metric-avg-return">+{mockMetrics.averageReturn}%</p>
                  <ArrowUpIcon className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Per trade average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-blue-600" data-testid="metric-sharpe-ratio">{mockMetrics.sharpeRatio}</p>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Risk-adjusted returns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-red-600" data-testid="metric-max-drawdown">{mockMetrics.maxDrawdown}%</p>
                  <ArrowDownIcon className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Maximum loss from peak</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Stress Impact Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-orange-600" data-testid="metric-stress-impact">{mockMetrics.stressImpactScore}/100</p>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Stress management effectiveness</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Optimal Stress Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-green-600" data-testid="metric-optimal-range">
                    {mockMetrics.optimalStressRange[0]}-{mockMetrics.optimalStressRange[1]}
                  </p>
                  <Gauge className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Peak performance zone</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Optimal Performance Zone</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your peak performance occurs at stress levels {mockMetrics.optimalStressRange[0]}-{mockMetrics.optimalStressRange[1]}, 
                    with {optimalStressData.reduce((avg, d) => avg + d.winRate, 0) / optimalStressData.length}% average win rate.
                  </p>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Stress Management Impact</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    EmotionGuard interventions have improved your stress control by {mockTeamOverview.stressReductionAchieved}%, 
                    leading to more consistent trading performance.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Trading Pattern Analysis</p>
                  <p className="text-sm text-blue-700 mt-1">
                    High-stress sessions (7+) show {mockCorrelations.find(c => c.stressLevel === 7)?.averageReturn.toFixed(1)}% returns vs. 
                    {mockCorrelations.find(c => c.stressLevel === 5)?.averageReturn.toFixed(1)}% in optimal range.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Implement Pre-Trade Stress Checks</p>
                      <p className="text-sm text-muted-foreground">
                        Use EmotionGuard before high-stakes trades to maintain optimal stress levels.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Schedule Stress Breaks</p>
                      <p className="text-sm text-muted-foreground">
                        Take 5-minute breaks when stress exceeds level 6 to maintain performance.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Focus on Session Planning</p>
                      <p className="text-sm text-muted-foreground">
                        Sessions with pre-planned strategies show 15% better stress management.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Team Benchmarking</p>
                      <p className="text-sm text-muted-foreground">
                        Your team outperforms industry average by 12% in stress-managed scenarios.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}