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

The auto-linter runs **first** and triggers all other workflows using `workflow_run` events:

### Primary Workflows (run after linting)
- 🌐 **GH-Pages Deploy** - Deploys web version to GitHub Pages
- 🤖 **Build & Submit Android** - Builds and submits Android app (with auto build number increment)
- 🧪 **Android Preview Build** - Creates preview APK builds (with auto build number increment)
- 🍏 **Build & Submit iOS** - Builds and submits iOS app (with auto build number increment)
- 🤖 **Expo Update** - Publishes over-the-air updates
- **Backend Directus Extension Build** - Builds backend extensions

### Build Number Management

Build numbers are now **automatically incremented** within each build workflow:

- **iOS builds**: Increment build number before building iOS app
- **Android builds**: Increment build number before building Android app  
- **Preview builds**: Increment build number before building preview APK

This ensures that:
- Build numbers are always up-to-date
- No manual build number management required
- Proper workflow triggering without external dependencies

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
4. Other workflows then run with the properly formatted code using `workflow_run` triggers
5. Build workflows automatically increment build numbers as needed

## Reusable Actions

The workflow system uses several reusable composite actions:

### `.github/actions/setup-expo-environment`
- Sets up Node.js, Yarn, and EAS CLI
- Installs dependencies for root and app
- Provides consistent environment setup

### `.github/actions/increment-build-number`  
- Automatically increments build number in `config.ts`
- Commits the change with `[skip ci]`
- Returns old and new build numbers

### `.github/actions/setup-and-install` (legacy)
- Basic setup action (still used by some workflows)
- Will be phased out in favor of `setup-expo-environment`

### `.github/actions/check-build-number` (deprecated)
- Previously used for comparing build numbers
- No longer needed with automatic increment approach

## Benefits

- **Consistent Code Style**: All code follows the same formatting rules
- **Reduced Review Overhead**: No more discussions about spacing, quotes, etc.
- **Automated Maintenance**: Code stays formatted without manual intervention
- **Better Git History**: Formatting changes are separate from functional changes
- **Automatic Build Management**: Build numbers increment automatically
- **Simplified Workflow Logic**: Clear dependencies using `workflow_run` triggers
- **Reusable Components**: Shared actions reduce code duplication
