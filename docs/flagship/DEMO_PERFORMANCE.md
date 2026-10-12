# Bounded public demo read measurement — #15

Ticket: [Measure bounded public demo read performance](https://github.com/EPraz/keelwatch/issues/15).

## Budget chosen before the public run

Use one Demo Auditor session and the existing public API. Concurrency is **1**,
with at most **30 HTTP attempts**, a **180-second** whole-run deadline and a
**60-second** per-request deadline. Six bootstrap requests inspect liveness,
readiness, demo availability, issuance, the authorized profile and Crew registry.
Six passes then read Fleet, Aurora's Compliance, Crew composition and Maintenance
orders: 24 scenario samples, with 250 ms between scenario requests. There are no
retries and no operational writes; the only POST issues a temporary demo session.
If a deadline or bootstrap failure stops the run, report attempted and unattempted
requests and preserve each failure. No numeric performance target is implied.

The default target is `https://keelwatch-api.onrender.com/api/v1`; the SPA is
`https://keelwatch-chi.vercel.app`. The owner reports the existing free API hosting
on Render and PostgreSQL on Neon Free. Vercel serves the SPA. No hosting dashboard
credential is used and actual instance regions or hardware are not inferred.

## Repeat the scenario

With Node.js 24+ and the seeded Aurora workspace available:

```sh
npm run measure:demo
```

For a JSON artifact without npm's command banner:

```sh
node scripts/demo-performance.mjs > measurement.json
```

The chosen budget is printed to stderr before HTTP starts; the sanitized report
goes to stdout. Exit status is nonzero for a failed or incomplete run. The command
does not load `.env`, accept an existing token or persist its issued credential.
Do not schedule it, continuously poll readiness or repeatedly issue sessions.
Each run consumes one attempt from the existing issuance quota, while it consumes
no operational write quota. The health queries can wake the API/database.

Optional `--role manager` selects the other fixed account and still performs only
operational reads. `--rounds` accepts 1–6; `--duration-ms` accepts 1–180000 and
`--request-timeout-ms` accepts 1–60000. These can reduce the budget. No concurrency
or unlimited-load option exists. `--api-base` accepts an HTTPS API base ending in
`/api/v1`, or HTTP on loopback for the approved synthetic-server tests; credentials,
query strings, fragments and redirects are rejected.

## Method and dataset

Each sample uses the monotonic `performance.now()` clock from immediately before
`fetch` until the complete response body is received. It includes client network,
DNS/TLS and service time and excludes subsequent JSON parsing. It does not measure
server-only query duration, browser rendering, Core Web Vitals or an entire page
load. Node's connection reuse is left enabled; the subsequent requests may reuse
connections and provider caches.

The report retains status, latency, phase, a generated correlation ID and whether
the existing API echoes it. Error classification is limited to HTTP failure,
timeout, network failure, invalid JSON or unexpected response shape. Server bodies,
messages, Authorization headers and session credentials are never copied into
the report. Existing safe API logs can correlate a failure using the recorded ID;
this measurement adds no logging, monitoring or tracing platform.

Baseline synthetic dataset: 33 operational records — 5 vessels, 4 certificates,
5 Crew profiles, 7 qualifications, 6 plans and 6 orders, plus audit events; see
[DEMO_DATASET.md](./DEMO_DATASET.md). The run also records observable Fleet and Crew
totals and selected workspace sizes. Shared QA/visitor records may increase those
counts. These are API observations, not a full database inventory or storage size.

One first pass and five subsequent samples per endpoint are kept separately.
Percentiles use the nearest-rank method; with only five subsequent samples, p95
equals the maximum. All attempted requests, including failures, appear in the
raw report and aggregate timing. A failed attempt's duration does not represent
successful completion; do not interpret a short refusal as a fast successful read.

## Cold start and limits

The first request may encounter suspended hosting, but this run does not force,
observe or prove suspension. Bootstrap readiness and session issuance can already
wake PostgreSQL before the first scenario pass. A slower first sample alone does
not establish a cold start or a database bottleneck.

Render documents that free web services can spin down after inactivity and incur
startup delay on the next request. Neon describes compute suspension when idle.
Those provider behaviors explain possible variability; they do not prove that
either occurred during this run. Sources: [Render free services](https://render.com/docs/free)
and [Neon compute management](https://neon.com/docs/manage/endpoints/).

This is one short observation from the owner's workstation, not a load test,
availability target or scalability guarantee. No deliberate outage, restart,
export, restore, reset, migration, sustained traffic or optimization is performed.

## Recorded result

Public run started **2026-10-12T02:02:05.010Z**, from the owner's Windows x64
workstation with Node.js **v24.13.0**, using the Auditor role. The client is in
Colombia; network throughput, provider regions and instance sizes were not measured.
The source is the measurement tooling delivered with this report. The full
[sanitized artifact](../measurements/2026-10-12-public-read.json) retains all samples.

The run completed **30/30 attempts in 78,513.73 ms**, with **0 errors**, no retries
and correlation echo on all 30 responses. The 29 reads and one session POST do not
alter operational records. Bootstrap had six samples; the scenario had 24 samples.
Observable dataset: **6 Fleet vessels**, **5 Crew profiles**, **2 Aurora certificate
records**, **2 current composition entries** and **3 Aurora maintenance orders**.
The extra Fleet record is outside the five-vessel seed baseline. Global counts of
all certificates, qualifications, plans, orders or audit rows were not recounted.

| Read workflow              | First pass (ms), n=1 | Subsequent min (ms), n=5 | Subsequent p50 (ms) | Subsequent p95/max (ms) |
| -------------------------- | -------------------- | ------------------------ | ------------------- | ----------------------- |
| Fleet, page 1              | 631.16               | 497.67                   | 506.29              | 582.82                  |
| Aurora Compliance          | 839.66               | 596.52                   | 618.14              | 636.21                  |
| Aurora Crew composition    | 930.04               | 695.98                   | 730.02              | 1,349.50                |
| Aurora Maintenance, page 1 | 838.49               | 647.30                   | 655.73              | 1,096.22                |

Initial **liveness took 52,422.32 ms**; readiness then returned `200` in
**1,060.90 ms**, identifying the PostgreSQL access store. Availability, issuance,
profile and Crew registry took 396.83, 593.43, 353.44 and 611.64 ms respectively.
The overall 30-sample p50 is 636.21 ms and p95 is 1,349.50 ms; the maximum is the
initial liveness sample and remains visible separately. These totals mix bootstrap
and scenario work, so the per-workflow figures are the better comparison.

The initial liveness wait is the dominant observed delay. Its handler does not
query PostgreSQL. A free-host startup is a plausible explanation, consistent with
Render's documented behavior, **not a confirmed attribution**: there is no provider
suspension event or server timing evidence here. The next readiness call and
subsequent reads establish successful recovery/readability during this run, not
an availability guarantee or proof of Neon's idle state.

No SQL, cache or infrastructure bottleneck is established by these client timings,
and no optimization is added. If further investigation is useful, repeat this same
small budget after the owner observes idle state, compare bootstrap and subsequent
samples, and correlate anomalies with the existing logs/provider events before
changing queries or hosting. The tool never forces idleness or restarts a service.
