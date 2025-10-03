# IKY - I Know You

## User Identity & Device Fingerprinting System

A comprehensive user identity recognition system based on a three-layer identity architecture and complete device profiling.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- External PostgreSQL database (13+)

### Deployment Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sysfox/IKY.git
   cd IKY
   ```

2. **Configure environment**:
   ```bash
   cp .env.docker.example .env
   nano .env
   ```
   
   Configure your external PostgreSQL database:
   - `DB_HOST` - Your PostgreSQL server hostname
   - `DB_NAME` - Database name
   - `DB_USER` - Database user
   - `DB_PASSWORD` - Strong database password
   - `DB_PORT` - Database port (default: 5432)

3. **Start the service**:
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**:
   ```bash
   docker-compose ps
   docker-compose logs -f server
   
   # Test the API
   curl http://localhost:3010/api/v1/health
   ```

5. **Access Admin Panel**:
   Open your browser and navigate to:
   ```
   http://localhost:3010/admin.html
   ```

For detailed Docker deployment instructions, see [DOCKER.md](DOCKER.md).

## ✨ Features

- **Automatic Database Migrations** - Database schema is automatically migrated on server startup
- **Web Admin Panel** - Beautiful web interface for user registration and management
- **Three-Layer Identity System** - Client UUID + Device Fingerprinting + Complete History
- **Admin Role Management** - First registered user automatically becomes admin
- **Registration Control** - Enable/disable new user registration from admin panel

## 🎯 Admin Panel

The admin panel provides:
- Dashboard with system statistics
- User management and viewing
- UUID management and deletion
- Registration control (enable/disable)
- Real-time monitoring

**First-time Setup**: The first user registered via `/api/v1/identify` automatically becomes an admin.

## 🔧 Configuration

Default configuration:
- **Port**: 3010
- **Database Migrations**: Automatic on startup
- **Admin Panel**: Available at `/admin.html`

See `.env.docker.example` for all available environment variables.

## 📚 API Documentation

### Main Endpoints

- `GET /` - API information
- `GET /api/v1/health` - Health check
- `POST /api/v1/identify` - User identification
- `GET /api/v1/users/:userId/device-history` - Device history
- `GET /api/v1/users/:userId/statistics` - User statistics

### Admin Endpoints (require X-User-ID header with admin role)

- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/uuids` - List all UUIDs
- `GET /api/v1/admin/users/:userId/profile` - User profile
- `DELETE /api/v1/admin/uuids/:uuid` - Delete UUID
- `PATCH /api/v1/admin/settings/:key` - Update settings

## 🏗️ Architecture

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

## 📦 Project Structure

```
IKY/
├── server/                 # Server-side API with admin panel
│   ├── src/
│   │   ├── api/           # REST API endpoints
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utility functions (incl. migrations)
│   │   └── index.js       # Main entry point
│   ├── public/            # Static files (admin panel)
│   └── package.json
├── client/                # Client-side fingerprinting library
│   └── src/
├── database/              # Database migrations
│   └── migrations/
├── docker-compose.yml     # Docker composition
└── DOCKER.md             # Docker deployment guide
```

## 🛠️ Usage

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
const response = await fetch('http://localhost:3010/api/v1/identify', {
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

### API Example

**POST /api/v1/identify**
```json
{
  "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "device_info": {
    "userAgent": "Mozilla/5.0...",
    "screen": { "width": 1920, "height": 1080 },
    "canvas": "hash_of_canvas_fingerprint",
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

## 🔒 Security Features

- ✅ **Rate Limiting**: Prevents abuse with configurable limits
- ✅ **Enhanced Security Headers**: Using Helmet.js with CSP
- ✅ **Input Validation**: All API inputs are validated
- ✅ **Hash-Based Storage**: Fingerprints stored as SHA-256 hashes
- ✅ **CORS Protection**: Configurable origin policies
- ✅ **GDPR Compliance**: UUID deletion capability
- ✅ **Admin Authentication**: Role-based access control

## 📄 License

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
