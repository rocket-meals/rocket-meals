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

The auto-linter runs **before** all other workflows to ensure code is properly formatted before
building or deploying. The following workflows automatically trigger after auto-linter completion
and use the latest formatted code:

- 🌐 GH-Pages Deploy
- 🤖 Build & Submit Android
- 🧪 Android Preview Build
- 🍏 Build & Submit iOS
- 🤖 Expo Update
- Backend Directus Extension Build

Each dependent workflow uses `workflow_run` triggers to wait for auto-linter completion and
automatically checks out the latest commit that includes any formatting changes.

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
2. Auto-linter runs and formats code
3. If changes are made, they're automatically committed with `[skip ci]`
4. Dependent workflows automatically trigger after auto-linter completion
5. Dependent workflows use the latest commit (including auto-linter changes) for builds and
   deployments

The workflow dependency chain ensures that all builds and deployments use properly formatted code.

## Benefits

- **Consistent Code Style**: All code follows the same formatting rules
- **Reduced Review Overhead**: No more discussions about spacing, quotes, etc.
- **Automated Maintenance**: Code stays formatted without manual intervention
- **Better Git History**: Formatting changes are separate from functional changes
