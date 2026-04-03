# LMS Portal — Learning Management System

A containerized microservices platform for engineering students to watch recorded skill development sessions and track learning progress.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy (:80)                 │
├────────────┬─────────────┬──────────────┬────────────────────┤
│   /        │   /api      │   /ml        │   /grafana         │
│   React    │   Node.js   │   FastAPI    │   Grafana          │
│   :3000    │   :5000     │   :8000      │   :3001            │
└────────────┴──────┬──────┴──────┬───────┴────────────────────┘
                    │             │
                    │  ┌──────────┘
                    │  │  Inter-Service Communication
                    │  │  POST /api/predict → http://lms-ml:8000/ml/predict
                    ▼  ▼
              ┌───────────┐    ┌──────────────┐
              │  MongoDB  │    │  Prometheus  │
              │  :27017   │    │  :9090       │
              └───────────┘    └──────────────┘
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/LMS_portal.git
cd LMS_portal

# Spin up the full stack
docker compose up --build -d

# Verify
curl http://localhost/api/health
curl http://localhost/ml/health
```

## Services

| Service | Container | Port | URL |
|---------|-----------|------|-----|
| React Frontend | lms-frontend | 3000 | http://localhost/ |
| Node.js Backend | lms-backend | 5000 | http://localhost/api |
| FastAPI ML Service | lms-ml | 8000 | http://localhost/ml |
| MongoDB | lms-mongo | 27017 | (internal) |
| Prometheus | lms-prometheus | 9090 | http://localhost:9090 |
| Grafana | lms-grafana | 3001 | http://localhost:3001 |
| Nginx Proxy | lms-nginx | 80 | http://localhost |

## Inter-Service Communication

The Node.js backend proxies skill prediction requests to the FastAPI ML service:

```
Frontend → POST /api/predict → Backend → POST http://lms-ml:8000/ml/predict → ML Service
```

Test it:
```bash
curl -X POST http://localhost/api/predict \
  -H "Content-Type: application/json" \
  -d '{"hours_watched": 25, "quizzes_passed": 10, "assignments_done": 7}'
```

## Monitoring

- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## Documentation

- [Environment Variables](docs/environment-variables.md)
- [Deployment Runbook](docs/deployment-runbook.md)

## CI/CD

Three separate GitHub Actions pipelines under `.github/workflows/`:
- `frontend.yml` — Build & deploy React app
- `backend.yml` — Test, build & deploy Node.js API
- `ml-service.yml` — Test, build & deploy FastAPI ML service

## Tech Stack

Docker, Docker Compose, GitHub Actions, Nginx, React, Node.js, FastAPI, MongoDB, Prometheus, Grafana
