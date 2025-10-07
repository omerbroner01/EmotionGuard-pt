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
  server = await registerRoutes(app);
  serverInstance = server.listen(0);
});

afterAll(async () => {
  try { serverInstance && serverInstance.close(); } catch (e) { }
});

describe('Demo face detector', () => {
  it('returns detected=true and a numeric confidence for a calm scenario', async () => {
    const res = await request(serverInstance)
      .post('/api/demo/face-detector')
      .send({ facialMetrics: { isPresent: true, blinkRate: 12, eyeAspectRatio: 0.28, jawOpenness: 0.12, browFurrow: 0.12, gazeStability: 0.9 } });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('detected', true);
    expect(typeof res.body.confidence).toBe('number');
    expect(res.body.confidence).toBeGreaterThan(0);
  });

  it('returns 422 when facialMetrics missing', async () => {
    const res = await request(serverInstance)
      .post('/api/demo/face-detector')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 422 when values are outside of schema ranges', async () => {
    const res = await request(serverInstance)
      .post('/api/demo/face-detector')
      .send({ facialMetrics: { isPresent: true, blinkRate: 600, eyeAspectRatio: -5, jawOpenness: 2, browFurrow: -1, gazeStability: 5 } });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('message');
  });
});
