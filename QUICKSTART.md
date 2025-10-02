# Quick Start Guide

Get IKY (I Know You) up and running in 5 minutes.

## Prerequisites

- Node.js 22+ installed
- PostgreSQL 13+ installed and running
- pnpm 8+ installed
- Basic knowledge of JavaScript

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY

# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install server dependencies
cd server
pnpm install

# Install client dependencies
cd ../client
pnpm install
```

## Step 2: Setup Database

```bash
# Create database
createdb iky

# Or using psql
psql -U postgres -c "CREATE DATABASE iky;"

# Run migrations
psql -U postgres -d iky -f ../database/migrations/001_initial_schema.sql
```

If you see "IKY database schema created successfully", you're good to go!

## Step 3: Configure Server

```bash
cd ../server

# Copy example environment file
cp .env.example .env

# Edit .env file with your database credentials
# Minimal required settings:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=iky
# DB_USER=postgres
# DB_PASSWORD=your_password
```

## Step 4: Start the Server

```bash
pnpm start
```

You should see:
```
🚀 IKY (I Know You) Server Started
📍 Server URL: http://0.0.0.0:3000
⚡ Node.js: v22.x.x
```

## Step 5: Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Step 6: Try the Client Demo

Open `examples/client-demo.html` in your web browser. Click the buttons to:

1. **Initialize System** - Creates a client UUID
2. **Identify User** - Collects device fingerprint and identifies user
3. **Show Fingerprint** - Displays collected device information
4. **Reset UUID** - Clears UUID to test new user flow

## Step 7: Test with curl

### Identify a New User

```bash
curl -X POST http://localhost:3000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{
    "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "device_info": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      "platform": "Win32",
      "language": "en-US",
      "timezone": "America/New_York",
      "timezoneOffset": 300,
      "screen": {
        "width": 1920,
        "height": 1080,
        "colorDepth": 24,
        "pixelRatio": 1
      },
      "hardware": {
        "hardwareConcurrency": 8,
        "deviceMemory": 16
      },
      "canvas": {
        "hash": "abc123def456"
      },
      "audio": {
        "hash": "789xyz012"
      }
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user_id": "usr_abc123xyz789",
    "session_id": "ses_def456uvw012",
    "status": "new",
    "confidence": 1.0,
    "is_device_changed": false
  }
}
```

Save the `user_id` for the next step!

### Get User Statistics

```bash
curl http://localhost:3000/api/v1/users/usr_abc123xyz789/statistics
```

### Get Device History

```bash
curl "http://localhost:3000/api/v1/users/usr_abc123xyz789/device-history?page=1&per_page=10"
```

## Common Issues

### Database Connection Error

**Problem:** "Database connection failed"

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check credentials in `.env` file
3. Test connection: `psql -U postgres -d hey_iny -c "SELECT 1"`

### Port Already in Use

**Problem:** "Port 3000 is already in use"

**Solution:**
1. Change port in `.env`: `PORT=3001`
2. Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

### Module Not Found

**Problem:** "Cannot find module 'express'"

**Solution:**
```bash
cd server
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Security Audit Warnings

**Problem:** Security vulnerabilities detected

**Solution:**
```bash
cd server
pnpm audit
pnpm audit --fix
```

## Next Steps

Now that you have IKY running:

1. **Integrate the Client Library**
   ```javascript
   import { HeyINY } from 'iky-client';
   
   const iky = new HeyINY({
     api: { baseURL: 'http://localhost:3000' }
   });
   
   const result = await iky.identify();
   console.log('User ID:', result.user_id);
   ```

2. **Explore the API**
   - Read `docs/API.md` for complete API documentation
   - Try different endpoints with curl or Postman

3. **Customize Configuration**
   - Adjust matching thresholds in `.env`
   - Configure fingerprint weights
   - Set up logging

4. **Production Deployment**
   - Set `NODE_ENV=production`
   - Use environment variables for secrets
   - Set up reverse proxy (nginx)
   - Enable HTTPS
   - Implement authentication
   - Set up monitoring

## Development Mode

For development with auto-reload:

```bash
cd server
pnpm run dev
```

This uses nodemon to automatically restart the server when files change.

## Running Tests

```bash
# Run all tests
cd server && pnpm test

# Run tests with coverage
cd server && pnpm run test:coverage

# Run security audit
cd server && pnpm run security:audit
```

## Support

- Documentation: `docs/API.md`
- Examples: `examples/`
- Issues: https://github.com/sysfox/Hey-INY/issues

Happy identifying! 🔍
