# Architecture Documentation

## System Overview

Hey-INY is a sophisticated user identity recognition system that implements a three-layer identity architecture combined with comprehensive device profiling.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  (Web Browsers, Mobile Apps, Desktop Applications)              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    Hey-INY Client Library                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ UUID Manager │  │ Fingerprint  │  │ API Client   │         │
│  │              │  │  Collector   │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ REST API (JSON)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                     Hey-INY Server API                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               Express.js Application                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │   Identity   │  │ Fingerprint  │  │   Device     │ │    │
│  │  │   Service    │  │   Matcher    │  │   History    │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └──────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────┐    │
│  │           Database Connection Pool                      │    │
│  └──────────────────────┬─────────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          │ PostgreSQL Protocol
                          │
┌─────────────────────────▼──────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Tables:                                                │   │
│  │  • user_identities                                      │   │
│  │  • user_device_profiles                                 │   │
│  │  • device_change_history                                │   │
│  │  • identity_matching_logs                               │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Three-Layer Identity System

### Layer 1: Client UUID
**Purpose**: Persistent client-side identification

**Storage Strategy**:
1. Primary: localStorage (fastest access)
2. Fallback: IndexedDB (more storage)
3. Final Fallback: Cookie (works across contexts)

**Characteristics**:
- Generated using `crypto.randomUUID()`
- Persists across browser sessions
- Survives cache clearing (in most cases)
- Unique per browser/device combination

### Layer 2: User Identity ID
**Purpose**: Server-assigned unique user identifier

**Generation**:
- Format: `usr_[12 random characters]`
- Generated on first identification
- Permanent identifier for the user

**Tracking**:
- Total sessions count
- Total devices count
- Last seen timestamp
- Active status

### Layer 3: Device Session ID
**Purpose**: Unique identifier for each device configuration

**Generation**:
- Format: `ses_[12 random characters]`
- Created when device characteristics change
- Links to user identity

**When Created**:
- Initial device registration
- Major device changes (OS, hardware)
- Device reset scenarios
- New device access

## Device Fingerprinting Components

### 1. Canvas Fingerprinting
```javascript
Canvas → Render Pattern → Extract Image Data → SHA-256 Hash
```

**What it captures**:
- GPU/Graphics card characteristics
- Font rendering differences
- Image processing capabilities

**Reliability**: High (90%+ consistency)

### 2. Audio Fingerprinting
```javascript
AudioContext → Generate Oscillator → Process Signal → Hash Output
```

**What it captures**:
- Audio hardware characteristics
- DSP processing differences
- Sound card specifics

**Reliability**: High (85%+ consistency)

### 3. Hardware Fingerprinting
**Metrics**:
- CPU cores (`navigator.hardwareConcurrency`)
- Device memory (`navigator.deviceMemory`)
- Touch points (`navigator.maxTouchPoints`)

**Reliability**: Very High (95%+ consistency)

### 4. Screen Fingerprinting
**Metrics**:
- Width and height
- Color depth
- Pixel ratio
- Available dimensions

**Reliability**: High (but can change with monitor changes)

### 5. Font Detection
**Method**: Canvas text measurement
**Detection**: Compare text widths across font lists

**Reliability**: Medium (70%+ consistency)
**Note**: Can change with software installations

### 6. WebGL Fingerprinting
**Captures**:
- GPU vendor and renderer
- Supported extensions
- Rendering capabilities

**Reliability**: Very High (90%+ consistency)

## Multi-Level Matching Algorithm

### Level 1: UUID Direct Match
```
Input: client_uuid
↓
Query: SELECT * FROM user_device_profiles WHERE client_uuid = ?
↓
Result: Immediate user recognition (Confidence: 1.0)
```

### Level 2: Fingerprint Match
```
Input: device_fingerprint
↓
Step 1: Canvas/Audio Hash Match
Query: WHERE canvas_fingerprint = ? OR audio_fingerprint = ?
↓
Step 2: Similarity Scoring
Calculate weighted similarity across all metrics
↓
Step 3: Threshold Check
If similarity > 0.75 → Identity Recovered
```

**Similarity Calculation**:
```
Total Score = 
  (Canvas Match × 0.30) +
  (Audio Match × 0.25) +
  (Hardware Match × 0.20) +
  (Screen Match × 0.15) +
  (Font Match × 0.10)
```

### Level 3: New User Creation
```
Input: No matches found
↓
Create new user_identity
↓
Create initial device_profile
↓
Record as new_device change
```

## Change Detection System

### Change Classification

#### Minor Changes
**Threshold**: Confidence > 0.75
**Examples**:
- Browser version update
- IP address change
- Plugin additions/removals
- Font changes

**Action**: Update existing device profile

#### Major Changes
**Threshold**: Confidence 0.50-0.75
**Examples**:
- Operating system change
- Hardware replacement
- Screen resolution change
- Platform switch

**Action**: Create new device session

#### Device Reset
**Detection**: UUID changed but fingerprint matches
**Examples**:
- Browser data cleared
- Cookie/storage cleared
- Browser reinstall

**Action**: Recover identity, create new session

### Change History Tracking

```sql
device_change_history
├── change_type (minor/major/device_reset/new_device)
├── change_category (browser_update/ip_change/os_change/etc)
├── changed_fields[] (array of changed field names)
├── previous_values (JSONB)
├── new_values (JSONB)
└── match_confidence (0.0-1.0)
```

## Data Flow

### 1. Identification Flow

```
User Action
    ↓
Client Library: Get/Create UUID
    ↓
Client Library: Collect Device Fingerprint
    ↓
Client Library: POST /api/v1/identify
    ↓
Server: UUID Match? → Yes → Check for Changes → Return Result
    ↓ No
Server: Fingerprint Match? → Yes → Recover Identity → Return Result
    ↓ No
Server: Create New User → Return Result
```

### 2. Device History Query Flow

```
Client Request
    ↓
GET /api/v1/users/:userId/device-history
    ↓
Server: Query device_change_history
    ↓
Server: Apply filters (change_type, date range)
    ↓
Server: Paginate results
    ↓
Return: Change timeline with details
```

## Database Schema Design

### Core Relationships

```
user_identities (1) ←→ (Many) user_device_profiles
       ↓
       │ (1 to Many)
       ↓
device_change_history
```

### Indexes for Performance

**Primary Indexes**:
- `user_identities.user_identity_id` (Unique)
- `user_device_profiles.client_uuid` (Fast UUID lookup)
- `user_device_profiles.device_session_id` (Unique)

**Fingerprint Indexes**:
- `user_device_profiles.canvas_fingerprint`
- `user_device_profiles.audio_fingerprint`
- Composite: `(canvas_fingerprint, audio_fingerprint, webgl_fingerprint)`

**Hardware Indexes**:
- Composite: `(hardware_concurrency, device_memory, screen_width, screen_height)`

**JSONB Indexes**:
- GIN index on `device_info_raw` for flexible queries
- GIN index on `metadata` fields

### Query Optimization

**Partitioning Strategy** (for scale):
```sql
-- Partition device_change_history by month
CREATE TABLE device_change_history_y2024m01 
PARTITION OF device_change_history
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Security Considerations

### Data Protection
- All fingerprints stored as SHA-256 hashes
- No raw fingerprint data in database
- JSONB fields for flexible but controlled storage

### Privacy Compliance
- No PII collection without consent
- UUID deletion capability (GDPR)
- Audit logging for compliance
- Data retention policies

### API Security
- Rate limiting per IP
- Request validation
- CORS configuration
- Helmet.js security headers

## Performance Characteristics

### Expected Latency
- UUID Match: < 10ms (indexed query)
- Fingerprint Match: 50-100ms (similarity calculation)
- New User Creation: 100-200ms (multiple inserts)

### Scalability
- Database connection pooling (2-20 connections)
- Stateless API design (horizontal scaling)
- Indexed queries for fast lookups
- Optional Redis caching layer

### Throughput
- Single instance: 100-500 req/s
- Clustered (4 instances): 400-2000 req/s
- Database: 1000+ queries/s with proper indexing

## Monitoring Points

### Application Metrics
- API response times
- Matching success rate
- Identity recovery rate
- Error rates by endpoint

### Business Metrics
- Daily active users
- New user registrations
- Device change frequency
- Average confidence scores

### Database Metrics
- Connection pool utilization
- Query execution times
- Table sizes and growth
- Index hit rates

## Future Enhancements

### Planned Features
1. Machine learning for improved matching
2. Behavioral fingerprinting
3. Real-time fraud detection
4. Advanced analytics dashboard
5. Multi-tenant support

### Scalability Improvements
1. Redis caching layer
2. Message queue for async processing
3. Read replicas for queries
4. Microservices architecture
5. Event-driven updates

## Technology Stack

### Client
- Pure JavaScript (ES6+)
- Web APIs (Canvas, Audio, WebGL)
- Storage APIs (localStorage, IndexedDB)

### Server
- Node.js 18+
- Express.js 4.x
- PostgreSQL 13+
- pg (node-postgres)

### Infrastructure
- PM2 (process management)
- Nginx (reverse proxy)
- Let's Encrypt (SSL)
- Docker (containerization)

## Conclusion

Hey-INY provides a robust, scalable solution for user identification across sessions and devices. The three-layer architecture ensures high reliability while the comprehensive fingerprinting provides fallback mechanisms for identity recovery.

The system is designed for:
- **Accuracy**: Multi-level matching with confidence scoring
- **Privacy**: Hash-based storage, no raw fingerprints
- **Performance**: Optimized queries with proper indexing
- **Scalability**: Stateless design with horizontal scaling
- **Maintainability**: Clean separation of concerns
