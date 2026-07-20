import { ApiContext } from './ApiContext';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { EventContext, PrimaryKey } from '@directus/types';
import { EnvVariableHelper } from './EnvVariableHelper';
import { Accountability } from '@directus/types/dist/accountability';
import { ItemsServiceHelper } from './ItemsServiceHelper';
import { MyDatabaseHelperInterface } from './MyDatabaseHelperInterface';

export type ShareLinkOptions = {
  max_uses?: number;
  password?: string;
  name?: string;
  date_start?: string;
  date_end?: string;
};

export type CreateShareLinkOptions = {
  collection: Exclude<CollectionNames, `directus_${string}`>; // directus_ collections cannot be shared directly
  id: PrimaryKey;
} & ShareLinkOptions;

export type CreateShareLinkOptionForDirectusFiles = {
  directus_files_id: string;
} & ShareLinkOptions;

export interface ShareDirectusFileMethod {
  createDirectusFilesShareLink(options: CreateShareLinkOptionForDirectusFiles): Promise<string | null>;
}

export class ShareServiceHelper implements ShareDirectusFileMethod {
  public myDatabaseHelper: MyDatabaseHelperInterface;
  public apiContext: ApiContext;
  public eventContext: EventContext;

  constructor(myDatabaseHelper: MyDatabaseHelperInterface) {
    this.myDatabaseHelper = myDatabaseHelper;
    this.apiContext = myDatabaseHelper.apiContext;
    this.eventContext = myDatabaseHelper.eventContext as EventContext;
  }

  async createDirectusFilesShareLink(options: CreateShareLinkOptionForDirectusFiles): Promise<string | null> {
    let filesSharesHelper = new ItemsServiceHelper<DatabaseTypes.FilesShares>(this.myDatabaseHelper, CollectionNames.FILES_SHARES);
    let filesSharesItemId = await filesSharesHelper.createOne({
      file: options.directus_files_id as string,
    });

    return await this.createShareLink({
      collection: CollectionNames.FILES_SHARES,
      id: filesSharesItemId,
      name: options.name,
    });
  }

  async createShareLink(options: CreateShareLinkOptions): Promise<string | null> {
    let usersHelper = this.myDatabaseHelper.getUsersHelper();
    let adminEmail = EnvVariableHelper.getAdminEmail();
    let adminUser = await usersHelper.findFirstItem({
      email: adminEmail,
      provider: 'default',
    });

    if (!adminUser) {
      console.error('FilesServiceHelper.createShareLink: admin user not found');
      return null;
    }

    let role_admin_id: string | undefined = undefined;
    let adminRoleRaw = adminUser.role;
    if (adminRoleRaw) {
      if (typeof adminRoleRaw === 'string') {
        role_admin_id = adminRoleRaw;
      } else {
        role_admin_id = adminRoleRaw.id;
      }
    }
    if (!role_admin_id) {
      console.error('FilesServiceHelper.createShareLink: admin role not found');
      return null;
    }

    let ShareService = this.apiContext.services.SharesService;
    let schema = this?.eventContext?.schema || (await this.apiContext.getSchema());

    let permissions: DatabaseTypes.DirectusPermissions[] = [];

    // ATTENTION ! The accountability must be set! ShareService does not work without it. It uses the accountability to determine the permissions.
    let accountability: Accountability = {
      role: role_admin_id,
      user: adminUser.id,
      // TODO: Test if this works without the roles array
      // @ts-ignore
      roles: [role_admin_id],
      admin: true,
      app: true,
      ip: null,
    };

    let database = this?.eventContext?.database || this.apiContext.database;
    // @ts-ignore
    let shareService = new ShareService({
      accountability: accountability,
      knex: database,
      schema: schema,
    });

    let role: string | undefined = role_admin_id; // we use the role of the admin user so that the share has the same permissions as the admin user to read.
    // Is Data Sharing Safe? https://docs.directus.io/user-guide/content-module/content/shares.html#is-data-sharing-safe
    // Data sharing only gives "view" permissions, but also to the items relationally linked to the shared item.

    let name: string | undefined = options.name || 'Share of ' + options.collection + ' item ' + options.id;

    // https://docs.directus.io/reference/system/shares.html#create-a-share
    let shareId = await shareService.createOne({
      role: role,
      collection: options.collection,
      item: options.id,
      name: name,
      max_uses: options.max_uses,
      password: options.password,
      date_start: options.date_start,
      date_end: options.date_end,
    });

    return this.myDatabaseHelper.getServerUrl() + '/admin/shared/' + shareId;

    //{
    //    "max_uses": null,
    //    "times_used": 0,
    //    "password": null,
    //    "item": "72a8928f-b854-4f7c-8895-becb40bd3041",
    //    "collection": "files_shares",
    //    "name": "Test",
    //    "date_start": null,
    //    "date_end": null,
    //    "date_created": "2025-02-23T21:29:39.026Z",
    //    "id": "ba4f44ae-5aae-4032-9d52-b3ba612618fa",
    //    "role": null,
    //    "user_created": "f9d0803e-254a-45cb-bb9a-c0f692ec28be"
    //}
    // https://127.0.0.1/rocket-meals/api/admin/shared/ba4f44ae-5aae-4032-9d52-b3ba612618fa
  }
}
