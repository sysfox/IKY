# Deployment Guide

This guide covers deploying Hey-INY to production environments.

## Prerequisites

- Node.js 16+ (LTS recommended)
- PostgreSQL 13+
- Reverse proxy (nginx or similar)
- SSL certificate
- Process manager (PM2 recommended)

## Production Checklist

- [ ] Environment variables configured
- [ ] Database configured with connection pooling
- [ ] SSL/TLS enabled
- [ ] API authentication implemented
- [ ] Rate limiting configured
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] CORS properly configured
- [ ] Security headers enabled

## Option 1: Traditional Server Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY

# Install dependencies
cd server && npm install --production
cd ../client && npm install --production
```

### 3. Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE hey_iny_prod;
CREATE USER hey_iny_app WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE hey_iny_prod TO hey_iny_app;
EOF

# Run migrations
psql -U hey_iny_app -d hey_iny_prod -f database/migrations/001_initial_schema.sql
```

### 4. Environment Configuration

Create `/home/user/Hey-INY/server/.env`:

```bash
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hey_iny_prod
DB_USER=hey_iny_app
DB_PASSWORD=secure_password_here
DB_POOL_MIN=5
DB_POOL_MAX=20

# API
API_PREFIX=/api/v1
CORS_ORIGIN=https://yourdomain.com

# Security
SESSION_SECRET=generate_random_secret_here

# Matching thresholds
MATCH_CONFIDENCE_THRESHOLD=0.75
DEVICE_CHANGE_THRESHOLD=0.5

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/hey-iny/app.log
```

### 5. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'hey-iny-api',
    script: './src/index.js',
    cwd: '/home/user/Hey-INY/server',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/hey-iny/error.log',
    out_file: '/var/log/hey-iny/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
  }],
};
```

Start the application:

```bash
# Create log directory
sudo mkdir -p /var/log/hey-iny
sudo chown $USER:$USER /var/log/hey-iny

# Start with PM2
cd server
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/hey-iny`:

```nginx
upstream hey_iny_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Logging
    access_log /var/log/nginx/hey-iny-access.log;
    error_log /var/log/nginx/hey-iny-error.log;

    # API proxy
    location / {
        proxy_pass http://hey_iny_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (bypass rate limiting)
    location /api/v1/health {
        proxy_pass http://hey_iny_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/hey-iny /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Option 2: Docker Deployment

### Dockerfile

Create `Dockerfile` in server directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY src ./src

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "src/index.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hey-iny-db
    environment:
      POSTGRES_DB: hey_iny
      POSTGRES_USER: hey_iny_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hey_iny_app"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./server
    container_name: hey-iny-api
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: hey_iny
      DB_USER: hey_iny_app
      DB_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
```

Deploy with Docker Compose:

```bash
# Create .env file with DB_PASSWORD
echo "DB_PASSWORD=secure_password_here" > .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs hey-iny-api

# Monitor resources
pm2 monit

# View metrics
pm2 show hey-iny-api
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup Strategy

### Database Backups

```bash
# Daily backup script
cat > /home/user/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/hey-iny"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="hey_iny_backup_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -U hey_iny_app hey_iny_prod | gzip > $BACKUP_DIR/$FILENAME

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME"
EOF

chmod +x /home/user/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/user/backup-database.sh
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Implement authentication** - Protect API endpoints
3. **Use HTTPS only** - Enforce SSL/TLS
4. **Rate limiting** - Prevent abuse
5. **Input validation** - Sanitize all inputs
6. **Regular updates** - Keep dependencies updated
7. **Audit logging** - Log all important events
8. **Database encryption** - Encrypt sensitive data
9. **Firewall rules** - Restrict network access
10. **Regular backups** - Test restore procedures

## Performance Optimization

### Database Indexes

```sql
-- Check missing indexes
SELECT 
  schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' 
  AND n_distinct > 100
ORDER BY abs(correlation) DESC;

-- Create additional indexes if needed
CREATE INDEX CONCURRENTLY idx_custom 
ON user_device_profiles (field1, field2);
```

### Connection Pooling

Adjust pool size in `.env`:
```bash
DB_POOL_MIN=10
DB_POOL_MAX=50
```

### Caching

Consider implementing Redis for:
- Session caching
- Fingerprint lookup cache
- Rate limiting

## Troubleshooting

### High CPU Usage

```bash
pm2 restart hey-iny-api
pm2 reload hey-iny-api  # Zero-downtime reload
```

### Database Connection Issues

```bash
# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database
sudo systemctl restart postgresql
```

### Out of Memory

```bash
# Increase PM2 memory limit
pm2 restart hey-iny-api --max-memory-restart 2G
```

## Updates and Maintenance

```bash
# Pull latest changes
cd /home/user/Hey-INY
git pull

# Install dependencies
cd server && npm install --production

# Restart application
pm2 restart hey-iny-api

# Check status
pm2 status
```

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Review nginx logs: `/var/log/nginx/`
- Database logs: `/var/log/postgresql/`
- GitHub Issues: https://github.com/sysfox/Hey-INY/issues
