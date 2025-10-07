import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { registerRoutes } from '../routes.js';

async function run() {
  const app = express();
  app.use(bodyParser.json());
  const server = await registerRoutes(app);

  // Allow some time for server to start
  await new Promise(r => setTimeout(r, 200));

  const base = 'http://localhost:5000';
  let failed = false;

  try {
    const res1 = await fetch(base + '/api/emotion-guard/check-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderContext: { instrument: 'EUR/USD', size: 1, orderType: 'market', side: 'buy', timeOfDay: new Date().toISOString() }, fastMode: true, signals: {} })
    });
    const body1 = await res1.json();
    console.log('check-trade status', res1.status, 'body', body1);
    if (res1.status !== 200 || body1.pending !== true) {
      console.error('check-trade test failed');
      failed = true;
    }

    const res2 = await fetch(base + '/api/emotion-guard/assessments/undefined/facial-metrics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facialMetrics: { isPresent: false, blinkRate: 0 } })
    });
    const body2 = await res2.json();
    console.log('facial-metrics status', res2.status, 'body', body2);
    if (res2.status !== 422) {
      console.error('facial-metrics missing id test failed');
      failed = true;
    }
  } catch (err) {
    console.error('Test runner error', err);
    failed = true;
  } finally {
    try { server.close(); } catch (e) {}
    process.exit(failed ? 1 : 0);
  }
}

run();
