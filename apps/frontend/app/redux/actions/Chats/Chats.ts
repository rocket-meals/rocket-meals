import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { ChatMessagesHelper } from '@/redux/actions/Chats/ChatMessages';

export class ChatsHelper extends CollectionHelper<DatabaseTypes.Chats> {
	constructor(client?: any) {
		super('chats', client || ServerAPI.getClient());
	}

	async fetchChatsByProfile(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
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
		return await this.readItems(query);
	}

	async fetchChatById(id: string, queryOverride: any = {}) {
		let chatMessagesHelper = new ChatMessagesHelper();
		return await chatMessagesHelper.fetchMessagesByChat(id, queryOverride);
	}
}
