export type InitHook = () => Promise<void> | void;

const initHooks: InitHook[] = [];

export function registerInitHook(hook: InitHook) {
  initHooks.push(hook);
}

export async function runInitHooks() {
  for (const hook of initHooks) {
    await hook();
  }
}
