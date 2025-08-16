import fetch from 'node-fetch';
import { CookieJar } from 'cookiejar';
import fs from 'fs';
import FormData from 'form-data';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dumpPath = "./configuration/directus-config";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

/**
 * Configuration for collections and modules
 */
const requiredModules = ["flow-manager", "schema-management-module", "generate-types"];
const collectionsToSkip = ["2-wikis.json"];

// Load directus .env file
const currentPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf8'));
console.log("Current package.json: ")
console.log(JSON.stringify(currentPackageJson, null, 4));
const DirectusSyncVersion = currentPackageJson.dependencies['directus-sync'];
let directus_url;
let admin_email;
let admin_password;

const configurationPath = path.resolve(__dirname, './configuration');
const directusConfigCollectionsPath = path.resolve(__dirname, './configuration/directus-config/collections');
const directusConfigOverwriteCollectionsPath = path.resolve(__dirname, './configuration/directus-config-overwrite/collections');

const configurationPathRolesPermissions = path.join(configurationPath, 'roles-permissions');
const configurationPathCollections = path.join(configurationPath, 'collections');

// Directus API endpoints
const getUrlPermissions = () => {
    return `${directus_url}/permissions`; // as directus_url can change we need to use a function here
}

const getUrlItems = () => {
    return `${directus_url}/items`; // as directus_url can change we need to use a function here
}

const getUrlSettings = () => {
    return `${directus_url}/settings`; // as directus_url can change we need to use a function here
}

/**
 * MAIN PUSH FUNCTION
 */
export const importSchema = async (envDict = {}) => {
    const MYHOST = envDict.MYHOST;
    const DOMAIN_PATH = envDict.ROCKET_MEALS_PATH;
    const BACKEND_PATH = envDict.ROCKET_MEALS_BACKEND_PATH;
    directus_url = envDict.directus_url || `https://${MYHOST}/${DOMAIN_PATH}/${BACKEND_PATH}`;
    admin_email = envDict.ADMIN_EMAIL;
    admin_password = envDict.ADMIN_PASSWORD;

    console.log("Starting Push Sync");
    const headers = await setupDirectusConnectionAndGetHeaders();
    await copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder();
    await enableRequiredSettings(headers);
    await pushDirectusSyncSchemas();
    await uploadSchemas(headers);
};

// Function to enable required settings
const enableRequiredSettings = async (headers) => {
    console.log("Enabling required settings...");

    // Patch settings with an empty object
    console.log(" -  Patching with empty");
    await fetch(`${getUrlSettings()}`, {
        method: 'PATCH',
        agent: httpsAgent,
        headers: {
            "Cookie": headers.get('cookie'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module_bar: [] }),
    });

    // Fetch the current settings
    console.log(" -  Fetching settings");
    const settings = await fetchGetResponseJson(`${getUrlSettings()}`, headers);

    const modules = settings.data.module_bar;
    if (!modules) throw new Error("Failed to fetch modules!");

    // Enable required modules
    for (const moduleIndex in modules) {
        const module = modules[moduleIndex];
        if (requiredModules.includes(module.id)) {
            if (!module.enabled) {
                console.log(` -  Enabling ${module.id}`);
                modules[moduleIndex].enabled = true;
            } else {
                console.log(` -  ${module.id} already enabled`);
            }
        } else {
            console.log(` -  ${module.id} not required`);
        }
    }

    // Patch updated settings
    const response = await fetch(`${getUrlSettings()}`, {
        agent: httpsAgent,
        method: 'PATCH',
        headers: {
            "Cookie": headers.get('cookie'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module_bar: modules }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} message: ${response.statusText}`);
    }

    console.log(" -  Enabled required settings");
};

const getDirectusSyncParams = () => {
    // Properly escape the password for shell command
    const preserverIds = "dashboards,operations,panels,policies,roles,translations";
    const preserveOption = "--preserve-ids "+preserverIds;
    return '--directus-url ' + directus_url + ' --directus-email ' + admin_email + ' --directus-password "' + admin_password + '" --dump-path ' + dumpPath+ " "+preserveOption
}

const execWithOutput = async (command) => {
    // Split the command into arguments for spawn
    const [cmd, ...args] = command.split(' ');
    console.log(" -  Pushing schema changes");

    const child = spawn(cmd, args, {
        env: { NODE_TLS_REJECT_UNAUTHORIZED: '0', ...process.env },
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data) => {
        process.stdout.write(data);  // Print the output to the console
        output += data.toString();  // Capture the output
    });

    child.stderr.on('data', (data) => {
        process.stderr.write(data);  // Print error output to the console
        output += data.toString();  // Capture the error output
    });

    await new Promise((resolve, reject) => {
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command exited with code ${code}`));
            }
        });
    });

    return output;
}

const execDirectusSync = async (params) => {
    let command = 'npx directus-sync@'+DirectusSyncVersion+' ' + params;
    let output = await execWithOutput(command);
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('✅  Done!')) {
            return true;
        }
    }
    console.error("Error during execution of directus-sync");
    console.error(output);
    return false;
}

const execDirectusSyncMethod = async (method, logText) => {
    console.log(" - Directus Sync: "+logText);
    const directus_sync_params = getDirectusSyncParams();
    const params = method + ' ' + directus_sync_params;
    let success = await execDirectusSync(params);
    if(success) {
        console.log(" -  Success: "+logText);
    } else {
        console.log(" -  No success: "+logText);
        throw new Error("Error during execution of directus-sync");
    }
}

const pushDirectusSyncSchemas = async () => {
    await execDirectusSyncMethod("push", "Pushing schema changes");
};


const uploadSchemas = async (headers) => {
    console.log("Uploading schemas...");
    let files = fs.readdirSync(configurationPathCollections).sort();
    // remove files that are not collections like .DS_Store
    // if file ends with .DS_Store it is not a collection
    files = files.filter(file => !file.endsWith(".DS_Store"));
    for (const file of files) {
        await uploadSchema(headers, path.resolve(configurationPathCollections, file));
    }
}

// Function to import a schema file into Directus
const uploadSchema = async (headers, file) => {
    console.log("Uploading schema... file: "+file)
    const name = file.split('/').pop().split('.').shift();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file));
    const displayName = name.split("-").pop();

    // Check if collection already exists
    const firstElement = await fetchGetResponseJson(`${getUrlItems()}/${displayName}?limit=1`, headers);

    if (firstElement.data.length > 0) {
        console.log(` -  ${displayName} already exists`);
        return;
    }

    // Import collection into Directus
    console.log(` -  Importing ${displayName}`);
    const response = await fetch(`${directus_url}/utils/import/${displayName}`, {
        agent: httpsAgent,
        method: 'POST',
        headers: { "Cookie": headers.get('cookie'), ...formData.getHeaders() },
        body: formData,
    });

    if (!response.ok) {
        console.error(` -  HTTP error! status: ${response.status} message: ${response.statusText} at ${file}`);
    }
};

// Function to fetch data for a collection
const getCollection = async (headers, name) => {
    console.log("Fetching collection... name: "+name)
    const displayName = name.split('/').pop().split('.').shift().split("-").pop();
    console.log(` -  Fetching ${displayName}`);

    // Retrieve collection data
    console.log(" -  Fetching collection data");
    const data = await fetchGetResponseJson(`${getUrlItems()}/${displayName}?limit=-1`, headers);

    return data.data;
};


/**
 * MAIN PULL FUNCTION
 *
 * This function is kept for compatibility but not exported or used
 * by the automated migration process.
 */
const mainPull = async () => {
    console.log("Waiting for Directus to be ready...");
    const headers = await setupDirectusConnectionAndGetHeaders();
    await saveCollections(headers);
    await pullDirectusSyncSchema();
    await copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder();
};

const copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder = async () => {
    // copy all files except .DS_Store from directusConfigOverwriteCollectionsPath to directusConfigCollectionsPath

    const files = fs.readdirSync(directusConfigOverwriteCollectionsPath);
    for (const file of files) {
        if (file.endsWith('.DS_Store')) {
            continue;
        }
        const source = path.resolve(directusConfigOverwriteCollectionsPath, file);
        const destination = path.resolve(directusConfigCollectionsPath, file);
        fs.copyFileSync(source, destination);
    }
}


// Function to save collections
const saveCollections = async (headers) => {
    console.log("Saving collections...");
    let collections = fs.readdirSync(configurationPathCollections);
    // remove files that are not collections like .DS_Store
    // if file ends with .DS_Store it is not a collection
    collections = collections.filter(file => !file.endsWith(".DS_Store"));

    for (const collection of collections) {
        if (collectionsToSkip.includes(collection)) {
            console.log(` -  Skipping ignored collection: ${collection}`);
            continue;
        }

        const data = await getCollection(headers, collection);
        console.log(data);
        const jsonData = JSON.stringify(data, null, 4);
        console.log(` -  Fetched ${collection} (${data.length} items)`);
        console.log(jsonData);

        // Save the collection data to file
        fs.writeFileSync(path.resolve(configurationPathCollections, collection), jsonData);
    }

    console.log(" -  Saved collections");
};



const pullDirectusSyncSchema = async() => {
    await execDirectusSyncMethod("pull", "Pulling schema changes");
}


const setupDirectusConnectionAndGetHeaders = async () => {
    console.log("Setting up Directus connection...");
    await waitForDirectusToBeReady();
    return await login();
}

const waitForDirectusToBeReady = async () => {
    console.log("Waiting for Directus to be ready...");
    console.log("Checking directus server at: "+directus_url)
    const retries = 100
    let ready = false;
    for (let i = 0; i < retries; i++) {
        try {
            console.log("Fetch directus ping...");
            await fetch(`${directus_url}/server/ping`, {
                agent: httpsAgent,
                method: 'GET',
            });
            await fetchGetResponse(`${directus_url}/server/ping`, undefined);

            console.log("Directus is ready\n");
            ready = true;
            break;
        } catch (e) {
            console.log("Directus is not ready yet")
            console.log(e)
            const TIME_TO_WAIT = 1000;
            console.log("Trying again in " + TIME_TO_WAIT + "ms");
            await new Promise(resolve => setTimeout(resolve, TIME_TO_WAIT));
        }
    }
    if (!ready) {
        console.log("Directus is not ready after " + retries + " retries, please make sure Directus is running");
        throw new Error("Directus is not ready");
    }
    return ready;
}

// Function to handle login and return headers with cookies
const login = async () => {
    console.log("Logging into Directus...");
    const cookieJar = new CookieJar();
    const headers = new Headers();
    const origin = new URL(directus_url).origin;

    //console.log("admin_email: "+admin_email);
    //console.log("admin_password: "+admin_password)

    const response = await fetch(`${directus_url}/auth/login`, {
        agent: httpsAgent,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin_email, password: admin_password, mode: "session" }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Save the cookies to the jar
    const cookies = response.headers.get('set-cookie');
    cookieJar.setCookie(cookies, origin);

    headers.set(
        'cookie',
        cookieJar
            .getCookies({
                domain: origin,
                path: '/',
                secure: true,
                script: false,
            })
            .toValueString(),
    );

    return headers;
};

const fetchGetOptions = (headers, method) => {
    return {
        agent: httpsAgent,
        method: method,
        headers: headers,
    };
}

// Refactored fetch GET function
const fetchGetResponse = async (url, headers) => {
    let headersObject = undefined
    if(headers) {
        headersObject = {"Cookie": headers.get('cookie')}
    }

    return await fetch(url, fetchGetOptions(headersObject, 'GET'));
}

const fetchGetResponseJson = async (url, headers) => {
    const response = await fetchGetResponse(url, headers);
    return await response.json();
}

const fetchPostResponse = async (url, headers, body) => {
    return await fetch(url, {
        agent: httpsAgent,
        method: 'POST',
        headers: headers,
        body: body,
    });
}

const fetchPatchResponse = async (url, headers, body) => {
    return await fetch(url, {
        agent: httpsAgent,
        method: 'PATCH',
        headers: headers,
        body: body,
    });
}


// Legacy command-line support
if (process.argv[2] === "push") {
    // When executed directly, import the schema using environment variables
    importSchema({
        MYHOST: process.env.MYHOST,
        ROCKET_MEALS_PATH: process.env.ROCKET_MEALS_PATH,
        ROCKET_MEALS_BACKEND_PATH: process.env.ROCKET_MEALS_BACKEND_PATH,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    });
} else if (process.argv[2] === "pull") {
    mainPull();
}
