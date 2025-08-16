import {defineHook} from '@directus/extensions-sdk';
import {MyDatabaseHelper} from "../helpers/MyDatabaseHelper";
import {EnvVariableHelper} from "../helpers/EnvVariableHelper";
import {registerInitHook} from "../helpers/InitHookAfterMigrationHelper";

const SCHEDULE_NAME = "activity_auto_cleanup";

export default defineHook(async ({init}, apiContext) => {

    const myDatabaseHelper = new MyDatabaseHelper(apiContext);

    let envAdminEmail = EnvVariableHelper.getAdminEmail();
    let envAdminPassword = EnvVariableHelper.getAdminPassword();

    if(!envAdminEmail || !envAdminPassword) {
        console.log(SCHEDULE_NAME + ": Admin email or password not set in environment variables. Skipping reset of admin password.");
    }

    const userHelper = myDatabaseHelper.getUsersHelper();

    registerInitHook(async () => {
        const usersWithAdminEmail = await userHelper.readByQuery({
            filter: {
                _and: [
                    {
                        email: {
                            _eq: envAdminEmail
                        }
                    },
                    {
                        provider: {
                            _eq: "default"
                        }
                    }
                ]
            }
        })
        if(usersWithAdminEmail.length == 0) {
            console.log(SCHEDULE_NAME + ": Admin user with email " + envAdminEmail + " not found. Skipping reset of admin password.");
            return;
        }
        if(usersWithAdminEmail.length > 1) {
            console.log(SCHEDULE_NAME + ": Found multiple users with email " + envAdminEmail + ". Skipping reset of admin password.");
            return;
        }
        let adminUser = usersWithAdminEmail[0];
        if(!adminUser){
            console.log(SCHEDULE_NAME + ": Admin user with email " + envAdminEmail + " not found. Skipping reset of admin password.");
            return;
        }
        await userHelper.updateOne(adminUser.id, {
            password: envAdminPassword
        })
    });
});
