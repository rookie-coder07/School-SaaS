/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || "http://localhost:5000";
const path = process.env.TARGET_PATH || "/";
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 100));
const totalRequests = Math.max(concurrency, Number(process.env.REQUESTS || 2000));
const timeoutMs = Math.max(1000, Number(process.env.TIMEOUT_MS || 10000));

const targetUrl = `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

async function hitOnce() {
  const start = nowMs();
  try {
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(timeoutMs) });
    const latency = nowMs() - start;
    return { ok: res.ok, status: res.status, latency };
  } catch (err) {
    const latency = nowMs() - start;
    return { ok: false, status: 0, latency, error: err?.message || "request failed" };
  }
}

async function worker(shared) {
  while (true) {
    const id = shared.next++;
    if (id > totalRequests) break;
    const result = await hitOnce();
    shared.results.push(result);
  }
}

async function main() {
  console.log(`Smoke load test start`);
  console.log(`Target: ${targetUrl}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Requests: ${totalRequests}`);
  console.log(`Timeout(ms): ${timeoutMs}`);

  const shared = { next: 1, results: [] };
  const startedAt = nowMs();

  await Promise.all(Array.from({ length: concurrency }, () => worker(shared)));

  const elapsedMs = Math.max(1, nowMs() - startedAt);
  const results = shared.results;
  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;
  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);

  const p = (pct) => latencies[Math.min(latencies.length - 1, Math.floor((pct / 100) * latencies.length))] || 0;
  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const rps = Math.round((results.length * 1000) / elapsedMs);

  const byStatus = results.reduce((acc, r) => {
    const key = String(r.status || "ERR");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log("\nResults");
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration(ms): ${elapsedMs}`);
  console.log(`Throughput(req/s): ${rps}`);
  console.log(`Latency avg(ms): ${avg}`);
  console.log(`Latency p50(ms): ${p(50)}`);
  console.log(`Latency p95(ms): ${p(95)}`);
  console.log(`Latency p99(ms): ${p(99)}`);
  console.log(`Status counts: ${JSON.stringify(byStatus)}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Smoke load test failed:", err);
  process.exit(1);
});
