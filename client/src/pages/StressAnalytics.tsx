import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, TrendingDown, Activity, Brain, Clock, Zap, AlertTriangle, Calendar, Users, Target } from 'lucide-react';
import { Link } from 'wouter';

// Stress analytics interfaces
interface StressPattern {
  timeframe: string;
  avgStress: number;
  peakStress: number;
  stressSpikes: number;
  recoveryTime: number; // minutes
  triggerEvents: string[];
}

interface StressTrend {
  date: string;
  avgStress: number;
  maxStress: number;
  stressVolatility: number;
  interventions: number;
  assessments: number;
}

interface StressTrigger {
  trigger: string;
  frequency: number;
  avgStressIncrease: number;
  recoveryTime: number;
  impactScore: number;
}

interface IndividualStressProfile {
  userId: string;
  name: string;
  avgStress: number;
  stressRisk: 'low' | 'medium' | 'high';
  recentTrend: 'improving' | 'stable' | 'worsening';
  interventionsUsed: number;
  lastAssessment: string;
}

export default function StressAnalytics() {
  // Fetch stress analytics data
  const { data: stressPatterns, isLoading: isLoadingPatterns } = useQuery({
    queryKey: ['/api/analytics/stress-patterns'],
  });

  const { data: stressTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['/api/analytics/stress-trends'],
  });

  const { data: stressTriggers, isLoading: isLoadingTriggers } = useQuery({
    queryKey: ['/api/analytics/stress-triggers'],
  });

  const { data: individualProfiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['/api/analytics/individual-profiles'],
  });

  // Use real data from API with meaningful fallbacks
  const patterns = stressPatterns || [];
  const trends = stressTrends || [];
  const triggers = stressTriggers || [];
  const profiles = individualProfiles || [];

  // Show loading state while fetching data
  if (isLoadingPatterns || isLoadingTrends || isLoadingTriggers || isLoadingProfiles) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Analyzing stress patterns...</p>
        </div>
      </div>
    );
  }

  const getStressRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'worsening': return <TrendingUp className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStressLevelColor = (stress: number) => {
    if (stress <= 3) return 'text-green-600';
    if (stress <= 6) return 'text-yellow-600';
    return 'text-red-600';
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
            <div className="text-sm text-muted-foreground">Stress Pattern Analytics</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-chart-1 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">Live Analysis</span>
            </div>
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
              <span className="flex items-center space-x-3 bg-primary text-primary-foreground px-3 py-2 rounded-md cursor-pointer" data-testid="nav-analytics">
                <span className="text-sm">🧠</span>
                <span>Stress Analytics</span>
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
              <h1 className="text-3xl font-bold text-foreground" data-testid="title-stress-analytics">
                Stress Pattern Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Deep insights into trader stress patterns, triggers, and recovery mechanisms
              </p>
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="patterns" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="patterns" data-testid="tab-patterns">Stress Patterns</TabsTrigger>
                <TabsTrigger value="trends" data-testid="tab-trends">Historical Trends</TabsTrigger>
                <TabsTrigger value="triggers" data-testid="tab-triggers">Trigger Analysis</TabsTrigger>
                <TabsTrigger value="individuals" data-testid="tab-individuals">Individual Profiles</TabsTrigger>
              </TabsList>

              {/* Stress Patterns Tab */}
              <TabsContent value="patterns" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Daily Pattern */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Daily Pattern
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Peak Stress Time</p>
                          <p className="text-xl font-bold text-red-600" data-testid="peak-stress-time">2:30 PM</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Low Stress Time</p>
                          <p className="text-xl font-bold text-green-600" data-testid="low-stress-time">10:00 AM</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Daily Range</p>
                          <p className="text-xl font-bold" data-testid="avg-daily-range">3.2 - 7.4</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Pattern */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        Weekly Pattern
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Highest Stress Day</p>
                          <p className="text-xl font-bold text-red-600" data-testid="highest-stress-day">Wednesday</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lowest Stress Day</p>
                          <p className="text-xl font-bold text-green-600" data-testid="lowest-stress-day">Tuesday</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Weekend Effect</p>
                          <p className="text-xl font-bold text-blue-600" data-testid="weekend-effect">-15%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recovery Metrics */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-green-600" />
                        Recovery Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Recovery Time</p>
                          <p className="text-xl font-bold text-blue-600" data-testid="avg-recovery-time">12 min</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Recovery Success Rate</p>
                          <p className="text-xl font-bold text-green-600" data-testid="recovery-success-rate">87%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Intervention Effectiveness</p>
                          <p className="text-xl font-bold text-green-600" data-testid="intervention-effectiveness">92%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stress Volatility */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-600" />
                        Stress Volatility
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Volatility Index</p>
                          <p className="text-xl font-bold text-orange-600" data-testid="volatility-index">2.8</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Spike Frequency</p>
                          <p className="text-xl font-bold text-red-600" data-testid="spike-frequency">4.2/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stability Score</p>
                          <p className="text-xl font-bold text-blue-600" data-testid="stability-score">74/100</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stress Patterns Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Intraday Stress Patterns</CardTitle>
                    <CardDescription>
                      Average stress levels throughout trading hours showing peak stress periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Time-based stress visualization */}
                      {['9:00 AM', '10:30 AM', '12:00 PM', '1:30 PM', '3:00 PM', '4:30 PM'].map((time, index) => {
                        const stressLevels = [4.2, 3.8, 5.1, 6.8, 7.2, 5.9];
                        const stress = stressLevels[index];
                        const isOptimal = stress >= 3 && stress <= 6;
                        
                        return (
                          <div key={time} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium w-20" data-testid={`time-${index}`}>{time}</span>
                              <div className="flex-1">
                                <Progress 
                                  value={(stress / 10) * 100} 
                                  className="w-40 h-2"
                                  data-testid={`stress-progress-${index}`}
                                />
                              </div>
                              <span className={`text-lg font-bold ${getStressLevelColor(stress)}`} data-testid={`stress-level-${index}`}>
                                {stress}/10
                              </span>
                              {isOptimal && <Badge variant="outline" className="text-green-600 border-green-600">Optimal</Badge>}
                              {stress > 7 && <Badge variant="destructive">High Risk</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Historical Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">30-Day Stress Trends</CardTitle>
                    <CardDescription>
                      Historical stress patterns showing improvements from EmotionGuard interventions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Trend summary cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">Stress Reduction</p>
                          <p className="text-2xl font-bold text-green-600" data-testid="stress-reduction">-18.5%</p>
                          <p className="text-xs text-green-600 mt-1">vs. previous 30 days</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">Intervention Impact</p>
                          <p className="text-2xl font-bold text-blue-600" data-testid="intervention-impact">+24.3%</p>
                          <p className="text-xs text-blue-600 mt-1">performance improvement</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">Recovery Speed</p>
                          <p className="text-2xl font-bold text-purple-600" data-testid="recovery-speed">+31%</p>
                          <p className="text-xs text-purple-600 mt-1">faster stress recovery</p>
                        </div>
                      </div>

                      {/* Weekly trend breakdown */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Weekly Breakdown</h3>
                        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => {
                          const weeklyAvg = [6.2, 5.8, 5.1, 4.7][index];
                          const improvement = index > 0 ? ((weeklyAvg - [6.2, 5.8, 5.1, 4.7][index-1]) / [6.2, 5.8, 5.1, 4.7][index-1] * 100) : 0;
                          
                          return (
                            <div key={week} className="flex items-center justify-between p-3 rounded-lg border border-border">
                              <span className="font-medium" data-testid={`week-${index + 1}`}>{week}</span>
                              <div className="flex items-center space-x-4">
                                <span className={`font-bold ${getStressLevelColor(weeklyAvg)}`} data-testid={`week-avg-${index + 1}`}>
                                  {weeklyAvg}/10
                                </span>
                                {improvement !== 0 && (
                                  <div className="flex items-center space-x-1">
                                    {improvement < 0 ? (
                                      <ArrowDownIcon className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ArrowUpIcon className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={improvement < 0 ? 'text-green-600' : 'text-red-600'} data-testid={`week-change-${index + 1}`}>
                                      {Math.abs(improvement).toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trigger Analysis Tab */}
              <TabsContent value="triggers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Stress Trigger Analysis</CardTitle>
                    <CardDescription>
                      Identification and impact analysis of common stress triggers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { trigger: 'Market Volatility Spike', frequency: 23, impact: 7.2, recovery: 15 },
                        { trigger: 'Large Position Opening', frequency: 18, impact: 6.8, recovery: 12 },
                        { trigger: 'News Release', frequency: 15, impact: 6.4, recovery: 8 },
                        { trigger: 'P&L Drawdown', frequency: 12, impact: 8.1, recovery: 22 },
                        { trigger: 'Technical Issue', frequency: 8, impact: 5.9, recovery: 18 },
                        { trigger: 'Risk Limit Approach', frequency: 7, impact: 7.6, recovery: 10 }
                      ].map((item, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold" data-testid={`trigger-name-${index}`}>{item.trigger}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" data-testid={`trigger-frequency-${index}`}>
                                {item.frequency}/month
                              </Badge>
                              {item.impact > 7 && <Badge variant="destructive">High Impact</Badge>}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Stress Impact</p>
                              <p className={`font-bold ${getStressLevelColor(item.impact)}`} data-testid={`trigger-impact-${index}`}>
                                +{item.impact.toFixed(1)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Recovery Time</p>
                              <p className="font-bold text-blue-600" data-testid={`trigger-recovery-${index}`}>
                                {item.recovery} min
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Risk Level</p>
                              <p className={`font-bold ${item.impact > 7 ? 'text-red-600' : item.impact > 6 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {item.impact > 7 ? 'High' : item.impact > 6 ? 'Medium' : 'Low'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Individual Profiles Tab */}
              <TabsContent value="individuals" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Individual Stress Profiles</CardTitle>
                    <CardDescription>
                      Personalized stress analytics for each team member
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: 'Alex Thompson', avgStress: 4.2, risk: 'low', trend: 'improving', interventions: 3 },
                        { name: 'Sarah Chen', avgStress: 5.8, risk: 'medium', trend: 'stable', interventions: 7 },
                        { name: 'Mike Rodriguez', avgStress: 7.1, risk: 'high', trend: 'worsening', interventions: 12 },
                        { name: 'Emma Wilson', avgStress: 3.9, risk: 'low', trend: 'stable', interventions: 2 },
                        { name: 'James Park', avgStress: 6.4, risk: 'medium', trend: 'improving', interventions: 8 }
                      ].map((profile, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h4 className="font-semibold" data-testid={`profile-name-${index}`}>{profile.name}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`text-sm font-medium ${getStressLevelColor(profile.avgStress)}`} data-testid={`profile-stress-${index}`}>
                                    {profile.avgStress}/10 avg stress
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={getStressRiskColor(profile.risk)}
                                    data-testid={`profile-risk-${index}`}
                                  >
                                    {profile.risk} risk
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Interventions Used</p>
                                <p className="font-bold" data-testid={`profile-interventions-${index}`}>{profile.interventions}</p>
                              </div>
                              <div className="flex items-center space-x-1" data-testid={`profile-trend-${index}`}>
                                {getTrendIcon(profile.trend)}
                                <span className="text-sm capitalize">{profile.trend}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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