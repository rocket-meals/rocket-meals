import type {
    Accountability,
    Item as DirectusItem,
    PermissionsAction,
    PrimaryKey,
    Query,
    SchemaOverview
} from '@directus/types';
import type {Knex} from 'knex';
import {ApiContext} from "./ApiContext";
import {EventContext as EventContextForFlows} from "@directus/extensions/node_modules/@directus/types/dist/events";
import {BusboyFileStream} from "@directus/extensions/node_modules/@directus/types/dist/files";
import {DirectusFiles} from "../databaseTypes/types";
import {Readable} from "node:stream";
import {EventContext as EventContextForServices} from "@directus/types";
import {EnvVariableHelper} from "./EnvVariableHelper";

export type MyEventContext = EventContextForFlows | EventContextForServices;

export type FileServiceReadable = Readable;
export type FileServiceBusboyFileStream = BusboyFileStream;
export type FileServiceSteamType = FileServiceReadable | FileServiceBusboyFileStream;
export type FileServiceFileStream = Partial<DirectusFiles> & { storage: string };

export type AbstractServiceOptions = {
    knex?: Knex | undefined;
    accountability?: Accountability | null | undefined;
    schema: SchemaOverview;
};

// Copy / Import from https://github.com/directus/directus/blob/main/api/src/types/services.ts
export interface AbstractService<Item> {
    knex: Knex;
    accountability: Accountability | null | undefined;

    createOne(data: Partial<Item>): Promise<PrimaryKey>;
    createMany(data: Partial<Item>[]): Promise<PrimaryKey[]>;

    readOne(key: PrimaryKey, query?: Query): Promise<Item>;
    readMany(keys: PrimaryKey[], query?: Query): Promise<Item[]>;
    readByQuery(query: Query): Promise<Item[]>;

    updateOne(key: PrimaryKey, data: Partial<Item>): Promise<PrimaryKey>;
    updateMany(keys: PrimaryKey[], data: Partial<Item>): Promise<PrimaryKey[]>;

    deleteOne(key: PrimaryKey): Promise<PrimaryKey>;
    deleteMany(keys: PrimaryKey[]): Promise<PrimaryKey[]>;
}


// https://github.com/directus/directus/blob/main/api/src/types/items.ts
export type MutationOptions = any // TODO: check if we ever need this

// https://github.com/directus/directus/blob/main/api/src/services/items.ts#L35
export type QueryOptions = {
    stripNonRequested?: boolean;
    permissionsAction?: PermissionsAction;
    emitEvents?: boolean;
};


// https://github.com/directus/directus/blob/main/api/src/services/items.ts#L46
export interface ItemsService<Item> extends AbstractService<Item> {
    getKeysByQuery(query: Query): Promise<PrimaryKey[]>

    createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>
    createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>

    readByQuery(query: Query, opts?: QueryOptions): Promise<Item[]>
    readOne(key: PrimaryKey, query?: Query, opts?: QueryOptions): Promise<Item>
    readMany(keys: PrimaryKey[], query?: Query, opts?: QueryOptions): Promise<Item[]>

    updateByQuery(query: Query, data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>
    updateOne(key: PrimaryKey, data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>
    updateBatch(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>
    updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>

    upsertOne(payload: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>
    upsertMany(payloads: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>

    deleteByQuery(query: Query, opts?: MutationOptions): Promise<PrimaryKey[]>
    deleteOne(key: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey>
    deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]>

    readSingleton(query: Query, opts?: QueryOptions): Promise<Partial<Item>>
    upsertSingleton(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>
}

class GetItemsService {
    public apiContext: ApiContext;

    constructor(apiContext: ApiContext) {
        this.apiContext = apiContext;
    }

}

// https://github.com/directus/directus/blob/main/api/src/services/items.ts
export class ItemsServiceCreator extends GetItemsService{

    private eventContext: MyEventContext | undefined;

    constructor(apiContext: ApiContext, eventContext?: MyEventContext) {
        super(apiContext);
        this.eventContext = eventContext;
    }

    async getItemsService<Item>(tablename: string): Promise<ItemsService<Item>> {
        const {ItemsService} = this.apiContext.services;
        let schema = this.eventContext?.schema; // https://github.com/directus/directus/discussions/11051#discussioncomment-2014806
        if(!schema){
            schema = await this.apiContext.getSchema();
        }

        let database = this.eventContext?.database || this.apiContext.database; // https://github.com/directus/directus/discussions/11051#discussioncomment-2014806
        return new ItemsService(tablename, {
            accountability: null, //this makes us admin
            knex: database, //TODO: i think this is not neccessary
            schema: schema,
        });
    }

}

export interface FilesService extends ItemsService<DirectusFiles> {
    uploadOne(
        stream: FileServiceSteamType,
        data: FileServiceFileStream,
        primaryKey?: PrimaryKey,
        opts?: MutationOptions,
    ): Promise<PrimaryKey>;

    importOne(importURL: string, body: Partial<DirectusFiles>): Promise<PrimaryKey>
    createOne(data: Partial<DirectusFiles>, opts?: MutationOptions): Promise<PrimaryKey>
    deleteMany(keys: PrimaryKey[]): Promise<PrimaryKey[]>
    readByQuery(query: Query, opts?: QueryOptions | undefined): Promise<DirectusFiles[]>

}

export class FileServiceCreator extends GetItemsService{

    private eventContext: MyEventContext | undefined;

    constructor(apiContext: ApiContext, eventContext?: MyEventContext) {
        super(apiContext);
        this.eventContext = eventContext;
    }

    //https://github.com/directus/directus/blob/main/api/src/services/files.ts
        async getFileService(): Promise<FilesService> {
            const {FilesService} = this.apiContext.services;
            const schema = await this.apiContext.getSchema();
            const database = this.apiContext.database;
            return new FilesService({
                accountability: null, //this makes us admin
                knex: database, //TODO: i think this is not neccessary
                schema: schema,
            });
        }

        async importByUrl(url: string, body: Partial<File>){
            const fileService = await this.getFileService();
            return await fileService.importOne(url, body);
        }

        async deleteOne(id: string){
            const fileService = await this.getFileService();
            return await fileService.deleteOne(id);
        }
}

export type ActivityServiceType = ItemsService<DirectusItem>
export class ActivityServiceCreator extends GetItemsService{

        async getActivityService(): Promise<ActivityServiceType> {
            const {ActivityService} = this.apiContext.services;
            const schema = await this.apiContext.getSchema();
            const database = this.apiContext.database;
            return new ActivityService({
                accountability: null, //this makes us admin
                knex: database, //TODO: i think this is not neccessary
                schema: schema,
            });
        }
}

export type ServerInfo = {
    project: {
        project_name: string;
        project_descriptor?: string;
        project_logo?: string;
        project_color: string;
        default_appearance?: string;
        default_theme_light?: any,
        default_theme_dark?: any,
        theme_light_overrides?: any,
        theme_dark_overrides?: any,
        public_foreground?: string,
        public_favicon?: string,
        public_note?: string,
        custom_css?: string,
        public_registation?: boolean,
        public_registration_verify_email?: boolean,
        public_background?: string,
        server_url?: string, // This is not in the official types, but added by me
    },
    version?: string,
}

export type ServerInfoRaw = {
    project: {
        project_name?: string;
        project_descriptor?: string;
        project_logo?: string;
        project_color?: string;
        default_appearance?: string;
        default_theme_light?: any,
        default_theme_dark?: any,
        theme_light_overrides?: any,
        theme_dark_overrides?: any,
        public_foreground?: string,
        public_favicon?: string,
        public_note?: string,
        custom_css?: string,
        public_registation?: boolean,
        public_registration_verify_email?: boolean,
        public_background?: string,
        server_url?: string, // This is not in the official types, but added by me
    },
    version?: string,
}

export class ServerServiceCreator extends GetItemsService{

    // https://github.com/directus/directus/blob/main/api/src/services/server.ts
    async getServerService() {
        const {ServerService} = this.apiContext.services;
        const schema = await this.apiContext.getSchema();
        const database = this.apiContext.database;
        return new ServerService({
            accountability: null, //this makes us admin
            knex: database, //TODO: i think this is not neccessary
            schema: schema,
        });
    }

    async getServerInfo() {
        const serverService = await this.getServerService();
        let directusServerInfo = await serverService.serverInfo() || {} as ServerInfo;

        if(!directusServerInfo.project){
            directusServerInfo.project = {};
        }

        directusServerInfo.project.project_name = directusServerInfo.project.project_name || "Rocket Meals";
        directusServerInfo.project.project_color = directusServerInfo.project.project_color || "#D14610";

        let publicUrl = EnvVariableHelper.getServerUrl();
        if(directusServerInfo.project){
            directusServerInfo.project.server_url = publicUrl;
        }


        return directusServerInfo;
    }

}