import MensaCardReaderHelper from './MensaCardReaderHelper';

export default class CardReader {
	NfcManager: any;
	NfcTech: any;
	Platform: any;

	constructor(NfcManager: any, NfcTech: any, Platform: any) {
		this.NfcManager = NfcManager;
		this.NfcTech = NfcTech;
		this.Platform = Platform;
	}

	async isSupported(): Promise<boolean> {
		if (this.Platform.OS === 'ios' || this.Platform.OS === 'android') {
			return await this.NfcManager.isSupported();
		} else {
			return false;
		}
	}

	async isEnabled(): Promise<boolean> {
		if (this.Platform.OS === 'ios' || this.Platform.OS === 'android') {
			return await this.NfcManager.isEnabled();
		} else {
			return false;
		}
	}

	isApple() {
		return this.Platform.OS === 'ios';
	}

	async readCard(message?: string) {
		if (message === undefined) {
			message = 'Hold your phone near the card';
		}
		let cardInformations;
		try {
			const result = await this.NfcManager.start();
			cardInformations = await MensaCardReaderHelper.readMensaCardInformations(
				this,
				message
			);
		} catch (err) {
			console.warn(err);
		}
		await MensaCardReaderHelper._cleanUp(this); //fasdfasdf
		return cardInformations;
	}
}
