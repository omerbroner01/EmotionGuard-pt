import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { PolicyConfig } from '@/components/PolicyConfig';
import { AdminAnalytics } from '@/components/AdminAnalytics';
import { BaselineCalibration } from '@/components/BaselineCalibration';
import { FaceDetectionDisplay } from '@/components/FaceDetectionDisplay';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { AnalyticsStats, RealTimeEvent } from '@/types/emotionGuard';

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState('analytics');
  const { isConnected, lastMessage } = useWebSocket();

  // Fetch analytics stats
  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsStats>({
    queryKey: ['/api/analytics/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent events
  const { data: recentEvents, isLoading: eventsLoading } = useQuery<RealTimeEvent[]>({
    queryKey: ['/api/analytics/recent-events'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="text-xl font-semibold text-primary cursor-pointer" data-testid="logo">
                EmotionGuard
              </div>
            </Link>
            <div className="text-sm text-muted-foreground">Admin Console</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-chart-1 pulse-dot' : 'bg-chart-3'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm" data-testid="button-demo">
                Back to Demo
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
            <Link href="/admin">
              <div className="flex items-center space-x-3 bg-primary text-primary-foreground px-3 py-2 rounded-md cursor-pointer" data-testid="nav-admin">
                <span className="text-sm">⚙️</span>
                <span>Admin Console</span>
              </div>
            </Link>
            <a 
              href="#" 
              onClick={() => setActiveTab('analytics')}
              className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" 
              data-testid="nav-analytics"
            >
              <span className="text-sm">📊</span>
              <span>Analytics</span>
            </a>
            <a 
              href="#" 
              onClick={() => setActiveTab('policies')}
              className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" 
              data-testid="nav-policies"
            >
              <span className="text-sm">🔒</span>
              <span>Policies</span>
            </a>
            <a 
              href="#" 
              onClick={() => setActiveTab('baselines')}
              className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" 
              data-testid="nav-baselines"
            >
              <span className="text-sm">📋</span>
              <span>Baselines</span>
            </a>
            <a 
              href="#" 
              onClick={() => setActiveTab('biometrics')}
              className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" 
              data-testid="nav-biometrics"
            >
              <span className="text-sm">📹</span>
              <span>Biometrics</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assessments</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">
                    {statsLoading ? '...' : stats?.totalAssessments || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gate Trigger Rate</p>
                  <p className="text-2xl font-bold text-accent" data-testid="stat-trigger">
                    {statsLoading ? '...' : `${(stats?.triggerRate || 0).toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-chart-1">↑ 0.3% vs yesterday</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Block Rate</p>
                  <p className="text-2xl font-bold text-chart-3" data-testid="stat-block">
                    {statsLoading ? '...' : `${(stats?.blockRate || 0).toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-chart-1">↓ 0.2% vs yesterday</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Override Rate</p>
                  <p className="text-2xl font-bold" data-testid="stat-override">
                    {statsLoading ? '...' : `${(stats?.overrideRate || 0).toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">Within normal range</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Admin Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
              <TabsTrigger value="policies" data-testid="tab-policies">Policies</TabsTrigger>
              <TabsTrigger value="baselines" data-testid="tab-baselines">Baselines</TabsTrigger>
              <TabsTrigger value="biometrics" data-testid="tab-biometrics">Biometrics</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              <AdminAnalytics 
                stats={stats}
                recentEvents={recentEvents}
                isLoading={statsLoading || eventsLoading}
                lastMessage={lastMessage}
              />
            </TabsContent>

            <TabsContent value="policies" className="space-y-6">
              <PolicyConfig />
            </TabsContent>

            <TabsContent value="baselines" className="space-y-6">
              <BaselineCalibration />
            </TabsContent>

            <TabsContent value="biometrics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Facial Detection System</CardTitle>
                  <CardDescription>
                    Enhanced biometric monitoring using facial detection for stress analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Live Facial Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Real-time monitoring of facial stress indicators including blink rate, 
                        attention tracking, and micro-expression analysis for enhanced emotional state detection.
                      </p>
                      <FaceDetectionDisplay />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Enhanced Features</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">Blink Rate Monitoring</span>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">Attention Tracking</span>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">Micro-expression Analysis</span>
                          <span className="text-xs text-blue-600 font-medium">Coming Soon</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">Eye Movement Tracking</span>
                          <span className="text-xs text-blue-600 font-medium">Coming Soon</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Privacy & Security</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-green-600 text-xl mb-2">🔒</div>
                        <p className="text-sm font-medium">Local Processing</p>
                        <p className="text-xs text-muted-foreground">All facial data processed client-side</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="text-blue-600 text-xl mb-2">🚫</div>
                        <p className="text-sm font-medium">No Video Storage</p>
                        <p className="text-xs text-muted-foreground">Raw video never saved or transmitted</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-purple-600 text-xl mb-2">📊</div>
                        <p className="text-sm font-medium">Metrics Only</p>
                        <p className="text-xs text-muted-foreground">Only stress indicators are analyzed</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
