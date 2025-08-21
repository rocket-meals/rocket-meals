import { getCustomerConfig } from '@/config';

const customerConfig = getCustomerConfig();

class ServerConfiguration {
	static ServerUrl: string = customerConfig.server_url;

	static setServerUrl(url: string) {
		this.ServerUrl = url;
	}
}

export default ServerConfiguration;
