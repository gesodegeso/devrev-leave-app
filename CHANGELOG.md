# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-01-11

### Added
- CloudAdapter support for Bot Framework (replaced deprecated BotFrameworkAdapter)
- SingleTenant configuration support with MICROSOFT_APP_TENANT_ID
- Comprehensive documentation for troubleshooting and setup
- JWT token retrieval test script
- Environment variable validation script
- Production diagnostics script (check-production.sh)
- Deprecation warning suppression via nodemon.json and ecosystem.config.js

### Changed
- **[BREAKING]** Updated DevRev API endpoints to latest specification:
  - `/internal/tickets.create` → `/works.create`
  - `/internal/dev-users.self` → `/dev-users.self`
  - Response structure changed from `ticket` to `work` object
  - URL format changed to use `display_id` instead of internal ID
- Migrated from BotFrameworkAdapter to CloudAdapter
- Updated Node.js version requirement to v22.x (v25+ not supported due to restify)
- Enhanced error handling for DevRev API calls
- Improved test scripts with better error messages

### Fixed
- 401 Authorization errors by migrating to CloudAdapter
- http_parser deprecation warnings via --no-deprecation flag
- Node.js v25 compatibility issues

### Documentation
- Added [CLOUDADAPTER_MIGRATION.md](docs/CLOUDADAPTER_MIGRATION.md) - CloudAdapter migration guide
- Added [SINGLE_TENANT_SETUP.md](docs/SINGLE_TENANT_SETUP.md) - SingleTenant configuration guide
- Added [DEVREV_API_UPDATE.md](docs/DEVREV_API_UPDATE.md) - DevRev API updates
- Added [PRODUCTION_401_ERROR.md](docs/PRODUCTION_401_ERROR.md) - 401 error troubleshooting
- Added [TROUBLESHOOTING_AUTH.md](docs/TROUBLESHOOTING_AUTH.md) - Authentication troubleshooting
- Added [JWT_TOKEN_GUIDE.md](docs/JWT_TOKEN_GUIDE.md) - JWT token acquisition guide
- Added [DEPRECATION_WARNING_GUIDE.md](docs/DEPRECATION_WARNING_GUIDE.md) - Deprecation warning guide
- Updated README.md with reorganized documentation links

### Deprecated
- BotFrameworkAdapter (removed in favor of CloudAdapter)
- DevRev internal API endpoints (migrated to public API)

---

## API Migration Summary

### DevRev API Changes

| Aspect | Old | New |
|--------|-----|-----|
| Create endpoint | `/internal/tickets.create` | `/works.create` |
| Get endpoint | `/internal/tickets.get` | `/works.get` |
| Update endpoint | `/internal/tickets.update` | `/works.update` |
| Response key | `ticket` | `work` |
| ID field | `ticket.id` | `work.id` + `work.display_id` |
| URL format | `/tickets/{id}` | `/work/{display_id}` |

### Bot Framework Changes

| Aspect | Old | New |
|--------|-----|-----|
| Adapter class | `BotFrameworkAdapter` | `CloudAdapter` |
| Authentication | Simple config | `ConfigurationServiceClientCredentialFactory` |
| Tenant support | Limited | Full SingleTenant/MultiTenant support |

---

## Migration Guide

### For Existing Deployments

1. **Update environment variables:**
   ```bash
   # Add to .env
   MICROSOFT_APP_TYPE=MultiTenant
   # Optional for SingleTenant:
   # MICROSOFT_APP_TENANT_ID=your-tenant-id
   ```

2. **Pull latest code:**
   ```bash
   git pull origin main
   ```

3. **Restart the bot:**
   ```bash
   pm2 restart teams-leave-bot
   ```

4. **Verify:**
   ```bash
   npm run test:devrev
   pm2 logs teams-leave-bot
   ```

### For New Deployments

Follow the updated guides:
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [AZURE_SETUP_MULTITENANT.md](AZURE_SETUP_MULTITENANT.md) - Azure Bot setup

---

## Breaking Changes

### DevRev Service API

If you have custom code using `DevRevService`:

**Before:**
```javascript
const result = await devrev.createLeaveRequestTicket(data, user);
console.log('Ticket ID:', result.ticketId);
console.log('URL:', result.ticketUrl);
```

**After:**
```javascript
const result = await devrev.createLeaveRequestTicket(data, user);
console.log('Work ID:', result.ticketId);
console.log('Display ID:', result.displayId); // New field
console.log('URL:', result.ticketUrl); // Now uses display_id
```

### Method Renames

- `getTicket(ticketId)` → `getWork(workId)`
- `updateTicketStatus(ticketId, status)` → `updateWork(workId, updates)`

---

## Known Issues

### Deprecation Warnings

**Issue:** `(node:xxx) [DEP0111] DeprecationWarning: Access to process.binding('http_parser') is deprecated`

**Status:** Suppressed via `--no-deprecation` flag

**Long-term fix:** Waiting for restify package update or migration to Express

**Details:** See [docs/DEPRECATION_WARNING_GUIDE.md](docs/DEPRECATION_WARNING_GUIDE.md)

---

## Acknowledgments

- Microsoft Bot Framework team for CloudAdapter
- DevRev team for updated API documentation
- Community contributions and issue reports

---

**Project Version:** 1.0.0
**Last Updated:** 2025-01-11
