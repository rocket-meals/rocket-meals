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
building or deploying:

- 🌐 GH-Pages Deploy
- 🤖 Build & Submit Android
- 🧪 Android Preview Build
- 🍏 Build & Submit iOS
- 🤖 Expo Update
- Backend Directus Extension Build

## For Developers

### Running Locally

To format your code locally before committing:

```bash
# Install dependencies (only needed once)
yarn install

# Check code formatting and lint issues
yarn lint

# Format all files automatically
yarn lint:format

# Fix ESLint issues automatically (frontend only)
yarn lint:eslint:fix

# Apply all fixes automatically
yarn lint:fix
```

#### Alternative Manual Commands

If you prefer to run tools manually:

```bash
# Check format without fixing
yarn lint:check

# Check ESLint issues (frontend only)
yarn lint:eslint

# Manual prettier commands
npx prettier --write "**/*.{js,jsx,ts,tsx,json,md,yml,yaml}" --ignore-path .prettierignore

# Manual ESLint commands for frontend
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
4. Other workflows then run with the properly formatted code

## Benefits

- **Consistent Code Style**: All code follows the same formatting rules
- **Reduced Review Overhead**: No more discussions about spacing, quotes, etc.
- **Automated Maintenance**: Code stays formatted without manual intervention
- **Better Git History**: Formatting changes are separate from functional changes
