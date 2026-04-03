# Deployment Runbook — LMS Portal

Step-by-step guide for provisioning a fresh server and deploying the full LMS Portal stack.

---

## Prerequisites

- A VPS or EC2 instance (Ubuntu 22.04+ recommended, minimum 2GB RAM)
- A domain name pointed to the server IP (optional — can use IP directly)
- Docker Hub account with images pushed (or build locally on the server)
- SSH access to the server

---

## Step 1: Provision the Server

### AWS EC2 (Free Tier)
```bash
# Launch an EC2 instance:
# - AMI: Ubuntu 22.04 LTS
# - Instance type: t2.micro (free tier) or t3.small for better performance
# - Storage: 20GB gp3
# - Security Group: Allow ports 22, 80, 443, 3001, 9090
```

### DigitalOcean / Hetzner
```bash
# Create a droplet/server:
# - OS: Ubuntu 22.04
# - Plan: 2GB RAM / 1 vCPU minimum
# - Region: closest to your users
```

---

## Step 2: Install Docker & Docker Compose

```bash
# SSH into the server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Step 3: Clone the Repository

```bash
cd /opt
sudo mkdir -p lms-portal
sudo chown $USER:$USER lms-portal
git clone https://github.com/YOUR_USERNAME/LMS_portal.git lms-portal
cd lms-portal
```

---

## Step 4: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical values to change:**
- `GF_SECURITY_ADMIN_PASSWORD` — change from `admin`
- `MONGO_URI` — update if using external MongoDB

---

## Step 5: Set Up Domain DNS (Optional)

```bash
# Point your domain to the server IP:
# A record: lms.yourdomain.com → your-server-ip
# Wait for DNS propagation (5-30 minutes)
```

---

## Step 6: Deploy with Docker Compose

```bash
cd /opt/lms-portal

# Build and start all services
docker compose up --build -d

# Verify all containers are running
docker compose ps

# Check logs
docker compose logs -f --tail=50
```

---

## Step 7: Verify All Services

```bash
# Frontend
curl http://localhost:3000

# Backend health
curl http://localhost:5000/api/health

# ML service health
curl http://localhost:8000/ml/health

# Test inter-service communication (Backend → ML)
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"hours_watched": 25, "quizzes_passed": 10, "assignments_done": 7}'

# Nginx reverse proxy
curl http://localhost/api/health
curl http://localhost/ml/health

# Prometheus targets
curl http://localhost:9090/api/v1/targets

# Grafana (login: admin/admin)
curl http://localhost:3001
```

---

## Step 8: SSL Certificate with Certbot (Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d lms.yourdomain.com

# Auto-renewal is set up automatically. Verify with:
sudo certbot renew --dry-run

# Add cron job for auto-renewal (usually auto-configured)
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew
```

---

## Step 9: Set Up GitHub Secrets for CI/CD

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub access token |
| `SERVER_HOST` | Your server IP address |
| `SERVER_USER` | `ubuntu` (or your SSH user) |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/id_rsa` (private key) |

---

## Step 10: Verify Monitoring

1. Open Grafana: `http://your-server-ip:3001`
2. Login: `admin` / `admin` (change password on first login)
3. Navigate to Dashboards → LMS Portal → Service Dashboard
4. Verify all panels show data:
   - HTTP Request Rate
   - Request Duration (p50/p95)
   - Error Rate
   - Backend/ML Uptime
   - Memory/CPU usage

---

## Troubleshooting

### Container won't start
```bash
docker compose logs lms-backend    # Check specific service logs
docker compose down && docker compose up --build -d   # Rebuild
```

### MongoDB connection issues
```bash
docker exec -it lms-mongo mongosh  # Verify MongoDB is accessible
```

### Prometheus not scraping
```bash
# Check targets at http://localhost:9090/targets
docker compose logs lms-prometheus
```

### Port conflicts
```bash
sudo lsof -i :80    # Check what's using port 80
sudo systemctl stop nginx  # Stop system nginx if conflicting
```

---

## Maintenance

### Update a service
```bash
cd /opt/lms-portal
git pull origin main
docker compose up --build -d --no-deps <service-name>
```

### Backup MongoDB
```bash
docker exec lms-mongo mongodump --out /data/backup
docker cp lms-mongo:/data/backup ./mongo-backup-$(date +%Y%m%d)
```

### View resource usage
```bash
docker stats
```
