import {EventHelper} from '../helpers/EventHelper';
import {AvatarHelper} from '../helpers/AvatarHelper';
import {MyDefineHook} from '../helpers/MyDefineHook';
import {MyDatabaseHelper, MyEventContext} from '../helpers/MyDatabaseHelper';

const SCHEDULE_NAME = 'users_avatar_delete';

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME,async ({ filter }, apiContext) => {
  filter(
    EventHelper.USERS_DELETE_EVENT,
    // @ts-ignore
    async (payload: any, input, eventContext: MyEventContext) => {
        let myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);

      const usersIds = payload; //get the user ids
      for (const userId of usersIds) {
        // for all users which get deleted
        await AvatarHelper.deleteAvatarOfUser(myDatabaseHelper, userId); //delete avatar file
      }

      return payload;
    }
  );
});
