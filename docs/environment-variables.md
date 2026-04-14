# Environment Variables Reference

Sensitive values belong in GitHub Secrets or on the server in `.env` files. Never commit real secrets.

## Backend Runtime (`backend/.env`)

| Variable | Required | Example / Default | Notes |
|----------|----------|-------------------|-------|
| `PORT` | No | `5000` | Express listen port. |
| `MONGO_URI` | Yes | `mongodb://lms-mongo:27017/lms` | MongoDB connection string for the backend container. |
| `ML_SERVICE_URL` | Yes | `http://lms-ml:8000` | Internal FastAPI ML service URL used by `/api/predict`. |
| `JWT_SECRET` | Yes | `change-this-in-production` | JWT signing key. Must be unique and kept out of git. |
| `EMAIL_USER` | Recommended | `your-email@example.com` | Gmail account used to send notification mail. |
| `EMAIL_PASS` | Recommended | `your-app-password` | Gmail app password or SMTP password. Sensitive. |
| `EMAIL_HOST` | No | `smtp.gmail.com` | Present in the example file for compatibility/reference. |
| `EMAIL_PORT` | No | `587` | Present in the example file for compatibility/reference. |
| `EMAIL_FROM` | No | `LMS Portal <no-reply@example.com>` | Optional sender address. |
| `SMTP_HOST` | No | `smtp.gmail.com` | Backward-compatible alias for SMTP host. |
| `SMTP_PORT` | No | `587` | Backward-compatible alias for SMTP port. |
| `SMTP_USER` | No | `your-email@example.com` | Backward-compatible alias for SMTP username. |
| `SMTP_PASS` | No | `your-app-password` | Backward-compatible alias for SMTP password. Sensitive. |
| `SMTP_FROM` | No | `LMS Portal <no-reply@example.com>` | Backward-compatible alias for sender address. |

## Root Server `.env`

| Variable | Required | Example / Default | Notes |
|----------|----------|-------------------|-------|
| `GF_SECURITY_ADMIN_USER` | No | `admin` | Grafana admin username. |
| `GF_SECURITY_ADMIN_PASSWORD` | Yes | `change-this-in-production` | Grafana admin password. Store on the server, not in git. |
| `GF_SERVER_ROOT_URL` | Yes | `%(protocol)s://%(domain)s/grafana/` | Grafana URL when served behind Nginx. |
| `GF_SERVER_SERVE_FROM_SUB_PATH` | No | `true` | Required for the `/grafana` sub-path deployment. |
| `GF_SERVER_ENFORCE_DOMAIN` | No | `false` | Keeps Grafana from rejecting proxy hostnames. |
| `GF_SERVER_DOMAIN` | No | `your-server-hostname-or-ip` | Hostname or IP used by Grafana redirects. |
| `REACT_APP_API_URL` | No | `/api` | Optional frontend build override for local development. |

## GitHub Actions Secrets

| Secret | Required | Notes |
|--------|----------|-------|
| `DOCKER_USERNAME` | Yes | Docker Hub username used for image tags. |
| `DOCKER_PASSWORD` | Yes | Docker Hub password or access token. |
| `SERVER_HOST` | Yes | Deployment server hostname or IP. |
| `SERVER_USER` | Yes | SSH user on the deployment server. |
| `SERVER_SSH_KEY` | Yes | Private SSH key used by the deployment workflows. |

## Frontend Build Environment

| Variable | Required | Example / Default | Notes |
|----------|----------|-------------------|-------|
| `REACT_APP_API_URL` | No | `/api` | React build-time API base URL. The app falls back to `/api` if unset. |
