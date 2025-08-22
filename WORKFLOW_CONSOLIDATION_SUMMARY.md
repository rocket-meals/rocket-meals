# GitHub Actions Workflow Consolidation - Summary

## Overview
Successfully consolidated all GitHub Actions workflows into a single, centralized CI/CD pipeline (`main-ci-cd.yml`) as requested.

## Changes Made

### 1. Created Central Workflow: `main-ci-cd.yml`
The new workflow follows the exact structure requested:

**Step 1: Setup-And-Install Job**
- Sets up Node.js 22.16.0, Yarn, and dependencies
- Installs EAS CLI for Expo builds
- Installs global tools (Prettier)

**Step 2: Linting Job**
- Runs Prettier for code formatting
- Runs ESLint for frontend code quality
- Auto-commits formatting changes on push
- Provides feedback on pull requests

**Step 3: Parallel Build Jobs** (all depend on linting completion):
- **3.a: Directus Backend Build** - Builds backend extensions
- **3.b: Expo Update** - Publishes Expo updates
- **3.c: Native Android Build** - Builds and submits Android app (conditional on build number)
- **3.d: Native Android Preview Build** - Builds Android preview APK (conditional on build number)
- **3.e: Native iOS Build** - Builds and submits iOS app (conditional on build number)
- **3.f: GH Pages Build** - Deploys to GitHub Pages

### 2. Updated Screenshot Workflow
- Remains separate as requested
- Triggers on both `pages-build-deployment` and the new main CI/CD pipeline
- Runs after GitHub Pages deployment

### 3. Conditional Build Logic
- Uses the existing `check-build-number` action
- Native builds (Android, Android Preview, iOS) only run when build number changes
- Prevents unnecessary builds when no version changes are made

### 4. Documentation Updates
- Updated README.md badges to point to the new consolidated workflow
- Updated AUTO_LINTER.md to reflect the new integrated approach
- Maintained all existing functionality while centralizing management

### 5. Backup and Safety
- All old workflow files moved to `.disabled` extension for safety
- Original files backed up in `old-workflows/` directory
- No functionality lost during transition

## Trigger Conditions
The consolidated workflow triggers on:
- Push to `master`/`main` branches
- Pull requests to `master`/`main` branches
- Changes to relevant file paths (code, configs, workflows)

## Key Benefits
✅ **Centralized Management** - All CI/CD logic in one file
✅ **Proper Dependencies** - Sequential and parallel execution as designed
✅ **Conditional Builds** - Smart building based on actual changes
✅ **Maintainability** - Easier to modify and understand workflow logic
✅ **Resource Efficiency** - Parallel execution where possible, sequential where necessary
✅ **Backwards Compatibility** - All existing functionality preserved

## Files Modified
- ✅ Created: `.github/workflows/main-ci-cd.yml`
- ✅ Updated: `.github/workflows/frontend_screenshot.yml`
- ✅ Updated: `README.md`
- ✅ Updated: `docs/AUTO_LINTER.md`
- ✅ Disabled: All old individual workflow files (preserved with .disabled extension)

The consolidation is complete and ready for testing when the PR is merged to master.