# Admin Panel API Documentation

This document describes the admin panel features added to IKY.

## Overview

The admin panel provides features for:
1. **First user becomes admin** - The first registered user is automatically assigned the admin role
2. **Registration control** - After the first user registers, new registration is automatically disabled
3. **UUID management** - List, view details, and delete client UUIDs
4. **User profile generation** - Comprehensive user profiles with device history, statistics, and matching logs

## Database Schema Changes

### Migration 002: Admin and Registration Control

The migration adds:
- `role` column to `user_identities` table (default: 'user')
- `system_settings` table for global configuration
- Automatic triggers to set first user as admin and disable registration

## API Endpoints

All admin endpoints require authentication via the `X-User-ID` header with an admin user's ID.

### Authentication

Include the admin user ID in the request header:
```
X-User-ID: usr_xxxxxxxxxxxxx
```

### List Users

Get a paginated list of all users with statistics.

```
GET /api/v1/admin/users?page=1&per_page=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_identity_id": "usr_123456789012",
      "created_at": "2024-01-01T00:00:00Z",
      "last_seen_at": "2024-01-15T12:00:00Z",
      "total_sessions": 5,
      "total_devices": 2,
      "active_devices": 1,
      "total_changes": 3,
      "last_change_at": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

### List UUIDs

Get a paginated list of all client UUIDs.

```
GET /api/v1/admin/uuids?page=1&per_page=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "user_identity_id": "usr_123456789012",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00Z",
      "last_seen_at": "2024-01-15T12:00:00Z",
      "is_active": true,
      "session_count": 5,
      "last_device_seen": "2024-01-15T12:00:00Z",
      "platforms": ["Windows", "Android"],
      "countries": ["US", "CN"]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

### Get UUID Details

Get detailed information about a specific UUID.

```
GET /api/v1/admin/uuids/:uuid
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "device_session_id": "ses_abc123",
      "user_identity_id": "usr_123456789012",
      "role": "admin",
      "user_created_at": "2024-01-01T00:00:00Z",
      "user_last_seen_at": "2024-01-15T12:00:00Z",
      "platform": "Windows",
      "user_agent": "Mozilla/5.0...",
      "language": "en-US",
      "timezone": "America/New_York",
      "country": "US",
      "city": "New York",
      "ip_address": "192.168.1.1",
      "first_seen_at": "2024-01-01T00:00:00Z",
      "last_seen_at": "2024-01-15T12:00:00Z",
      "visit_count": 25,
      "is_current": true
    }
  ]
}
```

### Delete UUID

Delete/ban a specific UUID and all its device profiles.

```
DELETE /api/v1/admin/uuids/:uuid
```

**Response:**
```json
{
  "success": true,
  "message": "UUID deleted successfully",
  "deleted_count": 3
}
```

### Get User Profile

Generate a comprehensive user profile with complete history and statistics.

```
GET /api/v1/admin/users/:userId/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_identity_id": "usr_123456789012",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z",
      "last_seen_at": "2024-01-15T12:00:00Z",
      "is_active": true,
      "total_sessions": 5,
      "total_devices": 2,
      "metadata": {}
    },
    "devices": [
      {
        "device_session_id": "ses_abc123",
        "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "platform": "Windows",
        "user_agent": "Mozilla/5.0...",
        "language": "en-US",
        "timezone": "America/New_York",
        "country": "US",
        "city": "New York",
        "ip_address": "192.168.1.1",
        "first_seen_at": "2024-01-01T00:00:00Z",
        "last_seen_at": "2024-01-15T12:00:00Z",
        "is_current": true,
        "visit_count": 25
      }
    ],
    "device_changes": [
      {
        "change_type": "minor",
        "change_category": "browser_update",
        "change_summary": "User agent updated",
        "changed_fields": ["user_agent"],
        "match_confidence": 0.95,
        "detected_at": "2024-01-10T10:00:00Z"
      }
    ],
    "matching_logs": [
      {
        "match_status": "recognized",
        "match_method": "uuid_direct",
        "match_confidence": 1.0,
        "processing_time_ms": 45,
        "attempted_at": "2024-01-15T12:00:00Z"
      }
    ],
    "statistics": {
      "total_sessions": 5,
      "total_devices": 2,
      "total_visits": 150,
      "average_confidence": 0.98
    },
    "profile_summary": {
      "total_devices": 2,
      "active_devices": 1,
      "countries_visited": ["US", "CN"],
      "platforms_used": ["Windows", "Android"],
      "total_changes": 3,
      "total_visits": 150
    }
  }
}
```

### Update User

Update user role, active status, or metadata.

```
PATCH /api/v1/admin/users/:userId
```

**Request Body:**
```json
{
  "role": "admin",
  "is_active": true,
  "metadata": {
    "notes": "VIP user"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-of-user",
    "user_identity_id": "usr_123456789012",
    "role": "admin",
    "is_active": true,
    "metadata": {
      "notes": "VIP user"
    },
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### Get System Settings

Get all system settings.

```
GET /api/v1/admin/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "registration_enabled": false
  }
}
```

### Update System Setting

Update a specific system setting.

```
PATCH /api/v1/admin/settings/:key
```

**Request Body:**
```json
{
  "value": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "setting_key": "registration_enabled",
    "setting_value": true,
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

## Usage Examples

### Enable Registration (Admin Only)

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/settings/registration_enabled \
  -H "Content-Type: application/json" \
  -H "X-User-ID: usr_admin123" \
  -d '{"value": true}'
```

### List All Users

```bash
curl http://localhost:3000/api/v1/admin/users?page=1&per_page=50 \
  -H "X-User-ID: usr_admin123"
```

### Get User Profile

```bash
curl http://localhost:3000/api/v1/admin/users/usr_123456/profile \
  -H "X-User-ID: usr_admin123"
```

### Delete Suspicious UUID

```bash
curl -X DELETE http://localhost:3000/api/v1/admin/uuids/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-User-ID: usr_admin123"
```

## Security Considerations

1. **Admin Authentication**: All admin endpoints require the `X-User-ID` header with a valid admin user ID
2. **First User Advantage**: The first user to register automatically becomes admin - ensure your application is secured before first deployment
3. **Registration Control**: After the first user registers, registration is automatically disabled to prevent unauthorized access
4. **Manual Override**: Admins can re-enable registration via the settings endpoint if needed

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "User ID is required in X-User-ID header"
}
```

### 403 Forbidden (Non-Admin)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 403 Forbidden (Registration Disabled)
```json
{
  "success": false,
  "error": "Registration disabled",
  "message": "New user registration is currently disabled"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

## Database Migration

To apply the admin features to your database, run the migration:

```bash
psql your_database < database/migrations/002_add_admin_and_registration_control.sql
```

This migration is safe to run on existing databases as it:
- Adds new columns with default values
- Creates new tables without affecting existing data
- Sets up triggers for future user registrations
