import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ChatMessagesHelper } from '@/redux/actions/Chats/ChatMessages';

export class ChatsHelper extends CollectionHelper<DatabaseTypes.Chats> {
	constructor(client?: any) {
		super('chats', client);
	}

	async fetchChatsByProfile(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			// The participant rows carry `read_until`, so unread chats show on every device.
			fields: ['*', 'participants.id', 'participants.profiles_id', 'participants.read_until'],
			deep: {
				messages: {
					_limit: 10,
					_sort: ['-date_created'],
				},
			},
			limit: 100,
			sort: ['-date_updated'],
		};
		const query = { ...defaultQuery, ...queryOverride };
		try {
			return await this.readItems(query);
		} catch (error) {
			// A server without `read_until` yet rejects the field, the chats are still wanted.
			console.warn('Fetching chats with read status failed, retrying without it', error);
			return await this.readItems({ ...query, fields: ['*'] });
		}
	}

	async fetchChatById(id: string, queryOverride: any = {}) {
		let chatMessagesHelper = new ChatMessagesHelper();
		return await chatMessagesHelper.fetchMessagesByChat(id, queryOverride);
	}
}
