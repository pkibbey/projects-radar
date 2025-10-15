import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RepoAnalysis } from './ai';

const execAsync = promisify(exec);

/**
 * Extract package information from package.json in the cloned repository
 * @param repoPath Local path to the cloned repository
 * @returns Array of package names from dependencies
 */
async function extractPackagesFromRepo(repoPath: string): Promise<string[]> {
  try {
    const packageJsonPath = join(repoPath, 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    const packages = new Set<string>();
    
    // Extract from dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(pkg => packages.add(pkg));
    }
    
    // Extract from devDependencies
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach(pkg => packages.add(pkg));
    }
    
    return Array.from(packages);
  } catch (error) {
    console.warn('[Package Extract] Could not read package.json:', error);
    return [];
  }
}

/**
 * Analyze a repository using GitHub Copilot CLI with full repository context
 * @param repoPath Local path to the cloned repository
 * @param owner Repository owner
 * @param repo Repository name
 * @returns AI-generated analysis with summary, insights, and actions
 */
export async function analyzeCopilotWithContext(
  repoPath: string,
  owner: string,
  repo: string
): Promise<RepoAnalysis> {
  // First, extract packages from package.json
  const extractedPackages = await extractPackagesFromRepo(repoPath);
  console.log(`[Copilot] Found ${extractedPackages.length} packages in package.json`);
  
  const prompt = `Analyze this repository (${owner}/${repo}) and provide a comprehensive analysis.

Based on the code structure, files, dependencies, and overall architecture:

1. Provide a concise summary (2-3 sentences) of what this project does and its main purpose
2. List 3-5 key technical insights about the codebase (architecture patterns, frameworks used, code organization, notable features)
3. List the main foundational packages/technologies (e.g., "Next.js", "React", "Tailwind CSS", "TypeScript", "Express", "PostgreSQL")
4. Recommend 3-5 specific actionable improvements or next steps

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "summary": "A clear 2-3 sentence description of the project",
  "insights": [
    {"title": "Insight title 1", "description": "Detailed insight description 1"},
    {"title": "Insight title 2", "description": "Detailed insight description 2"},
    {"title": "Insight title 3", "description": "Detailed insight description 3"}
  ],
  "packages": ["Package 1", "Package 2", "Package 3"],
  "actions": [
    {"title": "Action title 1", "instruction": "Specific instruction 1"},
    {"title": "Action title 2", "instruction": "Specific instruction 2"},
    {"title": "Action title 3", "instruction": "Specific instruction 3"}
  ]
}`;

  try {
    console.log(`[Copilot] Starting analysis for ${owner}/${repo}...`);
    
    // Use gh copilot CLI to analyze the repository
    // The CLI will have access to the full repository context
    // Note: We're using a simpler, more direct approach
    const command = `echo "${prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}" | gh copilot suggest -t shell`;
    
    console.log(`[Copilot] Executing command in ${repoPath}`);
    
    const { stdout, stderr } = await execAsync(command, { 
      cwd: repoPath,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 60000, // 60 second timeout
      env: {
        ...process.env,
        // Ensure non-interactive mode
        GH_PROMPT: '1'
      }
    });
    
    console.log(`[Copilot] Received response (${stdout.length} chars)`);
    
    if (stderr) {
      console.warn('[Copilot] CLI warning:', stderr);
    }
    
    // Extract JSON from the response
    // Copilot CLI may wrap the response with additional text
    console.log('[Copilot] Parsing response...');
    const jsonMatch = stdout.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      console.log('[Copilot] Found JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      const analysis: RepoAnalysis = {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Unable to generate summary',
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 
          ? parsed.packages 
          : extractedPackages.length > 0 
            ? extractedPackages 
            : undefined
      };
      
      // Ensure we have at least some content
      if (!analysis.summary && analysis.insights.length === 0 && analysis.actions.length === 0) {
        throw new Error('Copilot returned empty analysis');
      }
      
      console.log(`[Copilot] Success! Generated ${analysis.insights.length} insights and ${analysis.actions.length} actions`);
      return analysis;
    }
    
    // If no JSON found, try to parse the entire output
    console.warn('[Copilot] No JSON found in response, attempting to parse full output');
    throw new Error(`Could not extract JSON from Copilot response. Output: ${stdout.substring(0, 500)}`);
  } catch (error) {
    console.error('[Copilot] Analysis error:', error);
    
    // Check for timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('[Copilot] Analysis timed out after 60 seconds');
      return {
        summary: `Repository ${owner}/${repo} - Analysis timed out`,
        insights: [
          { title: 'Analysis timeout', description: 'The repository analysis took longer than 60 seconds' },
          { title: 'Try again', description: 'Repository might be too large or Copilot service is slow' }
        ],
        actions: [
          { title: 'Retry later', instruction: 'Try analyzing this repository again in a few minutes' },
          { title: 'Use LM Studio', instruction: 'Consider using LM Studio as an alternative AI provider' }
        ],
        packages: extractedPackages.length > 0 ? extractedPackages : []
      };
    }
    
    // Return a fallback analysis
    return {
      summary: `Repository ${owner}/${repo} - Analysis unavailable via Copilot CLI`,
      insights: [
        { title: 'Copilot CLI analysis failed', description: 'Check logs for details' },
        { title: 'Extension check', description: 'Verify gh copilot extension is installed' }
      ],
      actions: [
        { title: 'Verify installation', instruction: 'Run: gh extension list | grep copilot' },
        { title: 'Enable Copilot', instruction: 'Ensure GitHub Copilot access is enabled for your account' }
      ],
      packages: extractedPackages.length > 0 ? extractedPackages : []
    };
  }
}

/**
 * Alternative: Generate analysis using a much simpler approach
 * Just asks Copilot basic questions and parses free-form responses
 */
export async function generateQuickCopilotAnalysis(
  repoPath: string,
  owner: string,
  repo: string
): Promise<RepoAnalysis> {
  try {
    console.log(`[Copilot Quick] Analyzing ${owner}/${repo}...`);
    
    // First, extract packages from package.json
    const packages = await extractPackagesFromRepo(repoPath);
    console.log(`[Copilot Quick] Found ${packages.length} packages in package.json`);
    
    // Much simpler - just ask what the repo does
    const { stdout } = await execAsync(
      `gh copilot explain "Briefly describe what this codebase does and what tech stack it uses"`,
      { 
        cwd: repoPath,
        maxBuffer: 1024 * 1024 * 5,
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log(`[Copilot Quick] Got response: ${stdout.substring(0, 200)}...`);
    
    // Parse free-form text into structured format
    const text = stdout.trim();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    return {
      summary: sentences.slice(0, 3).join('. ').trim() + '.',
      insights: sentences.slice(3, 6).map((line, idx) => ({
        title: `Observation ${idx + 1}`,
        description: line.trim()
      })),
      actions: [
        { title: 'Review codebase', instruction: 'Examine the repository structure and dependencies' },
        { title: 'Check documentation', instruction: 'Ensure README and docs are up to date' },
        { title: 'Run tests', instruction: 'Verify all tests pass successfully' }
      ],
      packages // Include the extracted packages
    };
  } catch (error) {
    console.error('[Copilot Quick] Analysis error:', error);
    throw error;
  }
}
