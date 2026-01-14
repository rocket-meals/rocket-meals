import {MyDatabaseHelper} from './MyDatabaseHelper';

export class AvatarHelper {
  /**
   * Deletes the avatar file for a userId
   * @param userId the userId
   * @returns {Promise<void>}
   */
  static async deleteAvatarOfUser(myDatabaseHelper: MyDatabaseHelper, userId: string) {
    const database = myDatabaseHelper?.eventContext?.database || myDatabaseHelper?.apiContext.database;
    // TODO: check if we can use instead of database the userService to handle/manipulate users

    const filesService = await myDatabaseHelper.getFilesHelper();
    if (!userId) {
      throw new Error('deleteAvatarOfUser: No userId provided: ');
    }

    const existingUser = await database('directus_users').where({ id: userId }).first(); //get user
    if (!existingUser) {
      //handle no user found error
      throw new Error('deleteAvatarOfUser: No user found with id: ' + userId);
    }

    const avatar_filename = existingUser.avatar; //get filename of avatar
    if (avatar_filename) {
      //if has image
      await filesService.deleteOne(avatar_filename); //delete file
    }
  }
}
