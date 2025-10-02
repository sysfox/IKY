# Hey-INY - User Identity & Device Fingerprinting System

A comprehensive user identity recognition system based on a three-layer identity architecture and complete device profiling.

## Overview

This system implements a sophisticated user identification mechanism that combines:
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
Hey-INY/
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
- Node.js >= 16.x
- PostgreSQL >= 13.x
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sysfox/Hey-INY.git
cd Hey-INY
```

2. Install dependencies:
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Install dashboard dependencies
cd ../dashboard && npm install
```

3. Setup database:
```bash
# Create PostgreSQL database
createdb hey_iny

# Run migrations
cd ../database
psql hey_iny < migrations/001_initial_schema.sql
```

4. Configure environment:
```bash
# Copy example environment file
cp server/.env.example server/.env

# Edit .env with your database credentials
```

5. Start the services:
```bash
# Start server
cd server && npm start

# Start dashboard (in another terminal)
cd dashboard && npm run dev
```

## Usage

### Client Integration

```javascript
import { DeviceFingerprint, UUIDManager } from 'hey-iny-client';

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
DB_NAME=hey_iny
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

### Running Tests
```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test
```

### Building for Production
```bash
# Build client library
cd client && npm run build

# Build dashboard
cd dashboard && npm run build

# Build server
cd server && npm run build
```

## Monitoring and Logging

The system includes comprehensive logging and monitoring:
- Identity recognition events
- Match success/recovery rates
- API performance metrics
- Anomaly detection alerts

## Security Considerations

- All device information is hashed before storage
- No PII (Personally Identifiable Information) is collected without consent
- UUID management includes secure fallback mechanisms
- API endpoints should be protected with authentication in production

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
