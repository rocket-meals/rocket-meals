# Auto-Linter Workflow

This repository includes an automated code formatting and linting workflow that ensures consistent
code style across the entire codebase.

## How it Works

The auto-linter workflow (`.github/workflows/01-auto-linter.yml`) automatically:

1. **Triggers on code changes**: Runs on push and pull requests to `master`/`main` branches
2. **Formats code**: Uses Prettier to apply consistent formatting
3. **Lints code**: Uses ESLint for code quality checks
4. **Auto-commits changes**: On push events, automatically commits formatting fixes
5. **Provides feedback**: On pull requests, comments with instructions for fixing issues

## Supported File Types

- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- JSON (`.json`)
- Markdown (`.md`)
- YAML (`.yml`, `.yaml`)

## Configuration Files

- **`.prettierrc.json`**: Prettier formatting rules
- **`.prettierignore`**: Files/directories to exclude from formatting
- **`apps/frontend/app/.eslintrc.js`**: ESLint rules for the frontend application

## Workflow Dependencies

The auto-linter runs alongside other workflows using a **dual trigger system** to ensure build triggers work correctly:

- 🌐 GH-Pages Deploy
- 🤖 Build & Submit Android
- 🧪 Android Preview Build
- 🍏 Build & Submit iOS
- 🤖 Expo Update
- Backend Directus Extension Build

**How it works:**
- Each workflow has both `push` and `workflow_run` triggers
- On push to master: Both auto-linter and build workflows start simultaneously
- If auto-linter makes commits: Build workflows also trigger after auto-linter completion
- Build number detection always compares the original commits, ignoring auto-linter commits
- This prevents auto-linter formatting commits from interfering with build triggering logic

## For Developers

### Running Locally

To format your code locally before committing:

```bash
# Install Prettier globally
npm install -g prettier

# Format all files
prettier --write "**/*.{js,jsx,ts,tsx,json,md,yml,yaml}" --ignore-path .prettierignore

# For frontend ESLint
cd apps/frontend/app
npm run lint
```

### Pull Request Workflow

1. Push changes to your branch
2. Create a pull request
3. If formatting issues are found:
   - The workflow will comment with instructions
   - The PR will be marked as failing until formatting is fixed
   - Fix locally and push again, or let the auto-linter handle it on merge

### Push to Master Workflow

1. Push changes to master
2. Auto-linter runs and formats code if needed
3. If changes are made, they're automatically committed with `[skip ci]`
4. Other workflows run with the properly formatted code using **dual trigger logic**:
   - **Direct push trigger**: Runs immediately on push, comparing the original commit with its parent
   - **Workflow completion trigger**: Runs after auto-linter completion, comparing the original triggering commit with its parent
   - This ensures build number detection works correctly regardless of whether auto-linter makes commits

The dual trigger approach ensures that:
- Build workflows can run even if auto-linter makes formatting commits
- Build number comparison always uses the original code changes, not formatting commits
- No builds are skipped due to auto-linter interference
- All existing functionality is preserved

## Benefits

- **Consistent Code Style**: All code follows the same formatting rules
- **Reduced Review Overhead**: No more discussions about spacing, quotes, etc.
- **Automated Maintenance**: Code stays formatted without manual intervention
- **Better Git History**: Formatting changes are separate from functional changes
