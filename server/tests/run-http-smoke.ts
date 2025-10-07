import fetch from 'node-fetch';

async function run() {
  const base = 'http://localhost:5000';
  console.log('Running HTTP smoke tests against', base);

  // check-trade pending
  const checkRes = await fetch(base + '/api/emotion-guard/check-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderContext: { instrument: 'EUR/USD', size: 1, orderType: 'market', side: 'buy', timeOfDay: new Date().toISOString() }, fastMode: true, signals: {} })
  });
  const checkBody = await checkRes.json();
  console.log('check-trade', checkRes.status, checkBody);

  // missing assessmentId facial-metrics
  const facialRes = await fetch(base + '/api/emotion-guard/assessments/undefined/facial-metrics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facialMetrics: { isPresent: false, blinkRate: 0 } })
  });
  const facialBody = await facialRes.json();
  console.log('facial-metrics', facialRes.status, facialBody);

  if (checkRes.status === 200 && checkBody.pending && facialRes.status === 422) {
    console.log('SMOKE OK');
    process.exit(0);
  } else {
    console.error('SMOKE FAILED');
    process.exit(2);
  }
}

run().catch(err => { console.error(err); process.exit(2); });
