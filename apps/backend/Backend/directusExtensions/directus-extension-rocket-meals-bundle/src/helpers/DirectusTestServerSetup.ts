import { ChildProcess, exec, spawn } from 'child_process';
import * as os from 'node:os';
import path from 'path';
import fse from 'fs-extra';
import { FetchHelper } from './FetchHelper';
import { DirectusTypesGenerator } from './DirectusTypesGenerator';

// Server configuration
const ADMIN_EMAIL = 'test@example.com';
const ADMIN_PASSWORD = 'testpassword';
const EXTENSIONS_PATH = path.join(__dirname, '..', '..', '..');

/**
 * Configuration options for DirectusTestServerSetup
 */
export interface DirectusTestServerOptions {
  /** Server port (default: 8055) */
  port?: number;
  /** Server host (default: '0.0.0.0') */
  host?: string;
  /** Database client type (default: 'sqlite3') */
  dbClient?: string;
  /** Database filename (default: auto-generated temp file) */
  dbFilename?: string;
  /** Secret key for Directus (default: generated) */
  secret?: string;
  /** Admin email (default: 'test@example.com') */
  adminEmail?: string;
  /** Admin password (default: 'testpassword') */
  adminPassword?: string;
  /** Extensions path (optional) */
  extensionsPath?: string;
  /** Enable extensions path in environment (default: false) */
  enableExtensions?: boolean;
  /** Generate database types for shared packages after startup (default: true) */
  generateTypes?: boolean;
  /**
   * Target path for generated database types (default: packages/common/src/databaseTypes/types.ts)
   */
  typesOutputPath?: string;
  /** Use intersection types instead of union types for generated relations (default: false) */
  useIntersectionTypesForTypes?: boolean;
  /** Generate type layout compatible with Directus SDK v11 (default: true) */
  sdk11TypesFormat?: boolean;
  /** Maximum attempts to check server readiness (default: 60) */
  maxStartupAttempts?: number;
  /** Delay between startup attempts in milliseconds (default: 1000) */
  startupCheckDelay?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * A reusable class for setting up and managing a Directus test server with in-memory SQLite database.
 * Provides methods for starting, stopping, and checking the health of a Directus server instance
 * specifically configured for testing purposes.
 */
export class DirectusTestServerSetup {
  private directusProcess: ChildProcess | null = null;
  private readonly options: Required<DirectusTestServerOptions>;
  private readonly directusUrl: string;
  private readonly typesGenerator: DirectusTypesGenerator;

  static ADMIN_EMAIL = ADMIN_EMAIL;
  static ADMIN_PASSWORD = ADMIN_PASSWORD;

  /**
   * Creates a new DirectusTestServerSetup instance
   * @param options Configuration options for the server setup
   */
  constructor(options: DirectusTestServerOptions = {}) {
    let uniqueDbFileNameNanoSeconds = Date.now();
    let uniqueDbFilename = `directus-memory-test-${process.pid}${uniqueDbFileNameNanoSeconds}.sqlite`;

    // Set default values for all options
    this.options = {
      port: options.port ?? 8055,
      host: options.host ?? '0.0.0.0',
      dbClient: options.dbClient ?? 'sqlite3',
      dbFilename: options.dbFilename ?? path.join(os.tmpdir(), uniqueDbFilename),
      secret: options.secret ?? 'Ihr-langer-zufälliger-geheimer-Schlüssel-für-Tests',
      adminEmail: options.adminEmail ?? ADMIN_EMAIL,
      adminPassword: options.adminPassword ?? ADMIN_PASSWORD,
      extensionsPath: options.extensionsPath ?? EXTENSIONS_PATH,
      enableExtensions: options.enableExtensions ?? true,
      generateTypes: options.generateTypes ?? true,
      typesOutputPath: options.typesOutputPath,
      useIntersectionTypesForTypes: options.useIntersectionTypesForTypes ?? false,
      sdk11TypesFormat: options.sdk11TypesFormat ?? true,
      maxStartupAttempts: options.maxStartupAttempts ?? 60,
      startupCheckDelay: options.startupCheckDelay ?? 1000,
      debug: options.debug ?? true,
    };

    this.directusUrl = `http://${this.options.host}:${this.options.port}`;

    this.typesGenerator = new DirectusTypesGenerator({
      directusUrl: this.directusUrl,
      adminEmail: this.options.adminEmail,
      adminPassword: this.options.adminPassword,
      outputPath: this.options.typesOutputPath,
      useIntersectionTypes: this.options.useIntersectionTypesForTypes,
      sdk11: this.options.sdk11TypesFormat,
      logger: message => this.log(message),
    });
  }

  /**
   * Returns the URL of the Directus server
   * @returns The server URL
   */
  public getDirectusUrl(): string {
    return this.directusUrl;
  }

  /**
   * Gets the timeout value for server startup operations
   * @returns Timeout in milliseconds
   */
  public getStartupTimeout(): number {
    return this.options.maxStartupAttempts * this.options.startupCheckDelay;
  }

  /**
   * Gets the current configuration options
   * @returns A copy of the configuration options
   */
  public getOptions(): Readonly<Required<DirectusTestServerOptions>> {
    return { ...this.options };
  }

  /**
   * Checks if the Directus server is ready and responding
   * @returns Promise<boolean> True if server is ready, false otherwise
   */
  public async isReady(): Promise<boolean> {
    try {
      const response = await FetchHelper.fetch(`${this.directusUrl}/server/ping`);
      return response.ok;
    } catch (error) {
      console.log('Error checking server readiness:');
      console.log(error);
      return false;
    }
  }

  /**
   * Sets up and starts the Directus server with in-memory SQLite database
   * @returns Promise<void>
   * @throws Error if server fails to start within the configured timeout
   */
  public async setup(): Promise<void> {
    try {
      this.log('Starting Directus test server setup...');

      // 1. Prepare environment variables
      const env = this.buildEnvironment();

      // 2. Bootstrap the database
      await this.bootstrapDatabase(env);

      // 3. Start the server
      await this.startServer(env);

      // 4. Wait for server to be ready
      await this.waitForServerReady();

      // 5. Generate Directus database types for shared packages
      await this.generateTypes();

      this.log('Directus test server setup completed successfully!');
    } catch (error) {
      // Clean up in case of errors
      console.log('Directus test server setup failed:');
      console.log(error);
      await this.teardown();
      throw error;
    }
  }

  /**
   * Generates Directus database types into the shared package using the running server
   * @returns Promise<void>
   */
  public async generateTypes(): Promise<void> {
    if (!this.options.generateTypes) {
      this.log('Skipping Directus type generation (disabled via options).');
      return;
    }

    await this.typesGenerator.generateTypes();
  }

  /**
   * Stops the Directus server and cleans up resources
   * @returns Promise<void>
   */
  public async teardown(): Promise<void> {
    this.log('Stopping Directus test server and cleaning up...');

    // Stop the server process
    if (this.directusProcess) {
      this.log('Stopping Directus server process...');
      try {
        if (this.directusProcess.pid) {
          // Send SIGTERM to the process group to ensure all child processes are terminated
          process.kill(-this.directusProcess.pid, 'SIGTERM');
          this.log('Directus server process stopped.');

          // Wait a moment for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Force kill if still running
          if (!this.directusProcess.killed) {
            process.kill(-this.directusProcess.pid, 'SIGKILL');
            this.log('Directus server process force-killed.');
          }
        }
      } catch (error: any) {
        this.log(`Error stopping server process: ${error.message}`);
        // Continue with cleanup even if process termination fails
      }
      this.directusProcess = null;
    }

    // Clean up database file
    await this.cleanupDatabaseFile();

    this.log('Cleanup completed.');
  }

  /**
   * Builds the environment variables object for Directus
   * @returns Environment variables object
   */
  private buildEnvironment(): Record<string, string> {
    const env: Record<string, string> = {
      ...process.env,
      DB_CLIENT: this.options.dbClient,
      DB_FILENAME: this.options.dbFilename,
      SECRET: this.options.secret,
      PORT: String(this.options.port),
      HOST: this.options.host,
      ADMIN_EMAIL: this.options.adminEmail,
      ADMIN_PASSWORD: this.options.adminPassword,
    };

    if (this.options.enableExtensions) {
      env.EXTENSIONS_PATH = this.options.extensionsPath;
    }

    return env;
  }

  /**
   * Bootstraps the Directus database schema
   * @param env Environment variables
   * @returns Promise<void>
   */
  private async bootstrapDatabase(env: Record<string, string>): Promise<void> {
    this.log('Bootstrapping Directus database...');

    return new Promise((resolve, reject) => {
      exec('npx directus bootstrap', { env }, (error: any, stdout: any, stderr: any) => {
        if (this.options.debug) {
          if (stdout) console.log(`[Bootstrap stdout]: ${stdout}`);
          if (stderr) console.error(`[Bootstrap stderr]: ${stderr}`);
        }

        if (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.log(`Database bootstrap failed: ${err}`);
          return reject(err);
        }

        this.log('Database bootstrap completed.');
        resolve(undefined);
      });
    });
  }

  /**
   * Starts the Directus server process
   * @param env Environment variables
   */
  private async startServer(env: Record<string, string>): Promise<void> {
    this.log('Starting Directus server process...');

    this.directusProcess = spawn('npx', ['directus', 'start'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    this.setupProcessHandlers();
  }

  /**
   * Sets up event handlers for the server process
   */
  private setupProcessHandlers(): void {
    if (!this.directusProcess) return;

    // Handle stdout
    if (this.directusProcess.stdout) {
      this.directusProcess.stdout.on('data', data => {
        if (this.options.debug) {
          console.log(`[Directus stdout]: ${data}`);
        }
      });
    }

    // Handle stderr with filtering for known non-critical messages
    if (this.directusProcess.stderr) {
      this.directusProcess.stderr.on('data', data => {
        const message = data.toString();
        if (!this.isKnownError(message)) {
          if (this.options.debug) {
            console.error(`[Directus stderr]: ${data}`);
          }
        }
      });
    }

    // Ensure parent process doesn't wait for child process to exit
    this.directusProcess.unref();

    // Handle process errors
    this.directusProcess.on('error', err => {
      console.error('Error in Directus server process:', err);
    });

    this.directusProcess.on('close', code => {
      this.log(`Directus server process exited with code ${code}`);
    });
  }

  /**
   * Checks if an error message is a known non-critical error
   * @param message Error message to check
   * @returns True if it's a known non-critical error
   */
  private isKnownError(message: string): boolean {
    if (message.includes('Update available')) {
      return true;
    }
    if (message.includes('SQLite is an experimental feature and might change at any time')) {
      return true;
    }

    return false;
  }

  /**
   * Waits for the server to be ready by periodically checking the health endpoint
   * @returns Promise<void>
   * @throws Error if server doesn't become ready within the configured timeout
   */
  private async waitForServerReady(): Promise<void> {
    this.log('Waiting for Directus server to be ready...');

    let serverReady = false;
    let attempts = 0;

    while (!serverReady && attempts < this.options.maxStartupAttempts) {
      try {
        this.log(`Checking server readiness (${attempts + 1}/${this.options.maxStartupAttempts})...`);
        serverReady = await this.isReady();
        if (serverReady) {
          this.log('Directus server is ready!');
        }
      } catch (error) {
        this.log('Server not yet ready, retrying...');
      }

      if (!serverReady) {
        await new Promise(resolve => setTimeout(resolve, this.options.startupCheckDelay));
        attempts++;
      }
    }

    if (!serverReady) {
      throw new Error('Directus server could not be started within the configured timeout.');
    }
  }

  /**
   * Cleans up the database file
   * @returns Promise<void>
   */
  private async cleanupDatabaseFile(): Promise<void> {
    try {
      if (fse.existsSync(this.options.dbFilename)) {
        this.log('Removing database file...');
        await fse.remove(this.options.dbFilename);
        this.log('Database file removed.');
      }
    } catch (error) {
      console.error('Error removing database file:', error);
    }
  }

  /**
   * Logs a message if debug mode is enabled
   * @param message Message to log
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[DirectusTestServerSetup] ${message}`);
    }
  }
}
