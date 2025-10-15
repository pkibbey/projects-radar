import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Clone a GitHub repository to a temporary directory for analysis
 * @param owner Repository owner
 * @param repo Repository name
 * @param token GitHub token for authentication (supports private repos)
 * @returns Path to the cloned repository
 */
export async function cloneRepoForAnalysis(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `repo-${owner}-${repo}-${Date.now()}`);
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    // Clone with token for private repos (shallow clone for speed)
    const cloneUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    await execAsync(`git clone --depth 1 "${cloneUrl}" "${tempDir}"`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    console.log(`Successfully cloned ${owner}/${repo} to ${tempDir}`);
    return tempDir;
  } catch (error) {
    console.error(`Failed to clone ${owner}/${repo}:`, error);
    // Cleanup on failure
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Remove a cloned repository from the file system
 * @param repoPath Path to the cloned repository
 */
export async function cleanupRepo(repoPath: string): Promise<void> {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    console.log(`Cleaned up repository at ${repoPath}`);
  } catch (error) {
    console.error(`Failed to cleanup repository at ${repoPath}:`, error);
    // Don't throw - cleanup failures shouldn't break the flow
  }
}
