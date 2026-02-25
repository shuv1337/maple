# PLAN: Fix Shiv → Local Maple Telemetry Ingestion

## Goal
Get `shiv` running on `shuvtest` to export OpenTelemetry data into the local Maple stack running on this machine (`ingest` at `127.0.0.1:3474`).

## Current Problem
- `shiv` on `shuvtest` was running, but no `shiv` traces/logs/metrics were visible in local Maple.
- `shuvtest` cannot directly reach this machine’s localhost ingest endpoint.

## Execution Summary (completed 2026-02-24)

### 1) Confirm deployed Shiv build includes OTEL code
- [x] Verified `shuvtest` repo state:
  - path: `/home/exedev/repos/shiv`
  - base commit: `453bf29cc54b81b0653dfacdf416ecc87673391d`
- [x] Implemented OTEL runtime export in Shiv:
  - added `src/otel-exporter.ts`
  - wired exporter into `src/log.ts` (structured log events now emit OTLP logs/traces/metrics)
  - added graceful flush on exit in `src/main.ts`
  - documented env vars in `README.md`
- [x] Typecheck/build/tests passed in Shiv (`npm test`, `npm run build`, `npm run test:unit`).

### 2) Establish network path from `shuvtest` to local ingest
- [x] Reverse tunnel validated (`shuvtest -> 127.0.0.1:34740 -> local 127.0.0.1:3474`).
- [x] `curl http://127.0.0.1:34740/health` from `shuvtest` returns `OK`.

### 3) Configure Shiv runtime for OTEL export
- [x] Configured `~/.config/shiv/test.env` on `shuvtest` with:
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:34740`
  - `OTEL_EXPORTER_OTLP_HEADERS=x-maple-ingest-key=<local maple ingest key>`
  - `OTEL_SERVICE_NAME=shiv`
  - `OTEL_RESOURCE_ATTRIBUTES=service.name=shiv,deployment.environment=shuvtest`
- [x] Updated startup wrapper `/home/exedev/repos/shiv/scripts/start-test.sh` to:
  - load env file
  - fail fast if OTEL endpoint `/health` is unreachable

### 4) Restart Shiv and generate traffic
- [x] Restarted Shiv in tmux session `shiv-test`.
- [x] Shiv startup/runtime events generated telemetry immediately via new OTEL exporter.

### 5) Verify data reaches local Maple

#### Ingest-level checks
- [x] Ingest counters increased after real Shiv runtime startup events:
  - `ingest_requests_total`
    - traces: `5 -> 23`
    - logs: `4 -> 22`
    - metrics: `4 -> 22`
  - `ingest_items_total`
    - traces: `626 -> 644`
    - logs: `482 -> 500`
    - metrics: `15 -> 33`

#### API/UI-level checks
- [x] `service_overview` returns `serviceName=shiv`, `environment=shuvtest` with new throughput.
- [x] `list_traces` shows runtime event spans (`discord_commands_registered`, `providers_started`, etc.).
- [x] `list_logs` shows Shiv runtime logs for same events.
- [x] `list_metrics` shows Shiv runtime metric stream (`shiv.events_total`).

### 6) Make it durable
- [x] Persistent reverse tunnel enabled via systemd user unit on local host:
  - `/home/shuv/.config/systemd/user/shiv-ingest-tunnel.service`
  - `systemctl --user enable --now shiv-ingest-tunnel.service`
- [x] Shiv startup preflight enforces OTEL endpoint reachability before launching.

## Success Criteria
- [x] `shiv` appears in Maple service list.
- [x] New traces/logs/metrics from `shuvtest` are visible in local Maple.
- [x] Ingest metrics counters increase during Shiv activity.
