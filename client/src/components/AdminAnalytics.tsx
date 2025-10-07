import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import type { AnalyticsStats, RealTimeEvent } from '@/types/emotionGuard';

interface AdminAnalyticsProps {
  stats?: AnalyticsStats;
  recentEvents?: RealTimeEvent[];
  isLoading: boolean;
  lastMessage?: any;
}

export function AdminAnalytics({ stats, recentEvents, isLoading, lastMessage }: AdminAnalyticsProps) {
  const [liveEvents, setLiveEvents] = useState<RealTimeEvent[]>(recentEvents || []);

  useEffect(() => {
    if (lastMessage && lastMessage.type) {
      // Create a mock real-time event from WebSocket message
      const newEvent: RealTimeEvent = {
        id: Date.now().toString(),
        eventType: lastMessage.type,
        userId: lastMessage.data?.userId,
        assessmentId: lastMessage.data?.assessmentId,
        data: lastMessage.data,
        processed: false,
        createdAt: new Date().toISOString(),
      };
      
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    }
  }, [lastMessage]);

  useEffect(() => {
    if (recentEvents) {
      setLiveEvents(recentEvents);
    }
  }, [recentEvents]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'verdict_rendered':
      case 'assessment_completed':
        return '🎯';
      case 'override_used':
        return '⚠️';
      case 'cooldown_completed':
        return '🧘';
      case 'policy_updated':
        return '⚙️';
      default:
        return '📊';
    }
  };

  const getEventColor = (eventType: string, data?: any) => {
    if (eventType === 'override_used') return 'bg-chart-3';
    if (eventType === 'verdict_rendered' && data?.verdict === 'block') return 'bg-chart-3';
    if (eventType === 'verdict_rendered' && data?.verdict === 'hold') return 'bg-accent';
    return 'bg-chart-1';
  };

  const formatEventDescription = (event: RealTimeEvent) => {
    switch (event.eventType) {
      case 'verdict_rendered':
      case 'assessment_completed':
        return `${event.data?.verdict || 'Unknown'} - Risk score: ${event.data?.riskScore || 'N/A'}`;
      case 'override_used':
        return 'Override used - Supervisor notified';
      case 'cooldown_completed':
        return 'Breathing exercise completed';
      case 'policy_updated':
        return 'Policy configuration updated';
      default:
        return event.eventType.replace('_', ' ');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Real-time Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Avg Response Time</div>
                <div className="text-lg font-semibold" data-testid="metric-responsetime">1.2s</div>
                <div className="text-xs text-chart-1">0.1s faster</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Avg Risk Score</div>
                <div className="text-lg font-semibold" data-testid="metric-avgrisk">
                  {typeof stats?.averageRiskScore === 'number' ? Number(stats.averageRiskScore).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Within normal range</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Pass Rate</span>
                  <span className="text-sm font-medium">
                    {stats ? (100 - stats.blockRate - (stats.triggerRate * 0.6)).toFixed(1) : 'N/A'}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div 
                    className="bg-chart-1 h-2 rounded-full" 
                    style={{ width: `${stats ? (100 - stats.blockRate - (stats.triggerRate * 0.6)) : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Hold Rate</span>
                  <span className="text-sm font-medium">
                    {stats ? (stats.triggerRate * 0.6).toFixed(1) : 'N/A'}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full" 
                    style={{ width: `${stats ? (stats.triggerRate * 0.6) : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Block Rate</span>
                  <span className="text-sm font-medium">
                    {typeof stats?.blockRate === 'number' ? stats.blockRate.toFixed(1) : 'N/A'}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div 
                    className="bg-chart-3 h-2 rounded-full" 
                    style={{ width: `${stats?.blockRate || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Real-time Events
            <Badge variant="secondary" className="pulse-dot">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {liveEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent events
              </div>
            ) : (
              liveEvents.slice(0, 10).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between py-2 px-3 bg-muted rounded-md smooth-transition"
                  data-testid={`event-${event.eventType}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${getEventColor(event.eventType, event.data)}`}></div>
                    <div>
                      <div className="text-sm font-medium flex items-center space-x-2">
                        <span>{getEventIcon(event.eventType)}</span>
                        <span>
                          {event.userId ? `Trader #${event.userId.slice(-4)}` : 'System'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatEventDescription(event)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(event.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
