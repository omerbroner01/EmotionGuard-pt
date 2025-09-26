import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { PreTradeGate } from '@/components/PreTradeGate';
import { useEmotionGuard } from '@/hooks/useEmotionGuard';
import type { OrderContext } from '@/types/emotionGuard';

export default function Dashboard() {
  const [showPreTradeGate, setShowPreTradeGate] = useState(false);
  const [orderAction, setOrderAction] = useState<'buy' | 'sell'>('buy');
  const [orderSize, setOrderSize] = useState('100000');
  const [selectedInstrument, setSelectedInstrument] = useState('EUR/USD');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  
  const { 
    startAssessment, 
    resetAssessment, 
    currentAssessment, 
    updateAssessment, 
    completeCooldown, 
    saveJournal, 
    recordTradeOutcome,
    submitOverride,
    isAssessing
  } = useEmotionGuard();

  const handleTradeClick = async (side: 'buy' | 'sell') => {
    console.log('🔄 handleTradeClick called with side:', side);
    setOrderAction(side);
    
    const orderContext: OrderContext = {
      instrument: selectedInstrument,
      size: parseInt(orderSize),
      orderType,
      side,
      leverage: 1,
      currentPnL: -1247.15, // Demo negative P&L to trigger higher risk
      recentLosses: 2,
      timeOfDay: new Date().toISOString(),
      marketVolatility: 0.6,
    };

    console.log('🔄 Opening PreTradeGate modal');
    setShowPreTradeGate(true);
    
    try {
      console.log('🔄 Calling startAssessment with:', orderContext);
      await startAssessment(orderContext);
      console.log('✅ startAssessment completed successfully');
    } catch (error) {
      console.error('❌ Assessment failed:', error);
      setShowPreTradeGate(false);
    }
  };

  const handleCloseGate = () => {
    setShowPreTradeGate(false);
    resetAssessment();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-xl font-semibold text-primary" data-testid="logo">EmotionGuard</div>
            <div className="text-sm text-muted-foreground">Pre-Trade Stress Detection</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-chart-1 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">System Online</span>
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
              <span className="flex items-center space-x-3 bg-primary text-primary-foreground px-3 py-2 rounded-md cursor-pointer" data-testid="nav-demo">
                <span className="text-sm">🎯</span>
                <span>Live Demo</span>
              </span>
            </Link>
            <Link href="/admin">
              <div className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer" data-testid="nav-admin">
                <span className="text-sm">⚙️</span>
                <span>Admin Console</span>
              </div>
            </Link>
            <a href="#" className="flex items-center space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition" data-testid="nav-analytics">
              <span className="text-sm">📊</span>
              <span>Analytics</span>
            </a>
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
          {/* Trading Interface Demo */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Simulated Trading Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Market Data */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Market Data</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>EUR/USD</span>
                      <Badge variant="secondary" className="text-chart-1" data-testid="price-eurusd">1.0842 ↑</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>GBP/USD</span>
                      <Badge variant="secondary" className="text-chart-3" data-testid="price-gbpusd">1.2651 ↓</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>USD/JPY</span>
                      <Badge variant="secondary" className="text-chart-1" data-testid="price-usdjpy">149.32 ↑</Badge>
                    </div>
                  </div>
                </div>

                {/* Order Ticket */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Order Ticket</h3>
                  <div className="space-y-3">
                    <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                      <SelectTrigger data-testid="select-instrument">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                        <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                        <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        type="text" 
                        placeholder="Size" 
                        value={orderSize}
                        onChange={(e) => setOrderSize(e.target.value)}
                        data-testid="input-size"
                      />
                      <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                        <SelectTrigger data-testid="select-ordertype">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market">Market</SelectItem>
                          <SelectItem value="limit">Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-chart-1 text-background hover:bg-chart-1/90"
                        onClick={() => handleTradeClick('buy')}
                        data-testid="button-buy"
                      >
                        BUY
                      </Button>
                      <Button 
                        className="bg-chart-3 text-background hover:bg-chart-3/90"
                        onClick={() => handleTradeClick('sell')}
                        data-testid="button-sell"
                      >
                        SELL
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Account</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Balance</span>
                      <span data-testid="text-balance">$50,284.32</span>
                    </div>
                    <div className="flex justify-between">
                      <span>P&L Today</span>
                      <span className="text-chart-3" data-testid="text-pnl">-$1,247.15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Open Positions</span>
                      <span data-testid="text-positions">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">System Status</p>
                    <p className="text-lg font-semibold text-chart-1" data-testid="status-system">Online</p>
                  </div>
                  <div className="w-3 h-3 bg-chart-1 rounded-full pulse-dot"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-lg font-semibold" data-testid="status-response">1.2s</p>
                  <p className="text-xs text-chart-1">Within target</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Assessments</p>
                  <p className="text-lg font-semibold" data-testid="status-assessments">247</p>
                  <p className="text-xs text-muted-foreground">4.2% trigger rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Block Rate</p>
                  <p className="text-lg font-semibold" data-testid="status-blocks">1.1%</p>
                  <p className="text-xs text-chart-3">↓ 0.2% vs yesterday</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Pre-Trade Gate Modal */}
      {showPreTradeGate && (
        <PreTradeGate
          onClose={handleCloseGate}
          orderAction={orderAction}
          orderContext={{
            instrument: selectedInstrument,
            size: parseInt(orderSize),
            orderType,
            side: orderAction,
          }}
          currentAssessment={currentAssessment}
          updateAssessment={updateAssessment}
          completeCooldown={completeCooldown}
          saveJournal={saveJournal}
          recordTradeOutcome={recordTradeOutcome}
          submitOverride={submitOverride}
          isAssessing={isAssessing}
          resetAssessment={resetAssessment}
        />
      )}
    </div>
  );
}
