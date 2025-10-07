import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { registerRoutes } from '../routes';

let app: express.Express;
let server: any;
let serverInstance: any;

beforeAll(async () => {
  app = express();
  app.use(bodyParser.json());
  // register routes returns an http.Server but does not start listening.
  server = await registerRoutes(app);
  // Start the server on a random available port for isolation in tests.
  serverInstance = server.listen(0);
});

afterAll(async () => {
  try { serverInstance && serverInstance.close(); } catch (e) { /* ignore */ }
});

describe('EmotionGuard API', () => {
  it('returns pending when no signals provided (fastMode)', async () => {
    const res = await request(serverInstance)
      .post('/api/emotion-guard/check-trade')
      .send({ orderContext: { instrument: 'EUR/USD', size: 1, orderType: 'market', side: 'buy', timeOfDay: new Date().toISOString() }, fastMode: true, signals: {} });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pending', true);
    expect(res.body).toHaveProperty('assessmentId');
  });

  it('rejects facial-metrics update with missing assessmentId', async () => {
    const res = await request(serverInstance)
      .put('/api/emotion-guard/assessments/undefined/facial-metrics')
      .send({ facialMetrics: { isPresent: false, blinkRate: 0 } });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('message');
  });
});
