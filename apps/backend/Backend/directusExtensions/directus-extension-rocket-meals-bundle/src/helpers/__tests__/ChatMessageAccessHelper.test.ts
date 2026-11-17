import { describe, expect, it } from '@jest/globals';
import { ChatMessageAccessHelper, ChatMessageAccessLookup } from '../ChatMessageAccessHelper';

const CHAT = 'chat-1';

function lookup(options: { profile?: string | null; participant?: boolean; author?: boolean }): ChatMessageAccessLookup {
  return {
    getProfileIdOfUser: async () => (options.profile === undefined ? 'profile-1' : options.profile),
    isParticipant: async () => options.participant === true,
    isAuthorOfFeedbackWithChat: async () => options.author === true,
  };
}

const appUser = { user: 'user-1', role: 'role-user', admin: false, app: false } as any;

describe('ChatMessageAccessHelper', () => {
  it('lets the server and people with app access write into every chat', async () => {
    expect(await ChatMessageAccessHelper.mayCreateMessage(null, CHAT, lookup({}))).toBe(true);
    expect(await ChatMessageAccessHelper.mayCreateMessage({ ...appUser, app: true }, CHAT, lookup({}))).toBe(true);
    expect(await ChatMessageAccessHelper.mayCreateMessage({ ...appUser, admin: true }, CHAT, lookup({}))).toBe(true);
  });

  it('lets an app user write into a chat they belong to', async () => {
    expect(await ChatMessageAccessHelper.mayCreateMessage(appUser, CHAT, lookup({ participant: true }))).toBe(true);
    expect(await ChatMessageAccessHelper.mayCreateMessage(appUser, { id: CHAT }, lookup({ author: true }))).toBe(true);
  });

  it('rejects an app user who does not belong to the chat', async () => {
    expect(await ChatMessageAccessHelper.mayCreateMessage(appUser, CHAT, lookup({}))).toBe(false);
    expect(await ChatMessageAccessHelper.mayCreateMessage(appUser, CHAT, lookup({ profile: null, participant: true }))).toBe(false);
    expect(await ChatMessageAccessHelper.mayCreateMessage(appUser, null, lookup({ participant: true }))).toBe(false);
    expect(await ChatMessageAccessHelper.mayCreateMessage({ ...appUser, user: null }, CHAT, lookup({ participant: true }))).toBe(false);
  });
});
