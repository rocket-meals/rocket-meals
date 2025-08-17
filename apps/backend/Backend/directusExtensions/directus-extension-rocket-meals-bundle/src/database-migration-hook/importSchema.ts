import {FetchHelper} from './../helpers/FetchHelper'
import {CookieJar} from 'cookiejar'
import fs from 'fs'
import FormData from 'form-data'
import {spawn} from 'child_process'
import path from 'path'
import https from 'https'
import {ChildProcessWithoutNullStreams} from "node:child_process";

const DIRECTUS_SYNC_CONFIGURATION_PATH = "/directus/directus-sync-data/configuration";
const DIRECTUS_SYNC_CONFIGURATION_DIRECTUS_CONFIG = path.join(DIRECTUS_SYNC_CONFIGURATION_PATH, "./directus-config");

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * Configuration for collections and modules
 */
const requiredModules = ['flow-manager', 'schema-management-module', 'generate-types'] as const
const collectionsToSkip = ['2-wikis.json']

let directus_url: string
let admin_email: string
let admin_password: string

const configurationPath = path.resolve(DIRECTUS_SYNC_CONFIGURATION_PATH, './configuration')
const directusConfigCollectionsPath = path.resolve(
    DIRECTUS_SYNC_CONFIGURATION_PATH,
    './configuration/directus-config/collections'
)
const directusConfigOverwriteCollectionsPath = path.resolve(
    DIRECTUS_SYNC_CONFIGURATION_PATH,
    './configuration/directus-config-overwrite/collections'
)

const configurationPathCollections = path.join(configurationPath, 'collections')

// Types
interface ModuleBarItem {
    id: string
    enabled: boolean
    // Allow unknown properties for forward compatibility
    [key: string]: unknown
}

interface SettingsResponse {
    data: {
        module_bar?: ModuleBarItem[]
        [key: string]: unknown
    }
}

interface ItemsListResponse<T = unknown> {
    data: T[]
}

interface EnvDict {
    MYHOST: string
    ROCKET_MEALS_PATH: string
    ROCKET_MEALS_BACKEND_PATH: string
    directus_url?: string
    ADMIN_EMAIL: string
    ADMIN_PASSWORD: string
}

const getUrlItems = (): string => {
    return `${directus_url}/items` // as directus_url can change we need to use a function here
}

const getUrlSettings = (): string => {
    return `${directus_url}/settings` // as directus_url can change we need to use a function here
}

/**
 * MAIN PUSH FUNCTION
 */
export const importSchema = async (envDict: Partial<EnvDict> = {}): Promise<void> => {
    const MYHOST = envDict.MYHOST as string
    const DOMAIN_PATH = envDict.ROCKET_MEALS_PATH as string
    const BACKEND_PATH = envDict.ROCKET_MEALS_BACKEND_PATH as string
    directus_url = envDict.directus_url || `https://${MYHOST}/${DOMAIN_PATH}/${BACKEND_PATH}`
    admin_email = envDict.ADMIN_EMAIL as string
    admin_password = envDict.ADMIN_PASSWORD as string

    console.log('Starting Push Sync')
    const headers = await setupDirectusConnectionAndGetHeaders()
    await copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder()
    await enableRequiredSettings(headers)
    await pushDirectusSyncSchemas()
    await uploadSchemas(headers)
}

// Function to enable required settings
const enableRequiredSettings = async (headers: Headers): Promise<void> => {
    console.log('Enabling required settings...')

    // Patch settings with an empty object
    console.log(' -  Patching with empty')
    await FetchHelper.fetch(getUrlSettings(), {
        method: 'PATCH',
        headers: { Cookie: headers.get('cookie') ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_bar: [] }),
        agent: httpsAgent as any,
    })

    // Fetch the current settings
    console.log(' -  Fetching settings')
    const settings = (await fetchGetResponseJson(getUrlSettings(), headers)) as SettingsResponse

    const modules = settings.data.module_bar
    if (!modules) throw new Error('Failed to fetch modules!')

    // Enable required modules
    for (const moduleIndex in modules) {
        const module = modules[moduleIndex]
        if(module) {
            if ((requiredModules as readonly string[]).includes(module.id)) {
                if (!module.enabled) {
                    console.log(` -  Enabling ${module.id}`)
                    module.enabled = true
                } else {
                    console.log(` -  ${module.id} already enabled`)
                }
            } else {
                console.log(` -  ${module.id} not required`)
            }
            modules[moduleIndex] = module;
        }
    }

    // Patch updated settings
    const response = await FetchHelper.fetch(getUrlSettings(), {
        method: 'PATCH',
        headers: { Cookie: headers.get('cookie') ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_bar: modules }),
        agent: httpsAgent as any,
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} message: ${response.statusText}`)
    }

    console.log(' -  Enabled required settings')
}

const getDirectusSyncParams = (): string => {
    // Properly escape the password for shell command
    const preserverIds = 'dashboards,operations,panels,policies,roles,translations'
    const preserveOption = '--preserve-ids ' + preserverIds
    return (
        '--directus-url ' +
        directus_url +
        ' --directus-email ' +
        admin_email +
        ' --directus-password "' +
        admin_password +
        '" --dump-path ' +
        DIRECTUS_SYNC_CONFIGURATION_DIRECTUS_CONFIG +
        ' ' +
        preserveOption
    )
}

const execWithOutput = async (command: string): Promise<string> => {
    // Split the command into arguments for spawn
    const [cmd, ...args] = command.split(' ')
    console.log(' -  Pushing schema changes')

    if( !cmd || !args.length) {
        throw new Error('Invalid command or arguments provided for execWithOutput')
    }

    const child = spawn(cmd, args, {
        env: { NODE_TLS_REJECT_UNAUTHORIZED: '0', ...process.env },
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe'],
    }) as any as ChildProcessWithoutNullStreams;

    let output = ''

    child.stdout.on('data', data => {
        process.stdout.write(data) // Print the output to the console
        output += data.toString() // Capture the output
    })

    child.stderr.on('data', data => {
        process.stderr.write(data) // Print error output to the console
        output += data.toString() // Capture the error output
    })

    await new Promise<void>((resolve, reject) => {
        child.on('close', code => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Command exited with code ${code}`))
            }
        })
    })

    return output
}

const execDirectusSync = async (params: string): Promise<boolean> => {
    const command = 'pnpm exec directus-sync ' + params
    const output = await execWithOutput(command)
    const lines = output.split('\n')
    for (const line of lines) {
        if (line.includes('✅  Done!')) {
            return true
        }
    }
    console.error('Error during execution of directus-sync')
    console.error(output)
    return false
}

const execDirectusSyncMethod = async (method: 'push' | 'pull', logText: string): Promise<void> => {
    console.log(' - Directus Sync: ' + logText)
    const directus_sync_params = getDirectusSyncParams()
    const params = method + ' ' + directus_sync_params
    const success = await execDirectusSync(params)
    if (success) {
        console.log(' -  Success: ' + logText)
    } else {
        console.log(' -  No success: ' + logText)
        throw new Error('Error during execution of directus-sync')
    }
}

const pushDirectusSyncSchemas = async (): Promise<void> => {
    await execDirectusSyncMethod('push', 'Pushing schema changes')
}

const uploadSchemas = async (headers: Headers): Promise<void> => {
    console.log('Uploading schemas...')
    let files = fs.readdirSync(configurationPathCollections).sort()
    // remove files that are not collections like .DS_Store
    files = files.filter(file => !file.endsWith('.DS_Store'))
    for (const file of files) {
        await uploadSchema(headers, path.resolve(configurationPathCollections, file))
    }
}

// Function to import a schema file into Directus
const uploadSchema = async (headers: Headers, file: string): Promise<void> => {
    console.log('Uploading schema... file: ' + file)
    const baseName = path.parse(file).name
    const formData = new FormData()
    formData.append('file', fs.createReadStream(file))
    const displayName = (baseName.split('-').pop() ?? baseName).trim()

    // Check if collection already exists
    const firstElement = (await fetchGetResponseJson(
        `${getUrlItems()}/${displayName}?limit=1`,
        headers
    )) as ItemsListResponse

    if (Array.isArray(firstElement.data) && firstElement.data.length > 0) {
        console.log(` -  ${displayName} already exists`)
        return
    }

    // Import collection into Directus
    console.log(` -  Importing ${displayName}`)
    const extraHeaders = formData.getHeaders() as Record<string, string>
    const response = await FetchHelper.fetch(`${directus_url}/utils/import/${displayName}`, {
        method: 'POST',
        headers: { Cookie: headers.get('cookie') ?? '', ...extraHeaders },
        body: formData as any,
        agent: httpsAgent as any,
    })

    if (!response.ok) {
        console.error(
            ` -  HTTP error! status: ${response.status} message: ${response.statusText} at ${file}`
        )
    }
}

// Function to fetch data for a collection
const getCollection = async (headers: Headers, name: string): Promise<unknown[]> => {
    console.log('Fetching collection... name: ' + name)
    const displayName = (path.parse(name).name.split('-').pop() ?? name).trim()
    console.log(` -  Fetching ${displayName}`)

    // Retrieve collection data
    console.log(' -  Fetching collection data')
    const data = (await fetchGetResponseJson(
        `${getUrlItems()}/${displayName}?limit=-1`,
        headers
    )) as ItemsListResponse

    return data.data
}

/**
 * MAIN PULL FUNCTION
 *
 * This function is kept for compatibility but not exported or used
 * by the automated migration process.
 */
const mainPull = async (): Promise<void> => {
    console.log('Waiting for Directus to be ready...')
    const headers = await setupDirectusConnectionAndGetHeaders()
    await saveCollections(headers)
    await pullDirectusSyncSchema()
    await copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder()
}

const filterFileAndFolgersWithDsStore = (files: string[]): string[] => {
    // Filter out .DS_Store files from the list of files
    return files.filter(file => !file.endsWith('.DS_Store'))
}

const copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder = async (): Promise<void> => {
    // copy all files except .DS_Store from directusConfigOverwriteCollectionsPath to directusConfigCollectionsPath

    let files = fs.readdirSync(directusConfigOverwriteCollectionsPath)
    files = filterFileAndFolgersWithDsStore(files)

    for (const file of files) {
        const source = path.resolve(directusConfigOverwriteCollectionsPath, file)
        const destination = path.resolve(directusConfigCollectionsPath, file)
        fs.copyFileSync(source, destination)
    }
}

// Function to save collections
const saveCollections = async (headers: Headers): Promise<void> => {
    console.log('Saving collections...')
    let collections = fs.readdirSync(configurationPathCollections)
    // remove files that are not collections like .DS_Store
    collections = filterFileAndFolgersWithDsStore(collections);

    for (const collection of collections) {
        if (collectionsToSkip.includes(collection)) {
            console.log(` -  Skipping ignored collection: ${collection}`)
            continue
        }

        const data = await getCollection(headers, collection)
        console.log(data)
        const jsonData = JSON.stringify(data, null, 4)
        console.log(` -  Fetched ${collection} (${(data as unknown[]).length} items)`)
        console.log(jsonData)

        // Save the collection data to file
        fs.writeFileSync(path.resolve(configurationPathCollections, collection), jsonData)
    }

    console.log(' -  Saved collections')
}

const pullDirectusSyncSchema = async (): Promise<void> => {
    await execDirectusSyncMethod('pull', 'Pulling schema changes')
}

const setupDirectusConnectionAndGetHeaders = async (): Promise<Headers> => {
    console.log('Setting up Directus connection...')
    await waitForDirectusToBeReady()
    return await login()
}

const waitForDirectusToBeReady = async (): Promise<boolean> => {
    console.log('Waiting for Directus to be ready...')
    console.log('Checking directus server at: ' + directus_url)
    const retries = 100
    let ready = false
    const pingUrl = `${directus_url}/server/ping`;
    for (let i = 0; i < retries; i++) {
        try {
            console.log('Fetch directus ping...')
            await FetchHelper.fetch(pingUrl, {
                method: 'GET',
                agent: httpsAgent as any,
            })
            await fetchGetResponse(pingUrl, undefined)

            console.log('Directus is ready\n')
            ready = true
            break
        } catch (e) {
            console.log('Directus is not ready yet')
            console.log(e)
            const TIME_TO_WAIT = 1000
            console.log('Trying again in ' + TIME_TO_WAIT + 'ms')
            await new Promise(resolve => setTimeout(resolve, TIME_TO_WAIT))
        }
    }
    if (!ready) {
        console.log(
            'Directus is not ready after ' + retries + ' retries, please make sure Directus is running'
        )
        throw new Error('Directus is not ready')
    }
    return ready
}

// Function to handle login and return headers with cookies
const login = async (): Promise<Headers> => {
    console.log('Logging into Directus...')
    const cookieJar = new CookieJar()
    const headers = new Headers()
    const url = new URL(directus_url)
    const directusAuthUrl = `${url.origin}/auth/login`

    const response = await FetchHelper.fetch(directusAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin_email, password: admin_password, mode: 'session' }),
        agent: httpsAgent as any,
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Save the cookies to the jar
    const cookies = response.headers.get('set-cookie')
    if (!cookies) throw new Error('No set-cookie header received from Directus')

    cookieJar.setCookie(cookies, url.origin)

    const cookieValue = (cookieJar as any)
        .getCookies({
            domain: url.hostname,
            path: '/',
            secure: true,
            script: false,
        })
        .toValueString()

    headers.set('cookie', cookieValue)

    return headers
}

const fetchGetOptions = (
    headers: Headers | undefined,
    method: 'GET' | 'POST' | 'PATCH'
): any => {
    const headerObj = headers ? { Cookie: headers.get('cookie') ?? '' } : undefined
    return {
        agent: httpsAgent as any,
        method,
        headers: headerObj,
    }
}

// Refactored fetch GET function
const fetchGetResponse = async (url: string, headers: Headers | undefined) => {
    return await FetchHelper.fetch(url, fetchGetOptions(headers, 'GET'))
}

const fetchGetResponseJson = async (
    url: string,
    headers: Headers | undefined
): Promise<unknown> => {
    const response = await fetchGetResponse(url, headers)
    return (await response.json()) as unknown
}