import { AppFeedbackContentHelper } from 'repo-depkit-common';

describe('AppFeedbackContentHelper.buildAppStateData', () => {
  it('stores a parseable dump as an object', () => {
    expect(AppFeedbackContentHelper.buildAppStateData('{"settings":{"language":"de"}}')).toEqual({
      app_state: { settings: { language: 'de' } },
    });
  });

  it('keeps a truncated dump as raw text and marks it as such', () => {
    const truncated = '{"settings":{"lang…[truncated]';
    expect(AppFeedbackContentHelper.buildAppStateData(truncated)).toEqual({
      app_state_json: truncated,
      app_state_truncated: true,
    });
  });
});

describe('AppFeedbackContentHelper.buildAppStateErrorData', () => {
  it('keeps message and stack of an Error', () => {
    const error = new Error('boom');
    const data = AppFeedbackContentHelper.buildAppStateErrorData(error) as { app_state_error: any };
    expect(data.app_state_error.message).toBe('boom');
    expect(data.app_state_error.stack).toBe(error.stack);
  });

  it('passes a non-Error through unchanged', () => {
    expect(AppFeedbackContentHelper.buildAppStateErrorData('nope')).toEqual({ app_state_error: 'nope' });
  });
});

describe('AppFeedbackContentHelper.stripAppState', () => {
  it('returns the untouched text when no app state was appended', () => {
    expect(AppFeedbackContentHelper.stripAppState('Die App stürzt beim Login ab.')).toBe(
      'Die App stürzt beim Login ab.'
    );
  });

  it('removes a legacy app state dump from the content', () => {
    const content = `Die App stürzt ab.\n\n${AppFeedbackContentHelper.APP_STATE_JSON_MARKER}\n{"settings":{}}`;
    expect(AppFeedbackContentHelper.stripAppState(content)).toBe('Die App stürzt ab.');
  });

  it('removes a legacy app state serialization error from the content', () => {
    const content = `Die App stürzt ab.\n\n${AppFeedbackContentHelper.APP_STATE_JSON_ERROR_MARKER}\n{"message":"boom"}`;
    expect(AppFeedbackContentHelper.stripAppState(content)).toBe('Die App stürzt ab.');
  });

  it('handles empty, null and undefined content', () => {
    expect(AppFeedbackContentHelper.stripAppState('')).toBe('');
    expect(AppFeedbackContentHelper.stripAppState(null)).toBe('');
    expect(AppFeedbackContentHelper.stripAppState(undefined)).toBe('');
  });
});
