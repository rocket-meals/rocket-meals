import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FormAnswersHelper extends CollectionHelper<DatabaseTypes.FormAnswers> {
	constructor(client?: any) {
		super('form_answers', client || ServerAPI.getClient());
	}

	async fetchFormAnswers(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['* , form_field.*, form_field.translations.*, value_files.*'],
			limit: -1,
			sort: ['sort'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFormsById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * , translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	async updateFormAnswers(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}
}
