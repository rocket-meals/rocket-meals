# Backend Auto-Sync Setup Documentation

This document describes the new automated collection synchronization feature for the Rocket Meals backend.

## Overview

The backend now supports automatic collection synchronization during startup using the new `backend-auto-sync-hook`. This feature enables seamless deployment without manual schema synchronization steps.

## Environment Variable Configuration

### BACKEND_AUTO_SYNC_MODE

Controls the automatic collection synchronization behavior during backend startup.

**Options:**
- `disabled` (default) - No automatic sync, manual sync only
- `test` - Test environment mode with limited collection sync
- `full` - Complete sync for production environment with all collections

**Example in .env:**
```bash
# Backend Auto-Sync Configuration
BACKEND_AUTO_SYNC_MODE="full"
```

## Setup Modes

### 1. Disabled Mode (`disabled`)
- **Use case:** Development environments, manual control required
- **Behavior:** No automatic synchronization occurs
- **Manual sync:** Use `apps/backend/sync/pull.sh` or `push.sh` scripts

### 2. Test Mode (`test`)  
- **Use case:** Test environments, CI/CD pipelines
- **Behavior:** Limited collection cleanup only (via collections-last-update-hook)
- **Schema sync:** Skipped to avoid conflicts in test environments

### 3. Full Mode (`full`)
- **Use case:** Production deployments
- **Behavior:** Complete schema synchronization on startup
- **Process:** 
  1. Database initialization check
  2. Automatic schema pull from configuration
  3. Collection synchronization
  4. Collection cleanup and missing collection creation

## Technical Implementation

### Components

1. **backend-auto-sync-hook** (`src/backend-auto-sync-hook/index.ts`)
   - New Directus hook for automatic sync during app startup
   - Integrates with existing `importSchema.js` sync functionality
   - Supports different sync modes via environment variables

2. **Enhanced importSchema.js** (`apps/backend/sync/importSchema.js`)
   - Added support for non-interactive mode (`AUTO_SYNC_MODE=true`)
   - Automatic credential and URL configuration in auto mode
   - Compatible with existing manual sync workflows

3. **Extended EnvVariableHelper** (`src/helpers/EnvVariableHelper.ts`)
   - New enum `BackendAutoSyncModeEnum` for sync mode values
   - Helper methods for checking sync modes and states

### Startup Process (Full Mode)

1. **Hook Registration** - `backend-auto-sync-hook` registers for `app.after` event
2. **Database Check** - Verifies all required tables exist before proceeding
3. **Environment Check** - Reads `BACKEND_AUTO_SYNC_MODE` configuration
4. **Sync Execution** - Spawns `importSchema.js pull` process with auto mode
5. **Collection Sync** - Pulls latest schema configuration and synchronizes collections
6. **Cleanup** - Ensures all collections are tracked in `collections_dates_last_update`

### Error Handling

- Graceful degradation: Sync errors do not prevent app startup
- Comprehensive logging: All sync operations are logged for debugging
- Timeout protection: 5-second delay before sync to ensure app readiness

## Deployment Guide

### For Production Environments

1. **Set environment variable:**
   ```bash
   BACKEND_AUTO_SYNC_MODE="full"
   ```

2. **Deploy container:**
   - Backend will automatically sync collections on startup
   - No manual intervention required
   - Monitor logs for sync completion

### For Test Environments

1. **Set environment variable:**
   ```bash
   BACKEND_AUTO_SYNC_MODE="test"
   ```

2. **Deploy container:**
   - Limited sync to avoid conflicts
   - Collection tracking still maintained
   - Manual schema sync available if needed

### For Development

1. **Keep default or set explicitly:**
   ```bash
   BACKEND_AUTO_SYNC_MODE="disabled"
   ```

2. **Manual sync when needed:**
   ```bash
   cd apps/backend/sync
   ./pull.sh  # or ./push.sh
   ```

## Migration from Existing Setups

### Existing Test-Only Setups
- Change `BACKEND_AUTO_SYNC_MODE` from `disabled` to `test`
- Existing functionality remains unchanged

### Manual Sync Workflows
- Can continue using manual sync scripts
- Auto-sync does not interfere with manual operations
- Both approaches can be used simultaneously

## Troubleshooting

### Common Issues

1. **Sync fails on startup:**
   - Check database connectivity
   - Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` in .env
   - Ensure Directus is fully started before sync

2. **Collections not synchronized:**
   - Verify `BACKEND_AUTO_SYNC_MODE` is set to `full`
   - Check logs for sync process output
   - Manually trigger sync: `cd apps/backend/sync && ./pull.sh`

3. **Startup hangs:**
   - Auto-sync has 5-second delay - this is normal
   - Check for sync process completion in logs
   - Verify no interactive prompts in sync scripts

### Log Messages to Monitor

```
Backend Auto-Sync: Mode is set to 'full'
Backend Auto-Sync: App started, checking auto-sync configuration...
Backend Auto-Sync: Full mode - executing schema synchronization
Backend Auto-Sync: Starting schema synchronization...
Backend Auto-Sync: Schema synchronization completed successfully
```

## Backwards Compatibility

- **Existing installations:** No impact when `BACKEND_AUTO_SYNC_MODE` is `disabled` (default)
- **Manual scripts:** Continue to work without modification
- **Environment variables:** All existing variables remain functional
- **Hooks:** Existing hooks like `collections-last-update-hook` continue to operate

## Future Enhancements

- **Selective sync:** Sync only specific collections in test mode
- **Retry logic:** Automatic retry on sync failures
- **Health checks:** Integration with container health check endpoints
- **Sync scheduling:** Periodic automatic synchronization beyond startup