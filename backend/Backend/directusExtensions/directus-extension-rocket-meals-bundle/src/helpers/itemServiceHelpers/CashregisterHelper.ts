import {ApiContext} from "./../ApiContext";
import {CollectionNames} from "./../CollectionNames";
import {Cashregisters, CashregistersTransactions} from "../../databaseTypes/types";
import {CashregistersTransactionsForParser} from "../../cashregister-hook/CashregisterTransactionParserInterface";
import {ItemsServiceHelper} from "../ItemsServiceHelper";
import {DateHelper} from "../DateHelper";

export class CashregisterHelper {

    private cashregisterServiceHelper: ItemsServiceHelper<Cashregisters>;
    private cashregisterTransactionsServiceHelper: ItemsServiceHelper<CashregistersTransactions>;

    constructor(apiContext: ApiContext) {
        this.cashregisterServiceHelper = new ItemsServiceHelper<Cashregisters>(apiContext, CollectionNames.CASHREGISTERS);
        this.cashregisterTransactionsServiceHelper = new ItemsServiceHelper<CashregistersTransactions>(apiContext, CollectionNames.CASHREGISTERS_TRANSACTIONS);
    }

    async getCashregistersForCanteen(canteen_id: string) {
        return await this.cashregisterServiceHelper.readByQuery({
            filter: {
                canteen: {
                    _eq: canteen_id
                }
            },
            limit: -1
        });
    }

    async getTransactionIdsForCashregister(cashregister_id: string, date_start: Date, date_end: Date, assumedMaxLimit: number) {
        let transactions_for_cashregister = await this.cashregisterTransactionsServiceHelper.readByQuery({
            filter: {
                _and: [
                    {
                        cashregister: {
                            _eq: cashregister_id
                        }
                    },
                    {
                        date: {
                            _gte: DateHelper.formatDateToIso8601WithoutTimezone(date_start)
                        }
                    },
                    {
                        date: {
                            _lt: DateHelper.formatDateToIso8601WithoutTimezone(date_end)
                        }
                    },
                ]
            },
            fields: ['id'], // we only need the id and not the whole object, so we can count the transactions
            limit: assumedMaxLimit // just a very high limit. "-1" would be technically correct but due to security
        });
        return transactions_for_cashregister.map(transaction => transaction.id);
    }

    async findOrCreateCashregisterTransaction(cashregistersTransactionsForParser: CashregistersTransactionsForParser, cashregister_id: string) {
        let obj_json: Partial<CashregistersTransactions> = cashregistersTransactionsForParser.baseData
        obj_json.id = cashregistersTransactionsForParser.baseData.id; // just to be sure that the external_identifier is set

        const searchQuery = {
            id: cashregistersTransactionsForParser.baseData.id
        }

        const createObj = {
            ...obj_json,
            cashregister: cashregister_id,
        }

        return await this.cashregisterTransactionsServiceHelper.findOrCreateItem(searchQuery, createObj);
    }

    async findOrCreateCashregister(external_identifier: string) {
        let obj_json = {
            external_identifier: external_identifier,
        };

        return await this.cashregisterServiceHelper.findOrCreateItem(obj_json, obj_json);
    }

    async deleteAllTransactions() {
        let hasMore = true;

        console.log("deleteAllTransactions");
        let amountToDeleteInABatch = 10000
        let times = 0;
        while (hasMore) {
            // Fetch transactions in batches
            let itemsToDelete = await this.cashregisterTransactionsServiceHelper.readByQuery({
                filter: {},
                limit: amountToDeleteInABatch // Adjust the limit as needed, but keep it manageable
            });

            // Check if there are items to delete
            if (itemsToDelete.length > 0) {
                // Prepare array of IDs to delete
                let idsToDelete = itemsToDelete.map(item => item.id);

                // Delete transactions by IDs
                await this.cashregisterTransactionsServiceHelper.deleteMany(idsToDelete);
            } else {
                // No more items to delete
                hasMore = false;
            }
            times++;
            console.log("-- "+times);
        }
        console.log("FINISHED DELETION");
    }

}
