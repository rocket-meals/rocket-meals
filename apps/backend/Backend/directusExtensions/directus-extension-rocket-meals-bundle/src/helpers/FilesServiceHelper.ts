import { FileServiceCreator, FileServiceFileStream, FileServiceSteamType, FilesService, MutationOptions } from './ItemsServiceCreator';
import { ItemsServiceHelper } from './ItemsServiceHelper';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { PrimaryKey } from '@directus/types';
import { Readable } from 'node:stream';
import type { Stat } from '@directus/storage';
import { AssetsService } from './MyServiceClassHelpers';
import { CreateShareLinkOptionForDirectusFiles, ShareDirectusFileMethod, ShareServiceHelper } from './ShareServiceHelper';
import { Buffer } from 'node:buffer';
import { MyDatabaseHelperInterface } from './MyDatabaseHelperInterface';
import {AccountHelper} from "./AccountHelper";

export enum MyFileTypes {
  PDF = 'application/pdf',
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  JPG = 'image/jpg',
  JSON = 'application/json',
  CSV = 'text/csv',
  TXT = 'text/plain',
}

export class FilesServiceHelper extends ItemsServiceHelper<DatabaseTypes.DirectusFiles> implements FilesService, ShareDirectusFileMethod {

  private useAdminAccountability: boolean = false;

  constructor(myDatabaseHelper: MyDatabaseHelperInterface, useAdminAccountability: boolean = false) {
    super(myDatabaseHelper, CollectionNames.DIRECTUS_FILES);
    this.useAdminAccountability = useAdminAccountability;
  }

  protected override async getItemsService() {
    const filesServiceCreator = new FileServiceCreator(this.apiContext, this.eventContext, this.useAdminAccountability);
    let filesService = await filesServiceCreator.getFileService();
    return filesService;
  }

  public static sanitizeFilename(filename: string): string {
    // Replace any invalid characters with underscores
    filename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    // Limit the filename length to 255 characters
    if (filename.length > 255) {
      filename = filename.substring(0, 255);
    }
    // if empty, set to "filename_download"
    if (filename.length === 0) {
      filename = 'filename_download';
    }
    return filename;
  }

  /**
   * Upload a buffer as a new Directus file.
   *
   * @param buffer               File contents to upload
   * @param filename             Desired file name
   * @param fileType             MIME type of the file
   * @param myDatabaseHelper     Helper used to access Directus services
   * @param directus_folder_id   Optional folder id where the file should be stored
   * @returns The id of the created file
   */
  async uploadOneFromBuffer(buffer: Buffer, filename: string, fileType: MyFileTypes, myDatabaseHelper: MyDatabaseHelperInterface, directus_folder_id?: string): Promise<PrimaryKey> {
    const filesHelper = new FilesServiceHelper(myDatabaseHelper);

    // Convert Buffer to a Readable Stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // Mark end of stream

    let filename_download = FilesServiceHelper.sanitizeFilename(filename);
    // now fix the filename to be a valid filename

    // Define file metadata
    const fileMetadata: FileServiceFileStream = {
      filename_download: filename_download,
      title: filename,
      type: fileType,
      storage: 'local',
      folder: directus_folder_id,
    };

    // Upload the file
    try {
      const fileId = await this.uploadOne(stream, fileMetadata);
      //console.log('File uploaded successfully with ID:', fileId);
      return fileId;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload a stream to the Directus file service.
   *
   * @param stream       Input stream containing file data
   * @param data         Metadata describing the file
   * @param primaryKey   Optional file id to update instead of creating
   * @param opts         Additional Directus mutation options
   */
  async uploadOne(stream: FileServiceSteamType, data: FileServiceFileStream, primaryKey?: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey> {
    let filesService = await this.getItemsService();
    return filesService.uploadOne(stream, data, primaryKey, opts);
  }

  /**
   * Import a file from a remote URL into Directus.
   *
   * @param importURL   Remote URL to fetch the file from
   * @param body        Additional metadata for the file
   */
  async importOne(importURL: string, body: Partial<DatabaseTypes.DirectusFiles>): Promise<PrimaryKey> {
    let filesService = await this.getItemsService();
    return filesService.importOne(importURL, body);
  }

  /**
   * Retrieve the raw file content for a given file id.
   *
   * @param id Directus file id
   * @returns Buffer containing the file's data
   */
  async readFileContent(id: PrimaryKey): Promise<Buffer> {
    console.log('FilesServiceHelper.readFileContent: ', id);
    const AssetsService: AssetsService = this.apiContext.services.AssetsService;
    let schema = await this.apiContext.getSchema();
    // @ts-ignore
    let assetsService = new AssetsService({
      accountability: null, //this makes us admin
      knex: this.knex,
      schema: schema,
    });

    console.log(' - getAsset: ', id);
    let file: {
      stream: Readable;
      file: any;
      stat: Stat;
    } = await assetsService.getAsset(id, { transformationParams: {} }); // https://github.com/directus/directus/discussions/14318

    console.log(' - read the file buffer');
    let chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      file.stream.on('data', (chunk: Buffer<ArrayBufferLike>) => {
        console.log('Chunk type:', typeof chunk, 'instanceof Buffer:', chunk instanceof Buffer);
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      file.stream.on('end', () => {
        console.log(' - end of stream');
        // @ts-ignore
        resolve(Buffer.concat(chunks));
      });
      file.stream.on('error', (error: Error) => {
        console.error(' - error in stream', error);
        reject(error);
      });
    });
  }

  /**
   * Create a public share link for a Directus file.
   *
   * @param options Options used for creating the share entry
   * @returns URL of the share link or null if creation failed
   */
  createDirectusFilesShareLink(options: CreateShareLinkOptionForDirectusFiles): Promise<string | null> {
    let shareServiceHelper = new ShareServiceHelper(this.myDatabaseHelper);
    return shareServiceHelper.createDirectusFilesShareLink(options);
  }
}
