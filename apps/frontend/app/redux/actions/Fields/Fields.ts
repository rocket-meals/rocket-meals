import Server from '@/constants/ServerUrl';
import axios from 'axios';

export const fetchSpecificField = async (fieldName: string) => {
	try {
		const response = await axios.get(`${Server.ServerUrl}/fields/${fieldName}`, {
			headers: {
				'Content-Type': 'application/json',
			},
		});

		let fieldDict = {};
		if (response?.data?.data) {
			fieldDict = response?.data?.data?.reduce((acc: any, item: any) => {
				const key = `${item?.field}`;
				acc[key] = item;
				return acc;
			}, {});
		}
		return fieldDict;
	} catch (error) {
		console.error('Error fetching specific field:', error);
		throw new Error('Failed to fetch specific field');
	}
};
