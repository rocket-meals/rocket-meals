import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class ChatMessagesHelper extends CollectionHelper<DatabaseTypes.ChatMessages> {
	constructor(client?: any) {
		super('chat_messages', client || ServerAPI.getClient());
	}

	async fetchMessagesByChat(chatId: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: 100,
			sort: ['-date_created'],
			filter: { chat: { _eq: chatId } },
		};
		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async createChatMessage(data: Partial<DatabaseTypes.ChatMessages>) {
		return await this.createItem(data);
	}
}
