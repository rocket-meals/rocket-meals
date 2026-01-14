import { ItemsService, ItemsServiceCreator, MutationOptions, QueryOptions } from './ItemsServiceCreator';
import type { Filter } from '@directus/types/dist/filter';
import { ApiContext } from './ApiContext';
import { Accountability, EventContext, PrimaryKey, Query } from '@directus/types';
import { TranslationHelper } from './TranslationHelper';
import { Knex } from 'knex';
import { MyDatabaseHelperInterface } from './MyDatabaseHelperInterface';

export type OptsCustomType = {
  disableEventEmit: boolean;
};

type AnyTypeWithId = { id: PrimaryKey };

type TypeWithId<T> = T & AnyTypeWithId;

type UpdateOneProps<T> = {
  primary_key: PrimaryKey;
  update: Partial<T>;
  optsCustom?: OptsCustomType;
};

export class ItemsServiceHelper<T> implements ItemsService<T> {
  protected apiContext: ApiContext;
  protected eventContext: EventContext | undefined;
  protected tablename: string;
  protected myDatabaseHelper: MyDatabaseHelperInterface;

  public static FIELD_STATUS = 'status';
  public static FIELD_STATUS_PUBLISHED = 'published';

  constructor(myDatabaseHelper: MyDatabaseHelperInterface, tablename: string) {
    this.myDatabaseHelper = myDatabaseHelper;
    this.apiContext = myDatabaseHelper.apiContext;
    this.tablename = tablename;
    this.eventContext = myDatabaseHelper.eventContext;
    this.knex = myDatabaseHelper.apiContext.database as unknown as Knex;
  }

  protected async getItemsService(): Promise<ItemsService<T>> {
    const itemsServiceCreator = new ItemsServiceCreator(this.apiContext, this.eventContext);
    let itemsService = await itemsServiceCreator.getItemsService<T>(this.tablename);
    return itemsService;
  }

  async upsertOne(upsert: Partial<T & { id: PrimaryKey }>, optsCustom?: OptsCustomType): Promise<PrimaryKey> {
    // https://github.com/directus/directus/blob/main/api/src/services/items.ts#L935
    // Can only use upsertOne with a primary key, otherwise it will always create a new item...

    let itemsService = await this.getItemsService();
    let opts = this.getOptsCustom(optsCustom);
    return await itemsService.upsertOne(upsert, opts);
  }

  async updateOne(primary_key: PrimaryKey, update: Partial<T>, optsCustom?: OptsCustomType): Promise<PrimaryKey> {
    let itemsService = await this.getItemsService();
    // DO not update status. It should be only set on creation
    let opts = this.getOptsCustom(optsCustom);
    return await itemsService.updateOne(primary_key, update, opts);
  }

  // async updateOneItemWithoutHookTrigger(item: TypeWithId<Partial<T>>, update: Partial<T>, optsCustom?: OptsCustomType): Promise<void> {
  async updateOneWithoutHookTrigger(data: UpdateOneProps<T>): Promise<void> {
    let { primary_key, update, optsCustom } = data;
    let database = this.apiContext.database;
    //console.log("Updating item without hook trigger - post");
    await database(this.tablename).update(update).where('id', primary_key);
  }

  async updateManyByItems(items: TypeWithId<T>[], update: Partial<T>, optsCustom?: OptsCustomType): Promise<PrimaryKey[]> {
    let primary_keys = items.map(item => item.id);
    return await this.updateManyByPrimaryKeys(primary_keys, update, optsCustom);
  }

  async updateManyByPrimaryKeys(primary_keys: PrimaryKey[], update: Partial<T>, optsCustom?: OptsCustomType): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    // DO not update status. It should be only set on creation
    let opts = this.getOptsCustom(optsCustom);
    return await itemsService.updateMany(primary_keys, update, opts);
  }

  private getOptsCustom(optsCustom?: OptsCustomType): QueryOptions {
    let opts: QueryOptions = {};
    if (optsCustom?.disableEventEmit) {
      opts.emitEvents = false;
    }
    return opts;
  }

  // Function to calculate the average of a number field
  /**
   * Calculate the average of a number field in the table
   * @param fieldName
   * @returns {Promise<number>} The average of the field or NaN if no data is found
   */
  async calculateAverage(fieldName: string): Promise<number | undefined> {
    type AggregateAnswer = { avg: { [fieldName: string]: string } };
    let itemsService = await this.getItemsService();

    //console.log("Calculating average for field: " + fieldName);

    // Construct the query to calculate average on the field
    let aggregateQuery: Query = {
      aggregate: {
        avg: [fieldName as string], // Pass the field name to the aggregate function
      },
      limit: -1,
    };

    //console.log("Query: " + JSON.stringify(aggregateQuery, null, 2));

    // Define the response structure

    // Execute the query
    let answer = (await itemsService.readByQuery(aggregateQuery)) as AggregateAnswer[];

    //console.log("Answer: " + JSON.stringify(answer, null, 2));

    // Parse and return the average result
    if (answer && answer[0] && answer[0].avg && answer[0].avg?.[fieldName]) {
      return parseFloat(answer[0].avg?.[fieldName]); // Parse the average to a float
    } else {
      return undefined; // Return 0 if no data is found
    }
  }

  async countItems(query?: Query): Promise<number> {
    type AggregateAnswer = { count: string };
    let itemsService = await this.getItemsService();
    let aggregateFilter: Query = {
      aggregate: {
        count: ['*'],
      },
      limit: -1,
    };
    let totalQuery: Query = { ...query, ...aggregateFilter };
    let answer = (await itemsService.readByQuery(totalQuery)) as AggregateAnswer[];
    // data = {"data":[{"count":"1869"}]}
    if (!!answer && !!answer[0]) {
      return parseInt(answer[0].count);
    } else {
      return 0;
    }
  }

  async readMany(keys: PrimaryKey[], query?: Query, opts?: QueryOptions): Promise<T[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.readMany(keys, query, opts);
  }

  async findFirstItem(
    search: Partial<T>,
    customOptions?: {
      withTranslations?: boolean;
      limit?: number;
    }
  ): Promise<T | undefined> {
    let queriedItems = await this.findItems(search, customOptions);
    return queriedItems[0];
  }

  static getPrimaryKeyFromItemOrString(itemOrString: string | AnyTypeWithId | null | undefined): PrimaryKey | undefined {
    if (itemOrString === null || itemOrString === undefined) {
      return undefined;
    }
    if (typeof itemOrString === 'string') {
      return itemOrString;
    } else {
      return itemOrString.id;
    }
  }

  async findItems(
    search: Partial<T>,
    customOptions?: {
      withTranslations?: boolean;
      limit?: number;
      fields?: string[];
    }
  ): Promise<T[]> {
    let itemsService = await this.getItemsService();

    let andFilter: any[] = [];
    let fieldsOfItem = Object.keys(search);
    for (let field of fieldsOfItem) {
      let fieldFilter: any = {};
      // @ts-ignore
      let fieldValue = search[field];
      fieldFilter[field] = { _eq: fieldValue };
      andFilter.push(fieldFilter);
    }

    let queryFilter: Filter = { _and: andFilter };
    let useLimit = customOptions?.limit || -1;
    let query = { filter: queryFilter, limit: useLimit, fields: ['*'] };
    if (customOptions?.fields) {
      query.fields = customOptions.fields;
    }
    if (customOptions?.withTranslations) {
      query = {
        ...query,
        ...TranslationHelper.QUERY_FIELDS_FOR_ALL_FIELDS_AND_FOR_TRANSLATION_FETCHING,
      };
    }

    let queriedItems = await itemsService.readByQuery(query);
    return queriedItems;
  }

  async findOrCreateItem(
    search: Partial<T>,
    create: Partial<T>,
    customOptions?: {
      withTranslations?: boolean;
    }
  ): Promise<T | undefined> {
    let itemsService = await this.getItemsService();

    let queriedItems = await this.findItems(search, customOptions);
    let foundItem = queriedItems[0];

    let copiedCreateItem = JSON.parse(JSON.stringify(create));
    if (!foundItem) {
      copiedCreateItem = ItemsServiceHelper.setStatusPublished(copiedCreateItem);
      await itemsService.createOne(copiedCreateItem);
    }
    queriedItems = await this.findItems(search, customOptions);
    foundItem = queriedItems[0];
    return foundItem;
  }

  async createOne(create: Partial<T>): Promise<PrimaryKey> {
    let itemsService = await this.getItemsService();
    create = ItemsServiceHelper.setStatusPublished(create);
    return await itemsService.createOne(create);
  }

  async createManyItems(create: Partial<T>[], optsCustom?: OptsCustomType): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    create = create.map(ItemsServiceHelper.setStatusPublished);
    let opts = this.getOptsCustom(optsCustom);
    return await itemsService.createMany(create, opts);
  }

  async existsItem(search: Partial<T>): Promise<boolean> {
    let items = await this.findItems(search);
    return items.length > 0;
  }

  async readOneWithTranslations(primary_key: PrimaryKey, query?: Query, opts?: QueryOptions): Promise<T> {
    let queryWithTranslations = {
      ...query,
      ...TranslationHelper.QUERY_FIELDS_FOR_ALL_FIELDS_AND_FOR_TRANSLATION_FETCHING,
    };
    return await this.readOne(primary_key, queryWithTranslations, opts);
  }

  async readByQueryWithTranslations(query?: Query, opts?: QueryOptions): Promise<T[]> {
    let queryWithTranslations = {
      ...query,
      ...TranslationHelper.QUERY_FIELDS_FOR_ALL_FIELDS_AND_FOR_TRANSLATION_FETCHING,
    };
    return await this.readByQuery(queryWithTranslations, opts);
  }

  async readOne(primary_key: PrimaryKey | TypeWithId<T>, query?: Query, opts?: QueryOptions): Promise<T> {
    let itemsService = await this.getItemsService();
    let pk: PrimaryKey;
    if (typeof primary_key === 'object') {
      pk = primary_key.id;
    } else {
        pk = primary_key;
    }
    return await itemsService.readOne(pk, query, opts);
  }

  async readAllItems(): Promise<T[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.readByQuery({
      limit: -1,
    });
  }

  async deleteOne(primary_key: PrimaryKey): Promise<PrimaryKey> {
    let itemsService = await this.getItemsService();
    return await itemsService.deleteOne(primary_key);
  }

  async deleteManyItems(items: TypeWithId<T>[]): Promise<PrimaryKey[]> {
    let primary_keys = items.map(item => item.id);
    return await this.deleteMany(primary_keys);
  }

  async deleteMany(primary_keys: PrimaryKey[]): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.deleteMany(primary_keys);
  }

  static setStatusPublished(json: any) {
    json[ItemsServiceHelper.FIELD_STATUS] = ItemsServiceHelper.FIELD_STATUS_PUBLISHED;
    return json;
  }

  static isStatusUndefined(json: any) {
    return json[ItemsServiceHelper.FIELD_STATUS] === undefined || json[ItemsServiceHelper.FIELD_STATUS] === null;
  }

  static isStatusPublished(json: any) {
    return json[ItemsServiceHelper.FIELD_STATUS] === ItemsServiceHelper.FIELD_STATUS_PUBLISHED;
  }

  async readByQuery(query: Query, opts?: QueryOptions): Promise<T[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.readByQuery(query, opts);
  }

  accountability: Accountability | null | undefined;
  knex: Knex;

  async createMany(data: Partial<T>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.createMany(data, opts);
  }

  async deleteByQuery(query: Query, opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.deleteByQuery(query, opts);
  }

  async getKeysByQuery(query: Query): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.getKeysByQuery(query);
  }

  async readSingleton(query?: Query, opts?: QueryOptions): Promise<Partial<T>> {
    let itemsService = await this.getItemsService();
    return await itemsService.readSingleton(
      {
        ...query,
        limit: 1,
      },
      opts
    );
  }

  async updateBatch(data: Partial<T>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.updateBatch(data, opts);
  }

  async updateByQuery(query: Query, data: Partial<T>, opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.updateByQuery(query, data, opts);
  }

  async updateMany(keys: PrimaryKey[], data: Partial<T>, opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.updateMany(keys, data, opts);
  }

  async upsertMany(payloads: Partial<T>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
    let itemsService = await this.getItemsService();
    return await itemsService.upsertMany(payloads, opts);
  }

  async upsertSingleton(data: Partial<T>, opts?: MutationOptions): Promise<PrimaryKey> {
    let itemsService = await this.getItemsService();
    return await itemsService.upsertSingleton(data, opts);
  }
}
