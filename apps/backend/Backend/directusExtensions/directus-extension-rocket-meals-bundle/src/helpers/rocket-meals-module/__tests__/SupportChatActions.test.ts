import { describe, expect, it, jest } from '@jest/globals';
import { ChatConversationState, FoodFeedbackChatStatus } from 'repo-depkit-common';
import { ChatQueryHelper, type ModuleChat } from '../ChatQueryHelper';
import { SupportChatActions, type SupportChatApiClient } from '../SupportChatActions';

// The page "Chats": which chats can be marked as done, and marking several at once.

function createApi(patch: SupportChatApiClient['patch']): SupportChatApiClient {
  return { post: jest.fn(async () => ({ data: {} })), patch };
}

describe('ChatQueryHelper.canMarkResolved', () => {
  it('allows every chat that is not done yet', () => {
    expect(ChatQueryHelper.canMarkResolved({ id: '1', conversation_state: ChatConversationState.WAITING_FOR_SUPPORT } as ModuleChat)).toBe(true);
    expect(ChatQueryHelper.canMarkResolved({ id: '1', conversation_state: ChatConversationState.RESOLVED } as ModuleChat)).toBe(false);
    expect(ChatQueryHelper.getStatus({ id: '1', conversation_state: ChatConversationState.RESOLVED } as ModuleChat)).toBe(FoodFeedbackChatStatus.RESOLVED);
  });
});

describe('SupportChatActions.markChatsResolved', () => {
  it('marks all chats as done in one request', async () => {
    const patch = jest.fn(async () => ({ data: {} }));
    const result = await SupportChatActions.markChatsResolved(createApi(patch), ['a', 'b']);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(SupportChatActions.CHATS_ENDPOINT, { keys: ['a', 'b'], data: { conversation_state: ChatConversationState.RESOLVED } });
    expect(result).toEqual({ resolvedIds: ['a', 'b'], failedIds: [] });
  });

  it('reports all chats as failed when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const patch = jest.fn(async () => {
      throw new Error('forbidden');
    });
    expect(await SupportChatActions.markChatsResolved(createApi(patch), ['a'])).toEqual({ resolvedIds: [], failedIds: ['a'] });
  });

  it('sends nothing without chats', async () => {
    const patch = jest.fn(async () => ({ data: {} }));
    expect(await SupportChatActions.markChatsResolved(createApi(patch), [])).toEqual({ resolvedIds: [], failedIds: [] });
    expect(patch).not.toHaveBeenCalled();
  });
});

describe('SupportChatActions.reopen', () => {
  it('sets the chats of done feedbacks back to waiting for support in one request', async () => {
    const patch = jest.fn(async () => ({ data: {} }));
    const api = { post: jest.fn(async () => ({ data: {} })), patch };
    const result = await SupportChatActions.reopen(api, [
      { id: 'f1', chat: 'c1' },
      { id: 'f2', chat: { id: 'c2', conversation_state: 'resolved' } },
      { id: 'f3', chat: null },
    ]);
    expect(patch).toHaveBeenCalledWith('/items/chats', { keys: ['c1', 'c2'], data: { conversation_state: 'waiting_for_support' } });
    expect(result).toEqual({ resolvedIds: ['f1', 'f2'], failedIds: ['f3'] });
  });

  it('reports all as failed when the request fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = {
      post: jest.fn(async () => ({ data: {} })),
      patch: jest.fn(async () => {
        throw new Error('403');
      }),
    };
    expect(await SupportChatActions.reopen(api, [{ id: 'f1', chat: 'c1' }])).toEqual({ resolvedIds: [], failedIds: ['f1'] });
    consoleError.mockRestore();
  });
});
