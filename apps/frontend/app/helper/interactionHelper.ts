import { Platform } from 'react-native';

// InteractionManager was removed from react-native core (0.88). The task is
// deferred until the JS thread is idle instead, which is what React Native
// recommends as the replacement. The timeout keeps a busy screen from
// postponing the task forever.
const IDLE_TIMEOUT_MS = 500;

export const runAfterInteractions = (task: () => any) => {
    if (Platform.OS === 'web' || typeof requestIdleCallback !== 'function') {
        const timeout = setTimeout(task, 0);
        return { cancel: () => clearTimeout(timeout) };
    }

    const handle = requestIdleCallback(() => task(), { timeout: IDLE_TIMEOUT_MS });
    return { cancel: () => cancelIdleCallback(handle) };
};
