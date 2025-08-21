//APDU Commands for reading Balance of the Card
import CardReader from './CardReader';
import APDUCommands from './APDUCommands';
import CardResponse from './CardResponse';
/**
 * MensaCardReaderHelper for easy reading of the mensacard
 */
export default class MensaCardReaderHelper {
	static async readMensaCardInformations(
		cardReader: CardReader,
		message: string
	) {
		let answer;
		try {
			answer = await MensaCardReaderHelper.private_getMensaCardInformations(
				cardReader,
				message
			);
		} catch (err) {
			console.warn(err);
		}
		await MensaCardReaderHelper._cleanUp(cardReader);
		return answer;
	}

	/**
	 * read the balance and the last Transaction from the Mensacard
	 */
	private static async private_getMensaCardInformations(
		cardReader: CardReader,
		message: string
	): Promise<CardResponse | undefined> {
		//request Mifare Technology
		console.log('MiFare Technology: ');
		const respTech = await MensaCardReaderHelper.private_requestTechnology(
			cardReader,
			message
		);
		console.log(JSON.stringify(respTech, null, 2));
		if (!respTech) {
			return undefined;
		}

		//Don't really know why we need the tag but it doesn't work without
		console.log('Tag: ');
		const tag = await cardReader.NfcManager.getTag();
		console.log(JSON.stringify(tag, null, 2));

		//sending APDU Command ChooseApplication for reading File containing the balance and last transaction
		console.log('Choose Application: ');
		const chooseAppResponse =
			await MensaCardReaderHelper.private_sendCommandToMensaCard(
				cardReader,
				APDUCommands.chooseApplication
			);
		console.log(JSON.stringify(chooseAppResponse, null, 2));

		//if the response is Valid the current Balance APDU Command will be send
		if (MensaCardReaderHelper.private_isValidResponse(chooseAppResponse)) {
			console.log('Read Current Balance: ');
			const currentBalanceObj =
				await MensaCardReaderHelper.getCurrentBalance(cardReader);
			//if the response is Valid the lastTransaction APDU command is send
			if (currentBalanceObj) {
				const answer: CardResponse = {
					currentBalance: currentBalanceObj.currentBalance,
					currentBalanceRaw: currentBalanceObj.currentBalanceRaw,
					lastTransaction: undefined,
					lastTransactionRaw: undefined,
					chooseAppRaw: chooseAppResponse,
					tag: tag,
					readTime: new Date(),
				};
				console.log('Read Last Transaction: ');
				const lastTransactionObj =
					await MensaCardReaderHelper.getLastTransaction(cardReader);
				//if the response is Valid the cardinformation is stored in a JSON Object and returned
				if (lastTransactionObj) {
					answer.lastTransaction = lastTransactionObj.lastTransaction;
					answer.lastTransactionRaw = lastTransactionObj.lastTransactionRaw;
					return answer;
					//else only the last Balance will be send back as A JSON Object
				}
				return answer;
			}
		}
		//this only happens if something before failed or had a invalid answer
		console.warn('get Mensa Card Informations Failed');
		return undefined;
	}

	private static async getCurrentBalance(cardReader: CardReader) {
		const currentBalanceResponse =
			await MensaCardReaderHelper.private_sendCommandToMensaCard(
				cardReader,
				APDUCommands.readCurrentBalance
			);
		console.log(JSON.stringify(currentBalanceResponse, null, 2));

		//if the response is Valid the lastTransaction APDU command is send
		if (MensaCardReaderHelper.private_isValidResponse(currentBalanceResponse)) {
			const currentBalance = MensaCardReaderHelper.getValueFromBytes(
				currentBalanceResponse.slice(0, 4).reverse()
			).toString();
			return {
				currentBalance: currentBalance,
				currentBalanceRaw: currentBalanceResponse,
			};
		} else {
			return undefined;
		}
	}

	private static async getLastTransaction(cardReader: CardReader) {
		const lastTransactionResponse =
			await MensaCardReaderHelper.private_sendCommandToMensaCard(
				cardReader,
				APDUCommands.readLastTransaction
			);
		console.log(JSON.stringify(lastTransactionResponse, null, 2));

		//if the response is Valid the cardinformation is stored in a JSON Object and returned
		if (MensaCardReaderHelper.private_isValidResponse(lastTransactionResponse)) {
			console.log('Get Value from Bytes: ');
			const lastTransaction = MensaCardReaderHelper.getValueFromBytes(
				lastTransactionResponse.slice(12, 14).reverse()
			).toString();
			return {
				lastTransaction: lastTransaction,
				lastTransactionRaw: lastTransactionResponse,
			};
		} else {
			return undefined;
		}
	}

	/**
	 * return the Technology used to communicate with the NFC Card
	 * @returns {string}
	 */
	static private_getTechnology(cardReader: CardReader) {
		return cardReader.Platform.OS === 'ios'
			? cardReader.NfcTech.MifareIOS
			: cardReader.NfcTech.IsoDep;
	}

	/**
	 * function for Requesting the Permission to use the Technology
	 * @returns {Promise<NfcTech|*|undefined>}
	 */
	private static async private_requestTechnology(
		cardReader: CardReader,
		message: string
	) {
		try {
			const resp = await cardReader.NfcManager.requestTechnology(
				MensaCardReaderHelper.private_getTechnology(cardReader),
				{
					alertMessage: message,
				}
			);
			return resp;
		} catch (err) {
			console.warn('request NFC Technology failed');
			console.warn(err);
		}
		return undefined;
	}

	/**
	 * send Mifare APDU command to the NFC Card
	 * @param command the APDU Command
	 * @returns {Promise<number[]|undefined>}
	 */
	static async private_sendCommandToMensaCard(
		cardReader: CardReader,
		command: any
	) {
		try {
			if (cardReader.Platform.OS === 'ios') {
				return await cardReader.NfcManager.sendMifareCommandIOS(command);
			} else {
				return await cardReader.NfcManager.transceive(command);
			}
		} catch (err) {
			console.warn(err);
			return undefined;
		}
	}

	/**
	 * checking if the response of the Card is valid
	 * @param resp response of the card
	 * @returns {boolean|boolean}
	 */
	private static private_isValidResponse(resp: any) {
		if (resp) {
			return resp.length >= 2 && resp[resp.length - 2] === 145;
		}
		return false;
	}

	/**
	 * function for converting byte array to the needed balance value
	 * @param x
	 * @returns {number}
	 */
	static getValueFromBytes(x: any) {
		let val = 0;
		for (let i = 0; i < x.length; ++i) {
			val += x[i];
			if (i < x.length - 1) {
				val = val << 8;
			}
		}
		return val / 1000;
	}

	/**
	 * function for Cleaning up the requests
	 * @returns {Promise<void>}
	 * @private
	 */
	static async _cleanUp(cardReader: CardReader) {
		console.log('Clean Up');
		try {
			await cardReader.NfcManager.cancelTechnologyRequest();
			await cardReader.NfcManager.unregisterTagEvent();
			console.log('Success to cancelTechnologyRequest');
		} catch {
			console.warn('Clean Up failed');
		}
	}
}
