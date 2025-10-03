# Contributing to Hey-INY

Thank you for considering contributing to Hey-INY! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Verify the bug in the latest version
3. Collect relevant information (OS, Node.js version, logs)

Create a bug report with:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs
- Environment details

### Suggesting Features

Feature requests should include:
- Clear use case description
- Expected behavior
- Why this feature benefits users
- Possible implementation approach

### Pull Requests

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Hey-INY.git
   cd Hey-INY
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation
   - Keep commits atomic and well-described

4. **Test Your Changes**
   ```bash
   # Server tests
   cd server && npm test
   
   # Client tests
   cd client && npm test
   
   # Manual testing
   npm start
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new fingerprinting method"
   ```

   Use conventional commit format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a pull request on GitHub with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots (if UI changes)
   - Testing performed

## Development Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 13+
- Git

### Local Setup
```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Setup database
createdb hey_iny_dev
psql hey_iny_dev < database/migrations/001_initial_schema.sql

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your settings

# Start development server
cd server && npm run dev
```

## Code Style

### JavaScript Style
- Use ES6+ features
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line objects/arrays

Example:
```javascript
export class Example {
  constructor(options = {}) {
    this.value = options.value || 'default';
  }

  async performAction() {
    try {
      const result = await someAsyncOperation();
      return result;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}
```

### Database Conventions
- Snake_case for table and column names
- Plural table names (e.g., `user_identities`)
- Always include timestamps (`created_at`, `updated_at`)
- Use JSONB for flexible data storage
- Add indexes for frequently queried columns

### API Conventions
- RESTful endpoint design
- JSON request/response format
- Proper HTTP status codes
- Consistent error response format
- Include pagination for list endpoints

## Testing

### Unit Tests
```javascript
// Example test
describe('FingerprintMatcher', () => {
  it('should calculate similarity correctly', () => {
    const matcher = new FingerprintMatcher();
    const device1 = { canvas_fingerprint: 'abc123' };
    const device2 = { canvas_fingerprint: 'abc123' };
    
    const result = matcher.calculateSimilarity(device1, device2);
    
    expect(result.totalScore).toBeGreaterThan(0.5);
  });
});
```

### Integration Tests
Test API endpoints with real database:
```javascript
describe('POST /api/v1/identify', () => {
  it('should identify a new user', async () => {
    const response = await request(app)
      .post('/api/v1/identify')
      .send({
        client_uuid: 'test-uuid',
        device_info: { /* ... */ }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('new');
  });
});
```

## Documentation

### Code Comments
- Document complex algorithms
- Explain "why" not "what"
- Use JSDoc for functions

Example:
```javascript
/**
 * Calculate similarity between two device profiles
 * Uses weighted scoring across multiple fingerprint dimensions
 * 
 * @param {Object} device1 - First device profile
 * @param {Object} device2 - Second device profile
 * @returns {Object} Similarity result with score and breakdown
 */
calculateSimilarity(device1, device2) {
  // Implementation
}
```

### README Updates
Update relevant documentation when adding features:
- README.md - Main project overview
- docs/API.md - API endpoint changes
- docs/ARCHITECTURE.md - System design changes
- QUICKSTART.md - Setup process changes

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Build and test release
5. Publish to npm (if applicable)
6. Create GitHub release

## Project Structure

```
Hey-INY/
├── client/           # Client-side library
│   ├── src/         # Source files
│   └── tests/       # Client tests
├── server/          # Server API
│   ├── src/
│   │   ├── api/     # API routes
│   │   ├── services/# Business logic
│   │   ├── models/  # Data models
│   │   └── utils/   # Utilities
│   └── tests/       # Server tests
├── database/        # Database schemas
│   └── migrations/  # SQL migrations
├── docs/            # Documentation
├── examples/        # Example code
└── tools/           # Development tools
```

## Questions?

- Check existing documentation
- Search closed issues
- Ask in GitHub Discussions
- Open a new issue

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Hey-INY! 🎉
