# IKY - I Know You

## User Identity & Device Fingerprinting System

A comprehensive user identity recognition system based on a three-layer identity architecture and complete device profiling.

## Overview

IKY (I Know You) implements a sophisticated user identification mechanism that combines:
- Client-side persistent UUID management
- Server-side device fingerprinting
- Multi-level identity matching algorithms
- Complete device change history tracking

## Core Design Philosophy

**"Three-Layer Identity System + Complete Device Profile"**

The system achieves precise user identification and device change tracking through:
1. Client-side persistent UUID
2. Server-side device fingerprinting
3. Complete device change history

## 🚀 Quick Start

### Prerequisites
- **Node.js >= 22.0.0** (Required)
- **pnpm >= 8.0.0** (Package manager)
- PostgreSQL >= 13.x (or use Docker)
- Basic knowledge of JavaScript

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY

# Create environment file
cp .env.docker.example .env
# Edit .env and set your database password

# Start services with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# Test the API
curl http://localhost:3000/api/v1/health
```

See [DOCKER.md](DOCKER.md) for detailed Docker deployment instructions.

### Option 2: Traditional Installation

```bash
# Clone the repository
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY

# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
cd server && pnpm install
cd ../client && pnpm install

# Setup database
createdb iky
psql iky < ../database/migrations/001_initial_schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start the server
cd ../server
pnpm start
```

## Architecture

### 1. Identity Recognition Layer
- **Client UUID**: Client-generated and persistently stored random UUID
- **User Identity ID**: Server-assigned unique user identity
- **Device Session ID**: New session ID generated on device environment changes

### 2. Data Collection Layer
Complete device information collection:
- **Basic Environment**: User Agent, OS, screen resolution, timezone, language
- **Hardware Features**: CPU cores, device memory, Canvas fingerprint, Audio fingerprint
- **Software Environment**: Font list, browser plugins, WebGL info
- **Network Information**: IP address, geolocation, ISP info

### 3. Matching Recognition Layer
Multi-level matching strategy:
1. UUID Priority Match: Direct user identification via Client UUID
2. Hardware Fingerprint Match: Identity recovery through device hardware features when UUID is lost
3. Environment Feature Match: Auxiliary identification through software environment and network features

### 4. Change Tracking Layer
Change detection and classification:
- **Minor Changes**: Browser updates, IP changes → Update existing records
- **Major Changes**: OS replacement, hardware changes → Create new device session
- **Device Reset**: UUID changes but hardware features match → Identity recovery

## Project Structure

```
IKY/
├── client/                 # Client-side fingerprinting library
│   ├── src/
│   │   ├── fingerprint.js  # Device fingerprinting
│   │   ├── uuid.js         # UUID management
│   │   └── api-client.js   # API communication
│   └── package.json
├── server/                 # Server-side API
│   ├── src/
│   │   ├── api/           # REST API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   └── utils/         # Utility functions
│   └── package.json
├── dashboard/             # Web dashboard for visualization
│   ├── src/
│   │   ├── components/   # React components
│   │   └── pages/        # Dashboard pages
│   └── package.json
├── database/             # Database schemas and migrations
│   └── migrations/
└── docs/                 # Documentation
    └── api.md           # API documentation
```

## Quick Start

### Prerequisites
- Node.js >= 22.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 13.x

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY
```

2. Install pnpm (if not already installed):
```bash
npm install -g pnpm
```

3. Install dependencies:
```bash
# Install server dependencies
cd server && pnpm install

# Install client dependencies
cd ../client && pnpm install
```

4. Setup database:
```bash
# Create PostgreSQL database
createdb iky

# Run migrations
cd ../database
psql iky < migrations/001_initial_schema.sql
```

5. Configure environment:
```bash
# Copy example environment file
cp server/.env.example server/.env

# Edit .env with your database credentials
```

6. Start the services:
```bash
# Start server
cd server && pnpm start
```

## Usage

### Client Integration

```javascript
import { DeviceFingerprint, UUIDManager } from 'iky-client';

// Initialize UUID manager
const uuidManager = new UUIDManager();
const clientUUID = await uuidManager.getOrCreateUUID();

// Collect device fingerprint
const fingerprint = new DeviceFingerprint();
const deviceInfo = await fingerprint.collect();

// Send to server for identification
const response = await fetch('http://your-server/api/v1/identify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_uuid: clientUUID,
    device_info: deviceInfo
  })
});

const result = await response.json();
console.log('User Identity:', result.user_id);
console.log('Status:', result.status); // 'recognized', 'recovered', or 'new'
```

### Server API

#### POST /api/v1/identify
Identify or create user based on client UUID and device fingerprint.

**Request:**
```json
{
  "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "device_info": {
    "userAgent": "Mozilla/5.0...",
    "screen": { "width": 1920, "height": 1080 },
    "canvas": "hash_of_canvas_fingerprint",
    "audio": "hash_of_audio_fingerprint",
    ...
  }
}
```

**Response:**
```json
{
  "user_id": "usr_123456",
  "session_id": "ses_789012",
  "status": "recognized",
  "confidence": 0.98,
  "is_device_changed": false
}
```

## Features

### Device Fingerprinting
- Canvas fingerprinting for GPU/driver detection
- Audio context fingerprinting
- Font enumeration
- WebGL renderer information
- Hardware concurrency detection
- Screen and color depth analysis

### Identity Matching
- Multi-level matching algorithm
- Weighted similarity scoring
- Configurable confidence thresholds
- Automatic identity recovery

### Change Detection
- Real-time device change detection
- Historical change tracking
- Change classification (minor/major/reset)
- Timeline visualization

### Dashboard
- Device history timeline
- Side-by-side device comparison
- Change statistics and analytics
- Export functionality

## Configuration

### Server Configuration
Edit `server/.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iky
DB_USER=postgres
DB_PASSWORD=your_password

# API
API_PORT=3000
API_HOST=0.0.0.0

# Matching thresholds
MATCH_CONFIDENCE_THRESHOLD=0.75
DEVICE_CHANGE_THRESHOLD=0.5
```

## Development

### Database Management with Prisma

IKY includes Prisma ORM for type-safe database access:

```bash
# Generate Prisma Client
cd server && pnpm run prisma:generate

# Open Prisma Studio (visual database browser)
pnpm run prisma:studio

# Create a migration
pnpm run prisma:migrate
```

See [server/PRISMA.md](server/PRISMA.md) for detailed Prisma usage.

### Running Tests
```bash
# Server tests
cd server && pnpm test

# Client tests
cd client && pnpm test
```

### Building for Production
```bash
# Build client library
cd client && pnpm run build

# Server runs directly from source
cd server && pnpm start
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# View logs
docker-compose logs -f server

# Rebuild after changes
docker-compose up -d --build server
```

## Security Features

IKY implements comprehensive security measures:

- ✅ **Rate Limiting**: Prevents abuse with configurable limits
- ✅ **Enhanced Security Headers**: Using Helmet.js with CSP
- ✅ **Input Validation**: All API inputs are validated
- ✅ **Hash-Based Storage**: Fingerprints stored as SHA-256 hashes
- ✅ **CORS Protection**: Configurable origin policies
- ✅ **GDPR Compliance**: UUID deletion capability
- ✅ **Automated Security Audits**: CI/CD pipeline includes security checks

## Monitoring and Logging

The system includes comprehensive logging and monitoring:
- Identity recognition events
- Match success/recovery rates
- API performance metrics
- Anomaly detection alerts

## CI/CD Pipeline

Automated testing and deployment:
- ✅ Lint and test on every push
- ✅ Security audits
- ✅ Database integration tests
- ✅ Coverage reporting
- ✅ Automated builds
- ✅ Docker image building and publishing
- ✅ Automatic release creation with timestamp tags
- ✅ Multi-platform Docker support (linux/amd64, linux/arm64)

### Releases

On every successful build to `main`, a new release is automatically created with:
- Timestamp-based tag (e.g., `202510031541`)
- Client and server artifacts (tar.gz)
- Docker images published to GitHub Container Registry
- Automatic release notes with changes

Pull Docker images:
```bash
docker pull ghcr.io/sysfox/iky-server:latest
docker pull ghcr.io/sysfox/iky-server:202510031541
```

## Security Considerations

- All device information is hashed before storage
- No PII (Personally Identifiable Information) is collected without consent
- UUID management includes secure fallback mechanisms
- API endpoints should be protected with authentication in production
- Regular security audits via pnpm audit

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## Support

For issues and questions:
- GitHub Issues: https://github.com/sysfox/Hey-INY/issues
- Documentation: https://github.com/sysfox/Hey-INY/wiki

## Acknowledgments

This project implements advanced device fingerprinting techniques for user identification while respecting user privacy.

---

**Built with Node.js 22+, pnpm, and modern security practices.**
