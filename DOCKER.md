# IKY Docker Deployment Guide

This guide explains how to deploy IKY using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- **External PostgreSQL database** (13+)
  - You need to provide your own PostgreSQL instance
  - The application does NOT include a built-in database

## Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sysfox/IKY.git
   cd IKY
   ```

2. **Create environment file**:
   ```bash
   cp .env.docker.example .env
   nano .env
   ```
   
   Configure your external PostgreSQL database:
   ```bash
   DB_HOST=your_postgres_host    # e.g., localhost or postgres.example.com
   DB_NAME=iky
   DB_USER=iky_user
   DB_PASSWORD=your_secure_password
   DB_PORT=5432
   PORT=3010
   ```

3. **Start the service**:
   ```bash
   docker-compose up -d
   ```
   
   The server will:
   - Automatically run database migrations on startup
   - Connect to your external PostgreSQL database
   - Expose the API on port 3010

4. **Check status**:
   ```bash
   docker-compose ps
   docker-compose logs -f server
   ```

5. **Test the API**:
   ```bash
   curl http://localhost:3010/api/v1/health
   ```

6. **Access Admin Panel**:
   ```bash
   # Open in browser
   http://localhost:3010/admin.html
   ```

## Using Pre-built Docker Images

You can use pre-built images from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/sysfox/iky-server:latest

# Or pull a specific version (timestamp tag)
docker pull ghcr.io/sysfox/iky-server:202510031541

# Run the container
docker run -d \
  -p 3010:3010 \
  -e DB_HOST=your_postgres_host \
  -e DB_NAME=iky \
  -e DB_USER=iky_user \
  -e DB_PASSWORD=your_password \
  --name iky-server \
  ghcr.io/sysfox/iky-server:latest
```

## Building Docker Images Locally

### Server Image

```bash
cd server
docker build -t iky-server:local .
```

**Note**: The Dockerfile uses `npm ci` for compatibility. While the project uses `pnpm` for development, npm is used in Docker builds for better compatibility across different environments.

### Running the Server Container

```bash
docker run -d \
  -p 3010:3010 \
  -e NODE_ENV=production \
  -e DB_HOST=your_postgres_host \
  -e DB_NAME=iky \
  -e DB_USER=iky_user \
  -e DB_PASSWORD=secure_password \
  --name iky-server \
  iky-server:local
```

## Environment Variables

Key environment variables (set in `.env`):

```bash
# Database (External PostgreSQL)
DB_HOST=localhost               # Your PostgreSQL host
DB_NAME=iky
DB_USER=iky_user
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Server
PORT=3010                       # Default port (changed from 3000)
NODE_ENV=production
LOG_LEVEL=info

# Security
CORS_ORIGIN=*                   # Change to your domain in production
RATE_LIMIT_MAX_REQUESTS=100
```

## Production Deployment

### 1. Configure Environment

```bash
# Copy and edit environment file
cp .env.docker.example .env
nano .env
```

Set secure values for:
- `DB_HOST` - Your PostgreSQL server hostname
- `DB_PASSWORD` - Strong database password
- `CORS_ORIGIN` - Your domain (not *)
- Other security settings

### 2. Start Service

```bash
docker-compose up -d
```

The server will automatically:
- Run database migrations on startup
- Create the admin panel
- Expose the API on port 3010

### 3. Verify Deployment

```bash
# Check service is running
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3010/api/v1/health

# Access admin panel
open http://localhost:3010/admin.html
```

### 4. Database Migrations

Database migrations are **automatically executed** when the server starts. The SQL migration files in `database/migrations/` are run in order.

You can verify migrations in the logs:
```bash
docker-compose logs server | grep migration
```

### 5. First Admin User

The first user registered via the `/api/v1/identify` endpoint automatically becomes an admin. Use the admin panel at `/admin.html` to manage users and settings.

## Useful Commands

### Docker Compose

```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# View logs
docker-compose logs -f server

# Restart service
docker-compose restart server

# Rebuild and restart
docker-compose up -d --build

# Clean up
docker-compose down
```

### Database Management

Since the database is external, use your PostgreSQL tools:

```bash
# Connect to your database
psql -h your_db_host -U iky_user -d iky

# Backup database
pg_dump -h your_db_host -U iky_user iky > backup.sql

# Restore database
docker-compose exec -T postgres psql -U iky_user iky < backup.sql
```

### Server Container

```bash
# Execute commands in server container
docker-compose exec server sh

# View server logs
docker-compose logs -f server

# Restart server
docker-compose restart server
```

## Monitoring and Maintenance

### Health Checks

The server container includes a built-in health check:

```bash
docker inspect --format='{{json .State.Health}}' iky-server
```

### Logs

Logs are persisted in `./server/logs/` on the host machine.

```bash
# View recent logs
tail -f server/logs/iky.log

# View Docker logs
docker-compose logs -f server
```

### Resource Monitoring

```bash
# Monitor resource usage
docker stats iky-server
```

## Scaling and Performance

### Connection Pooling

Configure in `.env`:

```bash
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Rate Limiting

Adjust rate limits:

```bash
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window
```

## Troubleshooting

### Server won't start

```bash
# Check logs
docker-compose logs server

# Verify environment variables
docker-compose config

# Restart service
docker-compose restart
```

### Database connection issues

```bash
# Check if database is accessible
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Test from container
docker-compose exec server sh -c 'echo "SELECT 1" | psql -h $DB_HOST -U $DB_USER -d $DB_NAME'

# Check server logs for connection errors
docker-compose logs server | grep -i database
```

### Port conflicts

If port 3010 is already in use:

```bash
# Edit .env and change port
PORT=3011

# Restart service
docker-compose down
docker-compose up -d
```

### Migration failures

If migrations fail:

```bash
# Check migration logs
docker-compose logs server | grep migration

# Manually run migrations (if needed)
docker-compose exec server node -e "import('./src/utils/migrate.js').then(m => m.runMigrations())"

# Reset and retry
docker-compose restart server
```

## Security Recommendations

1. **Use strong database passwords**
2. **Set CORS_ORIGIN to your specific domain** (not *)
3. **Use HTTPS in production** with a reverse proxy (nginx, Caddy)
4. **Keep Docker images updated**
5. **Regular database backups**
6. **Monitor logs for suspicious activity**

## Support

For issues and questions:
- GitHub Issues: https://github.com/sysfox/IKY/issues
- Documentation: This guide and README.md

## Security Best Practices

1. **Change default passwords**: Never use default credentials in production
2. **Use secrets management**: Consider using Docker secrets or environment variable injection
3. **Limit CORS**: Set `CORS_ORIGIN` to your specific domain(s)
4. **Enable HTTPS**: Use a reverse proxy (nginx, Traefik) for SSL/TLS
5. **Regular updates**: Keep Docker images and dependencies updated
6. **Network isolation**: Use Docker networks to isolate services
7. **Resource limits**: Set memory and CPU limits in docker-compose.yml

## Support

For issues:
- GitHub Issues: https://github.com/sysfox/IKY/issues
- Documentation: See `README.md` and `DEPLOYMENT.md`

## License

MIT License - see LICENSE file for details
