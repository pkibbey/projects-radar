import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { chromium, type Browser } from 'playwright';

const execAsync = promisify(exec);

/**
 * Generate screenshot of a repository's homepage
 * @param owner Repository owner
 * @param repo Repository name
 * @param token GitHub token for authentication
 * @returns Path to the screenshot file
 */
export async function generateRepositoryScreenshot(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `repo-screenshot-${owner}-${repo}-${Date.now()}`);
  const screenshotPath = path.join(tempDir, 'SCREENSHOT.png');
  
  let clonedRepoPath: string | null = null;
  let devProcess: any = null;
  let browser: Browser | null = null;
  let port: number | null = null;
  
  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
    
    // Clone the repository
    console.log(`[Screenshot] Cloning ${owner}/${repo}...`);
    clonedRepoPath = path.join(tempDir, 'repo');
    const cloneUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    await execAsync(`git clone --depth 1 "${cloneUrl}" "${clonedRepoPath}"`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Check if it's a Node.js project
    const packageJsonPath = path.join(clonedRepoPath, 'package.json');
    const packageJsonExists = await fileExists(packageJsonPath);
    
    if (!packageJsonExists) {
      throw new Error(`No package.json found in ${owner}/${repo} - not a Node.js project`);
    }

    // Install dependencies
    console.log(`[Screenshot] Installing dependencies for ${owner}/${repo}...`);
    await execAsync('npm install', {
      cwd: clonedRepoPath,
      maxBuffer: 1024 * 1024 * 10,
      timeout: 300000, // 5 minutes
    });

    // Allocate a random, unique port (range 10000-60000 to avoid conflicts)
    port = Math.floor(Math.random() * 50000) + 10000;
    console.log(`[Screenshot] Allocated port ${port} for ${owner}/${repo}`);
    
    const nextConfigPath = path.join(clonedRepoPath, 'next.config.ts');
    const nextConfigJsPath = path.join(clonedRepoPath, 'next.config.js');
    
    // Check if this is a Next.js project
    const isNextJs = await fileExists(nextConfigPath) || await fileExists(nextConfigJsPath);
    
    if (!isNextJs) {
      // Try to detect from package.json for other frameworks
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.scripts?.dev?.includes(':3001')) {
        port = 3001;
      } else if (packageJson.scripts?.dev?.includes(':5173')) {
        port = 5173; // Vite
      } else if (packageJson.scripts?.dev?.includes(':3000')) {
        port = 3000;
      }
    }
    
    // Start dev server with explicit port for Next.js or environment variable for others
    console.log(`[Screenshot] Starting dev server for ${owner}/${repo} on port ${port}...`);
    
    const envVars = { 
      ...process.env,
      PORT: port.toString(),
    };
    
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: clonedRepoPath,
      env: envVars,
      stdio: 'ignore', // Suppress output
    });
    
    // Wait for server to start with increased timeout and better health checking
    await waitForServer(`http://localhost:${port}`, 90000, owner, repo); // 90 second timeout
    
    // Launch browser and take screenshot
    console.log(`[Screenshot] Taking screenshot of ${owner}/${repo}...`);
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(`http://localhost:${port}`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait a bit for any animations to complete
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[Screenshot] Screenshot saved to ${screenshotPath}`);
    } finally {
      await page.close();
    }
    
    // Update README.md with screenshot
    await updateReadmeWithScreenshot(clonedRepoPath);
    
    // Copy screenshot to repo root
    const repoScreenshotPath = path.join(clonedRepoPath, 'SCREENSHOT.png');
    await fs.copyFile(screenshotPath, repoScreenshotPath);
    
    // Push changes back to GitHub (optional, requires write access)
    console.log(`[Screenshot] Pushing changes back to ${owner}/${repo}...`);
    await execAsync('git config user.email "bot@example.com"', { cwd: clonedRepoPath });
    await execAsync('git config user.name "Screenshot Bot"', { cwd: clonedRepoPath });
    await execAsync('git add SCREENSHOT.png README.md', { cwd: clonedRepoPath });
    
    // Only commit if there are changes
    try {
      await execAsync('git commit -m "Add screenshot to README"', { cwd: clonedRepoPath });
      await execAsync('git push', { cwd: clonedRepoPath });
    } catch (e) {
      // Commit or push might fail if no changes or no permissions
      console.warn(`[Screenshot] Could not push changes: ${e}`);
    }
    
    return screenshotPath;
  } catch (error) {
    console.error(`[Screenshot] Failed to generate screenshot for ${owner}/${repo}:`, error);
    throw error;
  } finally {
    // Kill the dev server process
    if (devProcess) {
      devProcess.kill('SIGTERM');
    }
    
    // Close browser
    if (browser) {
      await browser.close();
    }
    
    // Cleanup
    if (clonedRepoPath) {
      try {
        await fs.rm(clonedRepoPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`[Screenshot] Failed to cleanup ${clonedRepoPath}:`, cleanupError);
      }
    }
  }
}

/**
 * Update README.md to include the screenshot
 * @param repoPath Path to the repository
 */
async function updateReadmeWithScreenshot(repoPath: string): Promise<void> {
  const readmePath = path.join(repoPath, 'README.md');
  
  try {
    let content = '';
    
    // Check if README exists
    const readmeExists = await fileExists(readmePath);
    if (readmeExists) {
      content = await fs.readFile(readmePath, 'utf-8');
    }
    
    const screenshotMarkdown = '\n## Screenshot\n\n![Application Screenshot](./SCREENSHOT.png)\n';
    
    // Check if screenshot section already exists
    if (content.includes('## Screenshot')) {
      // Replace existing screenshot section
      const screenshotRegex = /## Screenshot\n\n!\[.*?\]\(\.\/SCREENSHOT\.png\)/;
      content = content.replace(screenshotRegex, screenshotMarkdown.trim());
    } else {
      // Add screenshot section after first heading or at the top
      const lines = content.split('\n');
      let insertIndex = 1;
      
      // Find first non-heading line after H1
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].startsWith('#')) {
          insertIndex = i;
          break;
        }
      }
      
      lines.splice(insertIndex, 0, screenshotMarkdown);
      content = lines.join('\n');
    }
    
    await fs.writeFile(readmePath, content, 'utf-8');
    console.log(`[Screenshot] Updated README.md with screenshot`);
  } catch (error) {
    console.error(`[Screenshot] Failed to update README.md:`, error);
    // Don't throw - screenshot generation is more important than README update
  }
}

/**
 * Wait for a server to be ready with better health checking
 * @param url URL to check
 * @param timeout Maximum time to wait in milliseconds
 * @param owner Repository owner (for logging)
 * @param repo Repository name (for logging)
 */
async function waitForServer(url: string, timeout: number, owner: string, repo: string): Promise<void> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second fetch timeout
      });
      
      // Accept any 2xx or 3xx status (page loaded or redirect)
      if (response.status >= 200 && response.status < 400) {
        console.log(`[Screenshot] Server is ready at ${url} (status: ${response.status})`);
        return;
      }
      
      // If we get 4xx/5xx, the server is running but there's an app error
      // This is still "ready" from a server perspective
      if (response.status >= 400) {
        console.log(`[Screenshot] Server responded with status ${response.status} at ${url}, continuing...`);
        return;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Server not ready yet, will retry
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.error(`[Screenshot] Server did not start at ${url} within ${elapsed}s for ${owner}/${repo}`);
  if (lastError) {
    console.error(`[Screenshot] Last error: ${lastError.message}`);
  }
  throw new Error(`Server did not start at ${url} within ${timeout}ms for ${owner}/${repo}`);
}

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns True if file exists, false otherwise
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
