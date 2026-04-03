# Environment Variables Reference

All environment variables used across the LMS Portal services.

## Backend Service (`lms-backend`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Port the Express server listens on |
| `MONGO_URI` | `mongodb://lms-mongo:27017/lms` | MongoDB connection string |
| `ML_SERVICE_URL` | `http://lms-ml:8000` | Internal URL of the FastAPI ML service |

## Grafana (`lms-grafana`)

| Variable | Default | Description |
|----------|---------|-------------|
| `GF_SECURITY_ADMIN_USER` | `admin` | Grafana admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Grafana admin password (change in production!) |
| `GF_SERVER_ROOT_URL` | `http://localhost:3001` | Grafana root URL |

## CI/CD (GitHub Secrets)

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `SERVER_HOST` | IP or hostname of the deployment server |
| `SERVER_USER` | SSH username on the deployment server |
| `SERVER_SSH_KEY` | Private SSH key for passwordless server access |

## Frontend (`lms-frontend`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `/api` | Base URL for backend API calls |
