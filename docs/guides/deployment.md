# Deployment Guide

> This document describes PrismaX deployment solutions and processes

---

## Overview

PrismaX supports multiple deployment methods:

| Deployment Method        | Use Case                          | Complexity |
| ------------------------ | --------------------------------- | ---------- |
| Docker Compose           | Personal/small team self-hosting  | Low        |
| Kubernetes               | Enterprise production environment | High       |
| Vercel + Cloud Services  | Quick deployment                  | Low        |
| Desktop App Distribution | End users                         | Medium     |

---

## Docker Deployment

### Single Machine Deployment (Docker Compose)

#### Directory Structure

```
deploy/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── nginx/
│   └── nginx.conf
└── scripts/
    ├── backup.sh
    └── restore.sh
```

#### docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/prismax
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=prismax
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm build:web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy build artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

#### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static file caching
        location /_next/static {
            proxy_pass http://app;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
}
```

#### Deployment Steps

```bash
# 1. Clone project
git clone https://github.com/your-username/PrismaX.git
cd PrismaX

# 2. Configure environment variables
cp deploy/.env.example deploy/.env
# Edit .env file, set required environment variables

# 3. Generate SSL certificate (use Let's Encrypt for production)
# For development, use self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/nginx/ssl/key.pem \
  -out deploy/nginx/ssl/cert.pem

# 4. Start services
cd deploy
docker-compose up -d

# 5. Initialize database
docker-compose exec app pnpm db:migrate

# 6. View logs
docker-compose logs -f app
```

---

## Kubernetes Deployment

### Architecture Diagram

```
                    +------------------+
                    |   Ingress        |
                    |   (nginx/traefik)|
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    |   Service         |         |   Service         |
    |   (ClusterIP)     |         |   (ClusterIP)     |
    +---------+---------+         +---------+---------+
              |                             |
    +---------v---------+         +---------v---------+
    |   Deployment      |         |   StatefulSet     |
    |   (App Pods)      |         |   (PostgreSQL)    |
    +-------------------+         +-------------------+
```

### Kubernetes Configuration

#### namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prismax
```

#### configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prismax-config
  namespace: prismax
data:
  NODE_ENV: "production"
  NEXT_PUBLIC_APP_URL: "https://app.prismax.com"
```

#### secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: prismax-secrets
  namespace: prismax
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/prismax"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "your-jwt-secret"
  ENCRYPTION_KEY: "your-encryption-key"
```

#### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prismax-app
  namespace: prismax
spec:
  replicas: 3
  selector:
    matchLabels:
      app: prismax
  template:
    metadata:
      labels:
        app: prismax
    spec:
      containers:
        - name: app
          image: prismax/app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: prismax-config
            - secretRef:
                name: prismax-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      imagePullSecrets:
        - name: registry-credentials
```

#### service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: prismax-service
  namespace: prismax
spec:
  selector:
    app: prismax
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

#### ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prismax-ingress
  namespace: prismax
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.prismax.com
      secretName: prismax-tls
  rules:
    - host: app.prismax.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prismax-service
                port:
                  number: 80
```

#### hpa.yaml (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: prismax-hpa
  namespace: prismax
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prismax-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Deployment Commands

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n prismax

# View logs
kubectl logs -f deployment/prismax-app -n prismax

# Scale up
kubectl scale deployment prismax-app --replicas=5 -n prismax
```

---

## Vercel Deployment

### Configuration File

```json
// vercel.json
{
  "buildCommand": "pnpm build:web",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "regions": ["hnd1", "sfo1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app_url"
  }
}
```

### Deployment Steps

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Configure environment variables (in Vercel dashboard)
# DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
```

### External Service Configuration

| Service         | Recommended Solution          |
| --------------- | ----------------------------- |
| PostgreSQL      | Supabase / Neon / PlanetScale |
| Redis           | Upstash / Redis Cloud         |
| File Storage    | Vercel Blob / AWS S3          |
| Vector Database | Pinecone / Supabase pgvector  |

---

## Desktop App Distribution

### Build Configuration

```typescript
// electron-builder.config.ts
import { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.prismax.app",
  productName: "PrismaX",
  directories: {
    output: "release",
  },
  files: ["dist/**/*", "package.json"],
  mac: {
    category: "public.app-category.productivity",
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "zip", arch: ["x64", "arm64"] },
    ],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    certificateFile: process.env.WIN_CERT_FILE,
    certificatePassword: process.env.WIN_CERT_PASSWORD,
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
      { target: "rpm", arch: ["x64"] },
    ],
    category: "Utility",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  publish: {
    provider: "github",
    owner: "your-username",
    repo: "PrismaX",
    releaseType: "release",
  },
};

export default config;
```

### Auto Update

```typescript
// desktop/updater.ts
import { autoUpdater } from "electron-updater";
import { app, dialog } from "electron";

export function initAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: `Version ${info.version} is available. Download now?`,
        buttons: ["Download", "Later"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Downloaded",
        message: "Update downloaded. Restart to install?",
        buttons: ["Restart Now", "Later"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Check for updates
  autoUpdater.checkForUpdates();
}
```

### Build and Release

```bash
# Build all platforms
pnpm build:desktop

# Build macOS only
pnpm build:desktop --mac

# Build Windows only
pnpm build:desktop --win

# Build Linux only
pnpm build:desktop --linux

# Release to GitHub Releases
pnpm release:desktop
```

---

## Environment Variables

### Required Variables

| Variable         | Description                  | Example                               |
| ---------------- | ---------------------------- | ------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL`      | Redis connection string      | `redis://host:6379`                   |
| `JWT_SECRET`     | JWT signing key              | Random 32-byte string                 |
| `ENCRYPTION_KEY` | Data encryption key          | Random 32-byte string                 |

### Optional Variables

| Variable       | Description          | Default       |
| -------------- | -------------------- | ------------- |
| `PORT`         | Service port         | `3000`        |
| `NODE_ENV`     | Runtime environment  | `development` |
| `LOG_LEVEL`    | Log level            | `info`        |
| `CORS_ORIGINS` | CORS allowed origins | `*`           |

### Generate Keys

```bash
# Generate random key
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Monitoring and Alerting

### Health Check Endpoint

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.status(200).json(health);
}
```

### Prometheus Metrics

```typescript
// metrics.ts
import { Registry, Counter, Histogram } from "prom-client";

const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});
```

---

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups

# PostgreSQL backup
docker-compose exec -T db pg_dump -U postgres prismax | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-bucket/backups/
```

### Database Recovery

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# Restore database
gunzip -c $BACKUP_FILE | docker-compose exec -T db psql -U postgres prismax
```

### Scheduled Backup (Cron)

```bash
# Backup daily at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## Troubleshooting

### Common Issues

| Issue                      | Possible Cause                    | Solution                                    |
| -------------------------- | --------------------------------- | ------------------------------------------- |
| Database connection failed | Network/credential issue          | Check DATABASE_URL and network connectivity |
| Out of memory              | Memory limit too low              | Increase container memory limit             |
| Response timeout           | AI API latency                    | Increase timeout, add retry mechanism       |
| SSL certificate error      | Certificate expired/misconfigured | Update certificate, check Nginx config      |

### View Logs

```bash
# Docker Compose
docker-compose logs -f app

# Kubernetes
kubectl logs -f deployment/prismax-app -n prismax

# View specific time range
kubectl logs --since=1h deployment/prismax-app -n prismax
```

### Performance Analysis

```bash
# View container resource usage
docker stats

# Kubernetes resource usage
kubectl top pods -n prismax
```
