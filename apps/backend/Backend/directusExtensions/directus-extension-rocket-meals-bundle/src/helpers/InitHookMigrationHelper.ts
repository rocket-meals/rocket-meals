export type InitHook = () => Promise<void> | void;

const initHooksBeforeMigration: InitHook[] = [];
const initHooksAfterMigration: InitHook[] = [];

export function registerInitHookAfterMigration(hook: InitHook) {
  initHooksAfterMigration.push(hook);
}

export function registerInitHookBeforeMigration(hook: InitHook) {
    initHooksBeforeMigration.push(hook);
}

export async function runInitHooksBeforeMigration() {
  for (const hook of initHooksBeforeMigration) {
    await hook();
  }
}

export async function runInitHooksAfterMigration() {
  for (const hook of initHooksAfterMigration) {
    await hook();
  }
}
