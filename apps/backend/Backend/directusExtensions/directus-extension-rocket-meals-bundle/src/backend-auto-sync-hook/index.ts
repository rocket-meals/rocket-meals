import { defineHook } from '@directus/extensions-sdk';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { EnvVariableHelper, BackendAutoSyncModeEnum } from '../helpers/EnvVariableHelper';
import { spawn } from 'child_process';
import path from 'path';

const SCHEDULE_NAME = 'backend_auto_sync';

export default defineHook(async ({ init }, apiContext) => {
  // Check if database is initialized before proceeding
  let allTablesExist = await DatabaseInitializedCheck.checkAllTablesExistWithApiContext(SCHEDULE_NAME, apiContext);
  if (!allTablesExist) {
    console.log('Backend Auto-Sync: Database not fully initialized, skipping auto-sync');
    return;
  }

  // Check if auto-sync is enabled
  const autoSyncMode = EnvVariableHelper.getBackendAutoSyncMode();
  if (autoSyncMode === BackendAutoSyncModeEnum.DISABLED) {
    console.log('Backend Auto-Sync: Auto-sync is disabled');
    return;
  }

  console.log(`Backend Auto-Sync: Mode is set to '${autoSyncMode}'`);

  /**
   * Execute schema synchronization using the existing importSchema.js script
   */
  async function executeSchemaSync(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Backend Auto-Sync: Starting schema synchronization...');
      
      // Get the path to the sync directory and importSchema.js
      const syncPath = path.resolve(__dirname, '../../../../../sync');
      const importSchemaPath = path.join(syncPath, 'importSchema.js');
      
      console.log(`Backend Auto-Sync: Sync path: ${syncPath}`);
      console.log(`Backend Auto-Sync: Import schema path: ${importSchemaPath}`);

      // Execute the pull command to sync schema
      const syncProcess = spawn('node', [importSchemaPath, 'pull'], {
        cwd: syncPath,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Set environment variables to avoid interactive prompts during auto-sync
          NODE_ENV: 'production',
          AUTO_SYNC_MODE: 'true'
        }
      });

      let stdout = '';
      let stderr = '';

      syncProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`Backend Auto-Sync: ${output.trim()}`);
      });

      syncProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`Backend Auto-Sync Error: ${output.trim()}`);
      });

      syncProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Backend Auto-Sync: Schema synchronization completed successfully');
          resolve();
        } else {
          console.error(`Backend Auto-Sync: Schema synchronization failed with exit code ${code}`);
          console.error(`Backend Auto-Sync: stderr: ${stderr}`);
          reject(new Error(`Schema sync failed with exit code ${code}: ${stderr}`));
        }
      });

      syncProcess.on('error', (error) => {
        console.error('Backend Auto-Sync: Failed to start schema sync process:', error);
        reject(error);
      });
    });
  }

  /**
   * Execute schema sync only in full mode
   * In test mode, we skip schema sync to avoid conflicts
   */
  async function handleAutoSync(): Promise<void> {
    try {
      if (autoSyncMode === BackendAutoSyncModeEnum.FULL) {
        console.log('Backend Auto-Sync: Full mode - executing schema synchronization');
        await executeSchemaSync();
      } else if (autoSyncMode === BackendAutoSyncModeEnum.TEST) {
        console.log('Backend Auto-Sync: Test mode - skipping schema sync to avoid conflicts');
        console.log('Backend Auto-Sync: Only collection cleanup will be performed by collections-last-update-hook');
      }
    } catch (error) {
      console.error('Backend Auto-Sync: Error during auto-sync process:', error);
      // Don't throw the error to prevent the app from failing to start
      // Log the error and continue with startup
    }
  }

  // Register the hook to run after the app has started
  init('app.after', async () => {
    console.log('Backend Auto-Sync: App started, checking auto-sync configuration...');
    
    // Add a small delay to ensure all other hooks have been initialized
    setTimeout(async () => {
      await handleAutoSync();
    }, 5000); // 5 second delay
  });
});