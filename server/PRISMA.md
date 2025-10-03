# Prisma Integration Guide

IKY now includes Prisma ORM for type-safe database access and migrations.

## Setup

### 1. Install Dependencies

Dependencies are already included in `package.json`:
- `@prisma/client` - Prisma Client for database queries
- `prisma` - Prisma CLI for migrations and schema management

### 2. Configure Database URL

Set the `DATABASE_URL` environment variable in your `.env` file:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/iky"
```

Alternatively, Prisma will construct the URL from individual `DB_*` variables if `DATABASE_URL` is not set.

### 3. Generate Prisma Client

Generate the Prisma Client based on your schema:

```bash
pnpm run prisma:generate
```

This creates type-safe database client code in `node_modules/@prisma/client`.

## Using Prisma

### Basic Usage

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new user identity
const user = await prisma.userIdentity.create({
  data: {
    userIdentityId: 'usr_123456789',
    metadata: {
      source: 'web'
    }
  }
});

// Find user by ID
const foundUser = await prisma.userIdentity.findUnique({
  where: {
    userIdentityId: 'usr_123456789'
  },
  include: {
    deviceProfiles: true,
    deviceChangeHistory: true
  }
});

// Update user
await prisma.userIdentity.update({
  where: {
    id: user.id
  },
  data: {
    lastSeenAt: new Date(),
    totalSessions: {
      increment: 1
    }
  }
});
```

### Query Examples

#### Create Device Profile

```javascript
const deviceProfile = await prisma.userDeviceProfile.create({
  data: {
    userIdentityId: user.id,
    clientUuid: 'client_uuid_123',
    canvasFingerprint: 'hash123',
    audioFingerprint: 'hash456',
    userAgent: 'Mozilla/5.0...',
    platform: 'MacIntel',
    deviceInfoRaw: {
      browser: 'Chrome',
      version: '120.0'
    },
    fontsList: ['Arial', 'Helvetica'],
    pluginsList: []
  }
});
```

#### Find User with Device Profiles

```javascript
const userWithDevices = await prisma.userIdentity.findUnique({
  where: { userIdentityId: 'usr_123456789' },
  include: {
    deviceProfiles: {
      where: { isCurrent: true },
      orderBy: { lastSeenAt: 'desc' }
    }
  }
});
```

#### Track Device Change

```javascript
const change = await prisma.deviceChangeHistory.create({
  data: {
    userIdentityId: user.id,
    deviceSessionId: 'ses_abc123',
    previousSessionId: 'ses_xyz789',
    changeType: 'minor',
    changeCategory: 'browser_update',
    changedFields: ['userAgent'],
    changeSummary: 'Browser version updated',
    matchConfidence: 0.95,
    previousValues: { version: '119.0' },
    newValues: { version: '120.0' }
  }
});
```

#### Get User Statistics

```javascript
const stats = await prisma.userIdentity.findUnique({
  where: { userIdentityId: 'usr_123456789' },
  include: {
    _count: {
      select: {
        deviceProfiles: true,
        deviceChangeHistory: true,
        matchingLogs: true
      }
    }
  }
});
```

## Database Migrations

### Creating Migrations

After modifying `schema.prisma`, create a migration:

```bash
# Development - creates migration and applies it
pnpm run prisma:migrate

# You'll be prompted for a migration name
# e.g., "add_user_preferences"
```

### Applying Migrations

```bash
# Production - applies pending migrations
pnpm run prisma:migrate:prod
```

### Migration Status

```bash
# Check migration status
npx prisma migrate status
```

## Prisma Studio

Prisma Studio is a visual database browser:

```bash
pnpm run prisma:studio
```

This opens a web interface at http://localhost:5555 where you can:
- Browse all tables
- View and edit data
- Run queries
- Inspect relationships

## Schema Management

### Pull Schema from Database

If you make changes directly to the database, you can introspect and update your schema:

```bash
pnpm run prisma:pull
```

### Push Schema to Database

For rapid prototyping, push schema changes without migrations:

```bash
pnpm run prisma:push
```

⚠️ Use with caution in production - prefer migrations.

## Advanced Usage

### Transactions

```javascript
// Execute multiple operations in a transaction
await prisma.$transaction([
  prisma.userIdentity.update({
    where: { id: userId },
    data: { totalSessions: { increment: 1 } }
  }),
  prisma.identityMatchingLog.create({
    data: {
      userIdentityId: userId,
      matchStatus: 'recognized',
      matchMethod: 'uuid_direct',
      attemptedAt: new Date()
    }
  })
]);
```

### Raw Queries

```javascript
// Execute raw SQL if needed
const result = await prisma.$queryRaw`
  SELECT * FROM user_identities 
  WHERE last_seen_at > NOW() - INTERVAL '7 days'
`;
```

### Middleware

```javascript
// Add logging middleware
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
  return result;
});
```

## Best Practices

1. **Connection Management**
   ```javascript
   // Create a single instance
   const prisma = new PrismaClient();
   
   // Disconnect when done
   await prisma.$disconnect();
   ```

2. **Error Handling**
   ```javascript
   try {
     const user = await prisma.userIdentity.create({ ... });
   } catch (error) {
     if (error.code === 'P2002') {
       // Unique constraint violation
       console.error('User already exists');
     }
     throw error;
   }
   ```

3. **Use Select to Limit Fields**
   ```javascript
   const user = await prisma.userIdentity.findUnique({
     where: { id },
     select: {
       userIdentityId: true,
       lastSeenAt: true,
       // Only fetch needed fields
     }
   });
   ```

4. **Pagination**
   ```javascript
   const devices = await prisma.userDeviceProfile.findMany({
     where: { userIdentityId },
     skip: (page - 1) * perPage,
     take: perPage,
     orderBy: { lastSeenAt: 'desc' }
   });
   ```

## Migrating from Raw SQL

If you're currently using raw PostgreSQL queries via the `pg` library, you can gradually migrate:

1. **Keep both approaches working** - Prisma and pg can coexist
2. **Start with reads** - Use Prisma for SELECT queries first
3. **Move to writes** - Migrate INSERT/UPDATE/DELETE queries
4. **Refactor complex queries** - Use Prisma's query builder or raw queries

Example migration:

```javascript
// Before (pg)
const result = await pool.query(
  'SELECT * FROM user_identities WHERE user_identity_id = $1',
  [userId]
);
const user = result.rows[0];

// After (Prisma)
const user = await prisma.userIdentity.findUnique({
  where: { userIdentityId: userId }
});
```

## Prisma Scripts

Available scripts in `package.json`:

- `prisma:generate` - Generate Prisma Client
- `prisma:migrate` - Create and apply migration (dev)
- `prisma:migrate:prod` - Apply migrations (production)
- `prisma:studio` - Open Prisma Studio
- `prisma:pull` - Pull schema from database
- `prisma:push` - Push schema to database

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

## Troubleshooting

### "Can't find Prisma Client"

```bash
pnpm run prisma:generate
```

### "Database connection failed"

Check your `DATABASE_URL` in `.env`:

```bash
# Correct format
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Migration conflicts

```bash
# Reset database (⚠️ destroys all data)
npx prisma migrate reset

# Or resolve manually
npx prisma migrate resolve --rolled-back "migration_name"
```

## Support

For Prisma-specific issues:
- [Prisma Community](https://www.prisma.io/community)
- [GitHub Discussions](https://github.com/prisma/prisma/discussions)
