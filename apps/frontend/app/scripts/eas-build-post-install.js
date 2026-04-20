#!/usr/bin/env node

/**
 * EAS Build post-install hook.
 *
 * Previously this script copied customer source images into the ./assets/generated/
 * directory because that folder was .gitignore'd and therefore missing on EAS Build
 * servers.
 *
 * Now all customer-specific generated assets are committed under
 * ./assets/generated/<customer>/ subfolders and are no longer .gitignore'd.
 * The assets are available on EAS Build servers directly from the git archive.
 *
 * This script is kept as a no-op to avoid breaking the eas-build-post-install
 * package.json hook if EAS Build still invokes it.
 */

console.log('eas-build-post-install: Generated assets are now committed per customer subfolder. No action needed.');

