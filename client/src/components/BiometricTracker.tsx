import { useEffect, useState } from 'react';
import { useBiometrics } from '@/hooks/useBiometrics';
import { BiometricTracker as BiometricTrackerLib } from '@/lib/biometrics';

export function BiometricTracker() {
  const { isTracking } = useBiometrics();
  const [mouseStatus, setMouseStatus] = useState('Tracking...');
  const [timingStatus, setTimingStatus] = useState('Normal');
  const [contextStatus, setContextStatus] = useState('Analyzing');

  useEffect(() => {
    if (!isTracking) return;

    // Simulate status updates
    const interval = setInterval(() => {
      setMouseStatus(prev => {
        const statuses = ['Tracking...', 'Normal', 'Elevated'];
        const currentIndex = statuses.indexOf(prev);
        return statuses[(currentIndex + 1) % statuses.length];
      });

      setTimingStatus(prev => {
        const statuses = ['Normal', 'Elevated', 'Stable'];
        const currentIndex = statuses.indexOf(prev);
        return statuses[(currentIndex + 1) % statuses.length];
      });

      setContextStatus(prev => {
        const statuses = ['Analyzing', 'High Risk', 'Normal'];
        const currentIndex = statuses.indexOf(prev);
        return statuses[(currentIndex + 1) % statuses.length];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isTracking]);

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-muted rounded-lg p-3">
        <div className="text-xs text-muted-foreground">Mouse</div>
        <div className="text-sm font-medium" data-testid="status-mouse">{mouseStatus}</div>
      </div>
      <div className="bg-muted rounded-lg p-3">
        <div className="text-xs text-muted-foreground">Timing</div>
        <div className="text-sm font-medium" data-testid="status-timing">{timingStatus}</div>
      </div>
      <div className="bg-muted rounded-lg p-3">
        <div className="text-xs text-muted-foreground">Context</div>
        <div className="text-sm font-medium" data-testid="status-context">{contextStatus}</div>
      </div>
    </div>
  );
}
