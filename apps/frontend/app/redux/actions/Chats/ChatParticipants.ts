import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';

export class ChatParticipantsHelper extends CollectionHelper<DatabaseTypes.ChatsParticipants> {
	constructor(client?: any) {
		super('chats_participants', client);
	}

	/** Sets up to which date the own profile has read the chat; `null` marks it unread again. */
	async updateReadUntil(participantId: number | string, readUntil: string | null) {
		return await this.updateItem(participantId, { read_until: readUntil });
	}
}
