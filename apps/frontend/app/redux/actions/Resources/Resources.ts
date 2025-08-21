import axios from '@/interceptor';

export const imageAPI = async (id: string) => {
	try {
		const response = await axios.get(`assets/${id}`);
		return response.data;
	} catch (error) {
		throw new Error(`Error fetching image with ID: ${id}`);
	}
};
