/** Shape of the `app_feedbacks.data` payload written by the app. */
export type AppFeedbackData = {
  /** The sanitized redux state as an object - present when it could be parsed back. */
  app_state?: unknown;
  /** The serialized state as raw text - used when the dump had to be truncated to fit the size cap. */
  app_state_json?: string;
  /** True when `app_state_json` is a cut off dump and therefore no longer valid JSON. */
  app_state_truncated?: boolean;
  /** Set when the state could not be serialized at all, so the failure can still be investigated. */
  app_state_error?: unknown;
};

/**
 * Helpers around the app state that the feedback screen collects for support.
 *
 * The state lives in the JSON column `app_feedbacks.data`. Older feedbacks still carry it
 * appended to `content` behind one of the markers below - {@link stripAppState} removes that
 * legacy payload so only the text the user wrote is shown (chat message, linked-element preview).
 */
export class AppFeedbackContentHelper {
  /** Legacy marker: the app state used to be appended to `content` behind this line. */
  static readonly APP_STATE_JSON_MARKER = '---APP_STATE_JSON---';
  /** Legacy marker for a failed serialization, appended to `content` the same way. */
  static readonly APP_STATE_JSON_ERROR_MARKER = '---APP_STATE_JSON_ERROR---';

  /** Wrap the serialized app state for the `data` column of an app feedback. */
  static buildAppStateData(appStateJson: string): AppFeedbackData {
    try {
      return { app_state: JSON.parse(appStateJson) };
    } catch {
      // The serializer caps the dump at a maximum length, so a large state is cut off and no
      // longer parseable. Keep the raw text instead of losing the whole snapshot.
      return { app_state_json: appStateJson, app_state_truncated: true };
    }
  }

  /** Wrap a failed app state serialization for the `data` column of an app feedback. */
  static buildAppStateErrorData(error: unknown): AppFeedbackData {
    const errorInfo = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    return { app_state_error: errorInfo };
  }

  /**
   * Return only the part the user wrote, i.e. the content without a legacy app state dump.
   */
  static stripAppState(content: string | undefined | null): string {
    if (!content) {
      return '';
    }

    let userContent = content;
    for (const marker of [
      AppFeedbackContentHelper.APP_STATE_JSON_MARKER,
      AppFeedbackContentHelper.APP_STATE_JSON_ERROR_MARKER,
    ]) {
      const markerIndex = userContent.indexOf(marker);
      if (markerIndex >= 0) {
        userContent = userContent.substring(0, markerIndex);
      }
    }

    return userContent.trim();
  }
}
