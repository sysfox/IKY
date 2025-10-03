# Hey-INY API Documentation

## Overview

The Hey-INY API provides user identity recognition and device fingerprinting services. It uses a three-layer identity system to identify users across sessions and devices.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Currently, the API does not require authentication. In production, you should implement proper authentication mechanisms.

## Endpoints

### 1. User Identification

Identify or create a user based on client UUID and device fingerprint.

**Endpoint:** `POST /identify`

**Request Body:**
```json
{
  "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "device_info": {
    "collectedAt": "2024-01-15T10:30:00Z",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "platform": "Win32",
    "language": "en-US",
    "languages": ["en-US", "en"],
    "timezone": "America/New_York",
    "timezoneOffset": 300,
    "cookieEnabled": true,
    "doNotTrack": "unspecified",
    "screen": {
      "width": 1920,
      "height": 1080,
      "availWidth": 1920,
      "availHeight": 1040,
      "colorDepth": 24,
      "pixelDepth": 24,
      "pixelRatio": 1,
      "orientation": "landscape-primary"
    },
    "hardware": {
      "hardwareConcurrency": 8,
      "deviceMemory": 16,
      "maxTouchPoints": 0
    },
    "browser": {
      "plugins": [],
      "mimeTypes": [],
      "localStorage": true,
      "sessionStorage": true,
      "indexedDB": true
    },
    "network": {
      "effectiveType": "4g"
    },
    "canvas": {
      "hash": "abc123def456...",
      "width": 280,
      "height": 60
    },
    "audio": {
      "hash": "789xyz012...",
      "sampleSize": 100
    },
    "fonts": {
      "fonts": ["Arial", "Verdana", "Times New Roman"],
      "count": 3
    },
    "webgl": {
      "vendor": "Google Inc.",
      "renderer": "ANGLE (Intel, Mesa Intel(R) UHD Graphics 630)",
      "version": "WebGL 1.0",
      "shadingLanguageVersion": "WebGL GLSL ES 1.0",
      "extensions": ["WEBGL_compressed_texture_s3tc", "..."],
      "maxTextureSize": 16384,
      "maxViewportDims": [16384, 16384]
    }
  }
}
```

**Response (Success - Recognized User):**
```json
{
  "success": true,
  "data": {
    "user_id": "usr_abc123xyz789",
    "session_id": "ses_def456uvw012",
    "status": "recognized",
    "confidence": 1.0,
    "is_device_changed": false
  }
}
```

**Response (Success - Recovered User):**
```json
{
  "success": true,
  "data": {
    "user_id": "usr_abc123xyz789",
    "session_id": "ses_ghi789rst345",
    "status": "recovered",
    "confidence": 0.92,
    "is_device_changed": true,
    "change_type": "device_reset"
  }
}
```

**Response (Success - New User):**
```json
{
  "success": true,
  "data": {
    "user_id": "usr_new456def789",
    "session_id": "ses_new789ghi012",
    "status": "new",
    "confidence": 1.0,
    "is_device_changed": false
  }
}
```

**Status Codes:**
- `200 OK` - Successful identification
- `400 Bad Request` - Missing or invalid parameters
- `500 Internal Server Error` - Server error

---

### 2. Get Device History

Retrieve device change history for a specific user.

**Endpoint:** `GET /users/:userId/device-history`

**Parameters:**
- `userId` (path) - User identity ID (e.g., "usr_abc123xyz789")
- `page` (query, optional) - Page number (default: 1)
- `per_page` (query, optional) - Items per page (default: 50)
- `change_type` (query, optional) - Filter by change type ("minor", "major", "device_reset", "new_device")

**Example Request:**
```
GET /api/v1/users/usr_abc123xyz789/device-history?page=1&per_page=20&change_type=major
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "device_session_id": "ses_def456uvw012",
      "previous_session_id": "ses_abc123xyz789",
      "change_type": "major",
      "change_category": "os_change",
      "changed_fields": ["platform", "user_agent", "screen_width"],
      "change_summary": "Device major detected: os_change",
      "match_confidence": 0.82,
      "detected_at": "2024-01-15T14:30:00Z",
      "previous_values": {},
      "new_values": {}
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### 3. Get User Statistics

Get statistics for a specific user.

**Endpoint:** `GET /users/:userId/statistics`

**Parameters:**
- `userId` (path) - User identity ID

**Example Request:**
```
GET /api/v1/users/usr_abc123xyz789/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_identity_id": "usr_abc123xyz789",
    "created_at": "2024-01-01T10:00:00Z",
    "last_seen_at": "2024-01-15T16:45:00Z",
    "total_sessions": 15,
    "total_devices": 3,
    "active_devices": 2,
    "total_changes": 12,
    "last_change_at": "2024-01-14T09:20:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### 4. Compare Devices

Compare two device profiles to see differences and similarity.

**Endpoint:** `POST /devices/compare`

**Request Body:**
```json
{
  "session_id_1": "ses_abc123xyz789",
  "session_id_2": "ses_def456uvw012"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "device1": {
      "session_id": "ses_abc123xyz789",
      "platform": "Win32",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "first_seen": "2024-01-01T10:00:00Z",
      "last_seen": "2024-01-10T18:30:00Z"
    },
    "device2": {
      "session_id": "ses_def456uvw012",
      "platform": "MacIntel",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "first_seen": "2024-01-11T09:15:00Z",
      "last_seen": "2024-01-15T16:45:00Z"
    },
    "similarity": {
      "totalScore": 0.35,
      "breakdown": {
        "canvas": 0,
        "audio": 0,
        "hardware": 0.15,
        "screen": 0.10,
        "fonts": 0.10
      },
      "isMatch": false
    },
    "changed_fields": [
      "platform",
      "user_agent",
      "canvas_fingerprint",
      "audio_fingerprint",
      "screen_width",
      "screen_height"
    ]
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing parameters
- `404 Not Found` - Device profile not found
- `500 Internal Server Error` - Server error

---

### 5. Health Check

Check API and database health.

**Endpoint:** `GET /health`

**Response (Healthy):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T16:45:00Z"
}
```

**Response (Unhealthy):**
```json
{
  "success": false,
  "status": "unhealthy",
  "error": "Database connection failed"
}
```

**Status Codes:**
- `200 OK` - Healthy
- `503 Service Unavailable` - Unhealthy

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Rate Limiting

Currently not implemented. In production, implement rate limiting to prevent abuse.

## Best Practices

1. **Collect device fingerprints responsibly** - Only collect necessary information
2. **Cache client UUIDs** - Use the client library's UUID management
3. **Handle errors gracefully** - Always implement proper error handling
4. **Respect user privacy** - Provide opt-out mechanisms
5. **Monitor API usage** - Track identification success rates

## GDPR Compliance

To comply with GDPR:
- Implement user consent mechanisms
- Provide data deletion endpoints
- Log all data access
- Implement data portability
- Document data retention policies

## Support

For issues and questions:
- GitHub Issues: https://github.com/sysfox/Hey-INY/issues
- Documentation: https://github.com/sysfox/Hey-INY/wiki
