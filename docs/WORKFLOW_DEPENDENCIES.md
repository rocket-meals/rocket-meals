# Workflow Dependencies and Trigger Optimization

This document explains the optimized GitHub Actions workflow structure for the Rocket Meals project.

## Workflow Structure

### 1. Auto-Linter (`01-auto-linter.yml`)
- **Triggers**: Push and PR to master/main branches
- **Purpose**: Formats and lints code, commits changes with `[skip ci]`
- **Runs**: Always first, before other workflows

### 2. Build & Submit Workflows
- **Android**: `frontend_native_android.yml`
- **iOS**: `frontend_native_ios.yml` 
- **Android Preview**: `frontend_native_android_preview.yml`

**Triggers**:
- `workflow_run` from Auto-Linter (primary)
- `push` to master when `config.ts` changes (fallback for build number updates)

**Conditional Execution**:
- Only run if build number changed (checked via `check-build-number` action)
- Support both workflow_run and direct push triggers

### 3. Deployment Workflows
- **Expo Update**: `frontend_expo_update.yml`
- **GH-Pages**: `frontend_web_ghpages_production.yml`

**Triggers**:
- `workflow_run` from Auto-Linter only
- Always run when Auto-Linter completes successfully

### 4. Build Number Increment (Optional)
- **Manual**: `increment_build_number.yml`
- **Trigger**: `workflow_dispatch` (manual execution)
- **Purpose**: Automated build number incrementation when needed

## Key Improvements

### ✅ Optimized Trigger Logic
- Removed conflicting path-based triggers
- Primary dependency on Auto-Linter via `workflow_run`
- Fallback triggers for build number updates

### ✅ Better Conditional Execution
- Build workflows only run when build numbers change
- Support both Auto-Linter completion and direct config updates
- Proper handling of edge cases

### ✅ Enhanced Setup Action
- Improved caching for faster builds
- Parameterized for better reusability
- Removed duplicate dependency installations

## How It Solves the Original Problem

**Before**:
1. Auto-Linter commits with `[skip ci]`
2. Build number updates pushed separately 
3. iOS/Android workflows miss these updates

**After**:
1. Auto-Linter runs and commits formatting (with `[skip ci]`)
2. Build workflows trigger via `workflow_run` after Auto-Linter
3. If build numbers updated separately, direct `push` trigger catches them
4. Build number check ensures only meaningful changes trigger builds

## Build Number Management

### Current Approach
- Build numbers are defined in `apps/frontend/app/config.ts`
- Function `getBuildNumber()` returns the current number
- Manual updates to this function trigger workflows

### Optional Automation
- Use `increment_build_number.yml` for automated increments
- Supports both patch (+1) and minor (+10) increments  
- Triggers Auto-Linter and subsequent build workflows

## Workflow Dependencies

```
Push to master
     ↓
Auto-Linter
     ↓
Build Number Check
     ↓
[If changed] → Build & Submit (iOS/Android)
     ↓
Expo Update & GH-Pages (always)
```

## Usage

### For Regular Development
1. Push code changes to master
2. Auto-Linter formats and commits
3. If build number changed, builds trigger automatically
4. All deployments happen in sequence

### For Build Number Updates
**Option 1**: Manual update `config.ts` and push
**Option 2**: Use "Increment Build Number" workflow in GitHub Actions UI

Both approaches will trigger the complete build pipeline.