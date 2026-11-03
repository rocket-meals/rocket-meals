# Accessibility Tester

Automated accessibility (a11y) audits for all app screens using [axe-core](https://github.com/dequelabs/axe-core) via Puppeteer.

The screen list comes from `APP_ROUTES` (`repo-depkit-common`), the same canonical list the screenshot generator uses - new screens added to the `AppScreens` enum are picked up automatically. Screens that do not belong into the store screenshots (detail pages, monitors, public pages, experiments, the not-found screen) are listed in `src/additionalRoutes.ts`: **add every new route there that is not in `AppScreens`**, so the audit covers all of `apps/frontend/app/app`. Detail pages get a real id from the test server (`--serverUrl`, default `ServerHelper.TEST_SERVER_CONFIG`). Every screen is opened with `kioskMode=true` (demo login) and audited against the WCAG 2.1 A/AA + best-practice rule sets.

## Reports

Three files are written to `reports/accessibility/`:

- `accessibility-report.json` - full machine-readable results (all violations with element selectors, HTML snippets and failure summaries)
- `accessibility-report.md` - human-readable summary: per-screen violation table, most common rule violations across the app, and per-screen details with docs links
- `badges/accessibility.svg` - badge showing the total violation count (color-coded by the worst impact level found)

## Usage

Against a locally running dev server (`yarn expo start --web` in `apps/frontend/app`):

```bash
yarn workspace accessibilitytester start --baseUrl http://localhost:8081
```

Options (also settable via env vars `BASE_URL`, `REPORT_DIR`, `BROWSER_LANG`, `AXE_TAGS`, `FAIL_ON_VIOLATIONS`):

| Flag | Default | Description |
| --- | --- | --- |
| `--baseUrl` | `http://localhost:8081` | Base URL of the running web app |
| `--reportDir` | `<repo>/reports/accessibility` | Output directory for the reports |
| `--browserLang` | `de` | Browser language |
| `--tags` | `wcag2a,wcag2aa,wcag21a,wcag21aa,best-practice` | axe-core rule tags to run |
| `--failOnViolations` | `false` | Exit with code 1 if critical/serious violations are found (for use as a CI gate) |

## CI

The `♿ Accessibility Audit` workflow (`.github/workflows/frontend-accessibility.yml`) runs weekly and on manual dispatch: it exports the web app, serves it locally, runs the audit and commits the updated reports (same pattern as the data-clumps and sonarCloud reports).
