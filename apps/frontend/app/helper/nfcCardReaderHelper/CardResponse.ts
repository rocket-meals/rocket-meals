export default interface CardResponse {
	currentBalance: string | undefined;
	currentBalanceRaw: any;
	lastTransaction: string | undefined;
	lastTransactionRaw: any;
	chooseAppRaw: any;
	tag: any;
	readTime: Date;
}
