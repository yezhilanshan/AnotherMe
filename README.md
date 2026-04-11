# AnotherMe Unified Project

This repository is now organized as one backend-first project with two engines:

- `OpenMAIC`: unified main project root
  - `openmaic-core` (Node/Next.js)
  - `anotherme2-engine` (Python)
  - `api-gateway` (FastAPI in `anotherme2_engine/api_gateway`)

## Unified Architecture

- `api-gateway` (FastAPI, in `OpenMAIC/anotherme2_engine/api_gateway`)
  - unified external APIs
  - job orchestration and status tracking
  - routes jobs to OpenMAIC core and integrated `anotherme2_engine` worker flows
- `openmaic-core` (Node/Next.js, in `OpenMAIC`)
  - topic-to-course generation
  - classroom content generation
- `anotherme2-engine` (Python, in `OpenMAIC/anotherme2_engine`)
  - image-to-teaching-video flow
  - vision -> script -> voice -> animation -> merge
- infrastructure
  - Postgres: job metadata
  - Redis: queues (`q.course`, `q.problem_video`, `q.package`)
  - MinIO/S3: artifacts

## Repository Layout

```text
AnotherMe-V3/
  OpenMAIC/
    app/                   # openmaic-core app
    lib/                   # openmaic-core libs
    anotherme2_engine/     # python engine + api-gateway
      api_gateway/
  scripts/                 # unified start/stop/status scripts
  docker-compose.unified.yml
  .env.example
```

## Unified APIs

Gateway endpoints:

- `POST /v1/uploads`
- `POST /v1/jobs`
- `GET /v1/jobs/{job_id}`
- `GET /v1/jobs/{job_id}/result`

Job types:

- `course_generate`
- `problem_video_generate`
- `study_package_generate`

## Quick Start (Local, non-docker)

1. Copy `.env.example` to `.env` and fill values.
2. Start services:
   - `pwsh ./scripts/dev-up.ps1`
3. Check service status:
   - `pwsh ./scripts/dev-status.ps1`
4. Stop all:
   - `pwsh ./scripts/dev-down.ps1`

## Quick Start (Docker Compose)

1. Copy `.env.example` to `.env`.
2. Run:
   - `docker compose -f docker-compose.unified.yml --env-file .env up -d --build`
3. Stop:
   - `docker compose -f docker-compose.unified.yml down`

## Notes

- This integration uses only one top-level service folder: `OpenMAIC`.
- You can continue running each subproject independently if needed.
