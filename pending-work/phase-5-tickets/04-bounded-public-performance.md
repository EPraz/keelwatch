## Parent

Part of #11 — Phase 5: Public DemoAccount access and focused demo quality.

## What to build

A reviewer can inspect a small reproducible measurement of existing public read
workflows, with enough context to understand response time, errors and the limits
of a free hosted demo. Reuse the completed demo session flow and existing health
checks and safe logs; add no permanent operational platform.

This measurement can proceed independently of accessibility corrections once both
DemoAccounts and their usage controls are available. It does not alone close Phase 5.

## Acceptance criteria

- [ ] Measure a small bounded read scenario through the public application's API
      using issued demo sessions; record which existing workflow and role it exercises.
      The measurement does not mutate shared operational records or saturate the demo.
- [ ] Record synthetic dataset size, environment, scenario, concurrency, duration,
      request/sample count, timing method, observed latencies and errors. Choose and
      record the modest measurement budget before running; no interview-approved
      numeric target or mandatory optimization is implied.
- [ ] Distinguish cold-start and warm behavior where observed, and explain the
      sampling limits. Do not present the result as an availability or scalability
      guarantee or hide failed requests from the reported result.
- [ ] Provide a repeatable way to rerun the scenario without storing temporary
      credentials, signing material, passwords or tokens in documentation or logs.
- [ ] Reuse existing correlation/logging and live/ready health checks when interpreting
      results. Do not add RED dashboards, tracing, alert infrastructure or a paid service.
- [ ] Record any measured bottleneck or follow-up recommendation honestly; optimization
      is conditional on evidence and is not an automatic acceptance requirement.
- [ ] Applicable checks for any measurement tooling and documentation pass; record
      evidence in durable progress. No heavy load testing, availability thresholds,
      exports, restores or destructive fault drills are introduced.
