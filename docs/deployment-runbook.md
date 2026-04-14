# Deployment Runbook — LMS Portal

Step-by-step guide for provisioning a fresh server and deploying the LMS Portal stack from zero.

## 1) Prerequisites

- Ubuntu 22.04+ server or VPS with at least 2 GB RAM
- SSH access to the server
- Docker Hub account for pushed images
- GitHub repository access to configure Actions secrets
- Optional: domain name pointed to the server IP for production TLS

## 2) Provision the Server

### AWS EC2

Use an Ubuntu 22.04 LTS image, a `t2.micro` or `t3.small` instance, and at least 20 GB storage. Open inbound ports `22`, `80`, and `443`. Keep `3001` and `9090` closed unless you intentionally want direct Grafana or Prometheus access.

### DigitalOcean / Hetzner / Other VPS

Provision an Ubuntu 22.04 server with 2 GB RAM minimum and a region close to your users. Open the same ports as above.

## 3) Install Docker

```bash
ssh ubuntu@http://13.62.184.149/

sudo apt update
sudo apt upgrade -y

curl -fsSL https://get.docker.com | sudo sh

sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

## 4) Prepare the Application Directory

```bash
cd /opt
sudo mkdir -p lms-portal
sudo chown $USER:$USER lms-portal
git clone https://github.com/YOUR_USERNAME/LMS_portal.git lms-portal
cd lms-portal
```

## 5) Create the Server `.env` Files

The stack uses two server-side env files:

- Root `.env` for Grafana and compose-level values
- `backend/.env` for backend runtime secrets

### Root `.env`

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Set values for:

- `GF_SECURITY_ADMIN_USER`
- `GF_SECURITY_ADMIN_PASSWORD`
- `GF_SERVER_ROOT_URL`
- `GF_SERVER_DOMAIN`
- `GF_SERVER_SERVE_FROM_SUB_PATH`
- `GF_SERVER_ENFORCE_DOMAIN`

### Backend `.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
chmod 600 backend/.env
```

Set values for:

- `MONGO_URI`
- `ML_SERVICE_URL`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- Any SMTP alias values you want to keep for compatibility

Do not commit either `.env` file.

## 6) Configure GitHub Secrets

In GitHub, go to Settings → Secrets and variables → Actions → New repository secret and add:

| Secret | Value |
|--------|-------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `SERVER_HOST` | Server IP address or hostname |
| `SERVER_USER` | SSH user on the server, usually `ubuntu` |
| `SERVER_SSH_KEY` | Private SSH key contents |

## 7) Optional DNS and TLS Setup

Point an `A` record at the server IP, then install Certbot once the app is reachable:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d lms.yourdomain.com
sudo certbot renew --dry-run
```

## 8) Start the Stack

```bash
cd /opt/lms-portal
docker compose up --build -d
docker compose ps
docker compose logs -f --tail=100
```

## 9) Verify the Deployment

```bash
curl http://localhost/api/health
curl http://localhost/ml/health
curl http://localhost:5000/metrics
curl http://localhost:9090/api/v1/targets
curl http://localhost:3001
```

If you want a full end-to-end API check, test the prediction endpoint:

```bash
curl -X POST http://localhost/api/predict \
  -H "Content-Type: application/json" \
  -d '{"hours_watched": 25, "quizzes_passed": 10, "assignments_done": 7}'
```

## 10) Production Checks

- Confirm Grafana no longer uses the default admin password.
- Confirm the backend starts only when `backend/.env` exists and contains `JWT_SECRET`.
- Confirm Docker images were pulled or built successfully.
- Confirm the reverse proxy serves the app through Nginx.

## 11) Day-2 Operations

### Update a service

```bash
cd /opt/lms-portal
git pull origin main
docker compose up --build -d --no-deps <service-name>
```

### View logs

```bash
docker compose logs -f lms-backend
docker compose logs -f lms-grafana
docker compose logs -f lms-prometheus
```

### Back up MongoDB

```bash
docker exec lms-mongo mongodump --out /data/backup
docker cp lms-mongo:/data/backup ./mongo-backup-$(date +%Y%m%d)
```

### Monitor resource usage

```bash
docker stats
```

## Troubleshooting

### Container will not start

```bash
docker compose logs lms-backend
docker compose down
docker compose up --build -d
```

### MongoDB connection issues

```bash
docker exec -it lms-mongo mongosh
```

### Prometheus has no targets

```bash
docker compose logs lms-prometheus
curl http://localhost:9090/targets
```

### Port conflicts

```bash
sudo lsof -i :80
sudo systemctl stop nginx
```
