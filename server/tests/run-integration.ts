import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { registerRoutes } from '../routes';

async function run() {
  const app = express();
  app.use(bodyParser.json());
  const server = await registerRoutes(app);
  const instance = server.listen(0);
  const agent = request(instance as any);

  try {
    // check-trade pending
    const checkRes = await agent.post('/api/emotion-guard/check-trade').send({ orderContext: { instrument: 'EUR/USD', size: 1, orderType: 'market', side: 'buy', timeOfDay: new Date().toISOString() }, fastMode: true, signals: {} });
    console.log('check-trade', checkRes.status, checkRes.body);

    // facial metrics missing id
    const facialRes = await agent.put('/api/emotion-guard/assessments/undefined/facial-metrics').send({ facialMetrics: { isPresent: false, blinkRate: 0 } });
    console.log('facial-metrics', facialRes.status, facialRes.body);

    if (checkRes.status === 200 && checkRes.body.pending && facialRes.status === 422) {
      console.log('Integration OK');
      process.exit(0);
    } else {
      console.error('Integration FAILED');
      process.exit(2);
    }
  } finally {
    try { instance.close(); } catch (e) { }
  }
}

run().catch(err => { console.error(err); process.exit(2); });
