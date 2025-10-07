import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { registerRoutes } from '../routes';

async function run() {
  const app = express();
  app.use(bodyParser.json());
  const server = await registerRoutes(app);

  // Start listening explicitly on port 5000 for the quick tests
  await new Promise<void>((resolve) => {
    server.listen(5000, '127.0.0.1', () => resolve());
  });

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

    const assessmentId = body1.assessmentId;

    // Now attempt to update the placeholder with valid facial metrics and a stress level
    const updateRes = await fetch(base + `/api/emotion-guard/assessments/${assessmentId}/facial-metrics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facialMetrics: { isPresent: true, blinkRate: 15, eyeAspectRatio: 0.25, jawOpenness: 0.1, browFurrow: 0.2, gazeStability: 0.8 }, stressLevel: 5 })
    });
    const updateBody = await updateRes.json();
    console.log('update placeholder status', updateRes.status, updateBody);

    // Fetch assessment to see what's stored
    const getRes = await fetch(base + `/api/emotion-guard/assessments/${assessmentId}`);
    const getBody = await getRes.json();
    console.log('fetched assessment', getRes.status, getBody && { id: getBody.id, riskScore: getBody.riskScore, verdict: getBody.verdict });

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
