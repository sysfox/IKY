# IKY Docker Deployment Guide

This guide explains how to deploy IKY using Docker and Docker Compose.

## Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sysfox/IKY.git
   cd IKY
   ```

2. **Create environment file**:
   ```bash
   cp .env.docker.example .env
   # Edit .env and set your database password
   ```

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

4. **Check status**:
   ```bash
   docker-compose ps
   docker-compose logs -f server
   ```

5. **Test the API**:
   ```bash
   curl http://localhost:3000/api/v1/health
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
  -p 3000:3000 \
  -e DB_HOST=your_db_host \
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

**Note**: The Dockerfile uses `npm ci` for compatibility. While the project uses `pnpm` for development, npm is used in Docker builds for better compatibility across different environments. The `package-lock.json` file ensures consistent dependency versions.

### Running the Server Container

```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -e DB_NAME=iky \
  -e DB_USER=iky_user \
  -e DB_PASSWORD=secure_password \
  --name iky-server \
  iky-server:local
```

## Docker Compose Services

The `docker-compose.yml` includes:

- **postgres**: PostgreSQL 15 database with automatic schema initialization
- **server**: IKY API server

### Environment Variables

Key environment variables (set in `.env`):

```bash
# Database
DB_NAME=iky
DB_USER=iky_user
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Security
CORS_ORIGIN=*
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
- `DB_PASSWORD` - Strong database password
- `CORS_ORIGIN` - Your domain (not *)
- Other security settings

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3000/api/v1/health
```

### 4. Database Migrations

The database schema is automatically initialized on first run. The SQL migration files in `database/migrations/` are executed when the PostgreSQL container starts.

## Prisma Integration

The server includes Prisma ORM for database management:

### Generate Prisma Client

```bash
cd server
pnpm run prisma:generate
```

### Using Prisma Studio (Development)

```bash
cd server
pnpm run prisma:studio
```

This opens a web UI at http://localhost:5555 to explore and edit your database.

### Running Migrations

```bash
# Development
pnpm run prisma:migrate

# Production
pnpm run prisma:migrate:prod
```

## Useful Commands

### Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f server
docker-compose logs -f postgres

# Restart a service
docker-compose restart server

# Rebuild and restart
docker-compose up -d --build

# Clean up everything (including volumes)
docker-compose down -v
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U iky_user -d iky

# Backup database
docker-compose exec postgres pg_dump -U iky_user iky > backup.sql

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
docker stats iky-server iky-db
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

# Restart services
docker-compose restart
```

### Database connection issues

```bash
# Check database is running
docker-compose ps postgres

# Test database connection
docker-compose exec postgres pg_isready -U iky_user

# Check database logs
docker-compose logs postgres
```

### Port conflicts

If port 3000 or 5432 are already in use:

```bash
# Edit .env and change ports
PORT=3001
DB_PORT=5433

# Restart services
docker-compose down
docker-compose up -d
```

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
