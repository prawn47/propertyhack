# Load Tests

Stress-tests the public PropertyHack API using native Node.js fetch — no external dependencies.

## Running

Start the server first, then:

```bash
npm run test:load
```

Or point at a remote server:

```bash
BASE_URL=https://api.propertyhack.com npm run test:load
```

## Options

| Env var        | Default                  | Description                          |
|----------------|--------------------------|--------------------------------------|
| `BASE_URL`     | `http://localhost:3001`  | Target server base URL               |
| `DURATION_S`   | `15`                     | Seconds per concurrency phase        |
| `ARTICLE_SLUG` | *(auto-fetched)*         | Specific slug for article detail test|

## Test Phases

Ramps up concurrency across three phases (each `DURATION_S` seconds):

1. Warm-up — 10 concurrent users
2. Ramp — 50 concurrent users
3. Peak — 100 concurrent users

## Endpoints Tested

| Endpoint                           | Target p95 |
|------------------------------------|------------|
| `GET /api/articles`                | < 2000ms   |
| `GET /api/articles?search=...`     | < 3000ms   |
| `GET /api/articles/:slug`          | < 1000ms   |
| `GET /api/categories`              | < 500ms    |
| `GET /api/locations`               | < 500ms    |

## Reading Results

The output table shows p50 / p95 / p99 latency, throughput (req/s), and error count per endpoint. Rows marked `FAIL` exceeded their p95 target. The process exits with code 1 if any target is missed.
