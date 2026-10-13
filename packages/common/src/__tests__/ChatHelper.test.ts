import { describe, expect, it } from '@jest/globals';
import { ChatConversationState } from '../ChatConversationState';
import { ChatHelper } from '../ChatHelper';

describe('ChatHelper', () => {
  it('tells support messages from user messages by the profile', () => {
    expect(ChatHelper.isSupportMessage({ profile: null })).toBe(true);
    expect(ChatHelper.isSupportMessage({})).toBe(true);
    expect(ChatHelper.isSupportMessage({ profile: 'profile-id' })).toBe(false);
    expect(ChatHelper.isSupportMessage({ profile: { id: 'profile-id' } })).toBe(false);
  });

  it('waits for the other side after a message', () => {
    expect(ChatHelper.getConversationStateAfterMessage(true)).toBe(ChatConversationState.WAITING_FOR_USER);
    expect(ChatHelper.getConversationStateAfterMessage(false)).toBe(ChatConversationState.WAITING_FOR_SUPPORT);
  });

  it('sorts messages oldest first without changing the input', () => {
    const messages = [
      { id: 'c', date_created: '2026-10-06T10:00:00Z' },
      { id: 'a', date_created: '2026-10-06T08:00:00Z' },
      { id: 'b', date_created: null, date_updated: '2026-10-06T09:00:00Z' },
    ];
    expect(ChatHelper.sortMessagesChronologically(messages).map(message => message.id)).toEqual(['a', 'b', 'c']);
    expect(messages.map(message => message.id)).toEqual(['c', 'a', 'b']);
  });

  it('builds a new support chat waiting for support', () => {
    expect(ChatHelper.buildSupportChat({ alias: 'Feedback zu Pasta', initialMessage: '  Zu salzig  ' })).toEqual({
      alias: 'Feedback zu Pasta',
      initial_message: 'Zu salzig',
      conversation_state: ChatConversationState.WAITING_FOR_SUPPORT,
    });
    expect(ChatHelper.buildSupportChat({ alias: 'x', initialMessage: '   ' }).initial_message).toBeNull();
    expect(ChatHelper.buildSupportChat({ alias: 'x' }).initial_message).toBeNull();
  });

  it('builds the participant row', () => {
    expect(ChatHelper.buildParticipant('chat-id', 'profile-id')).toEqual({ chats_id: 'chat-id', profiles_id: 'profile-id' });
  });

  it('finds the participant row of a profile', () => {
    const participants = [7, { id: 1, profiles_id: 'p1' }, { id: 2, profiles_id: { id: 'p2' }, read_until: '2026-10-06T10:00:00Z' }];
    expect(ChatHelper.findParticipant(participants, 'p2')?.id).toBe(2);
    expect(ChatHelper.findParticipant(participants, 'p1')?.id).toBe(1);
    expect(ChatHelper.findParticipant(participants, 'p3')).toBeUndefined();
    expect(ChatHelper.findParticipant(participants, undefined)).toBeUndefined();
    expect(ChatHelper.findParticipant(undefined, 'p1')).toBeUndefined();
  });

  it('picks the later of two dates', () => {
    expect(ChatHelper.getLaterDate('2026-10-06T10:00:00Z', '2026-10-06T11:00:00Z')).toBe('2026-10-06T11:00:00Z');
    expect(ChatHelper.getLaterDate('2026-10-06T12:00:00Z', '2026-10-06T11:00:00Z')).toBe('2026-10-06T12:00:00Z');
    expect(ChatHelper.getLaterDate(null, '2026-10-06T11:00:00Z')).toBe('2026-10-06T11:00:00Z');
    expect(ChatHelper.getLaterDate('2026-10-06T11:00:00Z', undefined)).toBe('2026-10-06T11:00:00Z');
    expect(ChatHelper.getLaterDate(null, null)).toBeUndefined();
  });

  it('tells unread chats by the newest message and the read date', () => {
    expect(ChatHelper.isUnread(null, null)).toBe(false);
    expect(ChatHelper.isUnread(null, '2026-10-06T10:00:00Z')).toBe(false);
    expect(ChatHelper.isUnread('2026-10-06T10:00:00Z', null)).toBe(true);
    expect(ChatHelper.isUnread('2026-10-06T11:00:00Z', '2026-10-06T10:00:00Z')).toBe(true);
    expect(ChatHelper.isUnread('2026-10-06T10:00:00Z', '2026-10-06T10:00:00Z')).toBe(false);
    expect(ChatHelper.isUnread('2026-10-06T10:00:00.000Z', '2026-10-06T10:00:00Z')).toBe(false);
  });
});
