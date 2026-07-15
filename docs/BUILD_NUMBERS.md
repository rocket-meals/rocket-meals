# Build Numbers & App Store Builds

This repo decides automatically in CI whether a new app-store build (EAS build +
submit) is required. This document describes how that works and how to trigger
a build.

## How to trigger a new store build

- **One app only** (e.g. frontend): bump `buildNumber` in the app's
  `build-number.json`:
  - `apps/frontend/app/build-number.json`
  - `apps/geonexia/frontend/build-number.json`
  - `apps/score-tracker/frontend/build-number.json`
- **ALL apps at once** (e.g. after changing a native dependency in a shared
  package like `packages/common` or `packages/common-ui`): bump `buildNumber`
  in `packages/common/build-number.json`.

The **effective build number** of an app is always:

```
effective = <app>/build-number.json + packages/common/build-number.json
```

Both values must only ever increase (Android `versionCode` and iOS
`buildNumber` must be monotonic). The apps read the same JSON files at runtime
via `getBuildNumber()` in their `config.ts`, so app version, `versionCode` and
iOS build number are always in sync with what CI checks.

## How CI decides whether to build

The old approach compared the build number between `HEAD^` and `HEAD`, which
silently missed builds whenever the bump was not the most recent commit
(multi-commit pushes, `[skip ci]` report commits, fork syncs, failed runs).

The new approach compares against the **last successfully built** number
instead of git history:

1. Each build job in `.github/workflows/ci.yml` runs
   `.github/actions/check-build-number` with a unique `build-key`
   (e.g. `frontend-ios`, `frontend-android`, `geonexia-ios`).
2. The action computes the effective build number from the JSON files and reads
   the git tag `last-built/<build-key>/<number>` from `origin`.
3. If the effective number is **greater** than the tagged number, the job
   builds and submits via EAS.
4. After a successful build, `.github/actions/record-build-number` pushes the
   new `last-built/<build-key>/<number>` tag (and prunes older ones).

Properties:

- **History-independent**: it does not matter how many commits were pushed at
  once or whether the bump was the last commit.
- **Self-healing**: if a build fails, the tag is not moved, so the next CI run
  retries automatically.
- **Per platform**: iOS and Android are tracked separately; if only one of them
  fails, only that one is retried.
- **Fork-friendly**: tags live per repository, so every fork tracks its own
  last-built state. `gh repo sync` only syncs the branch, not tags.

## First run / new forks

If no `last-built/<build-key>/*` tag exists yet, the check assumes the current
number was already built, records it as a baseline tag and does **not** build.
This avoids a redundant build+submit when the mechanism is introduced or a new
fork is set up. For a brand-new app or fork that was never built: bump the
app's build number (or run the first `eas build` manually).

## Notes

- The tags are pushed with the default `GITHUB_TOKEN`; the build jobs therefore
  declare `permissions: contents: write`.
- The `previous_commit_sha` input of `ci.yml` is deprecated and ignored; it is
  kept so older `sync-fork.yml` versions in forks can still trigger the
  workflow during their first sync.
