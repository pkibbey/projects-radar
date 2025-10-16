import {
  detectTechStack,
  detectSwiftTechStack,
  detectCppArduinoTechStack,
  detectHtmlTechStack,
  groupTechStackByCategory,
  type TechStackInfo,
} from "@/lib/tech-stack-detection";

const GITHUB_API = "https://api.github.com";

const decodeBase64 = (value: string) => Buffer.from(value, "base64").toString("utf-8");

export interface PackageJsonData {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Fetches package.json from a GitHub repository
 */
export async function fetchPackageJson(
  owner: string,
  repo: string,
  branch?: string,
  token?: string,
): Promise<PackageJsonData | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = new URL(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/package.json`,
    );
    
    if (branch) {
      url.searchParams.set("ref", branch);
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.type !== "file" || typeof data.content !== "string") {
      return null;
    }

    const content = decodeBase64(data.content);
    const packageJson = JSON.parse(content) as PackageJsonData;

    return packageJson;
  } catch (error) {
    console.error(`Failed to fetch package.json for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Extracts tech stack information from a package.json
 */
export function extractTechStack(packageJson: PackageJsonData): TechStackInfo {
  const { dependencies, devDependencies, peerDependencies } = packageJson;
  
  const techStack = detectTechStack(dependencies, devDependencies, peerDependencies);
  const grouped = groupTechStackByCategory(techStack);

  return grouped;
}

/**
 * Fetches and extracts tech stack from a GitHub repository's package.json
 */
export async function fetchAndExtractTechStack(
  owner: string,
  repo: string,
  branch?: string,
  token?: string,
): Promise<TechStackInfo | null> {
  const packageJson = await fetchPackageJson(owner, repo, branch, token);
  
  if (packageJson) {
    return extractTechStack(packageJson);
  }

  // If no package.json, try to detect from source files based on primary language
  return await fetchAndExtractTechStackFromSource(owner, repo, branch, token);
}

/**
 * Fetches the primary language of a repository
 */
async function getRepositoryPrimaryLanguage(
  owner: string,
  repo: string,
  token?: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { language?: string | null };
    return data.language || null;
  } catch (error) {
    console.error(`Failed to fetch repository language for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetches file content from GitHub repository
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch?: string,
  token?: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = new URL(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    );
    
    if (branch) {
      url.searchParams.set("ref", branch);
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.type !== "file" || typeof data.content !== "string") {
      return null;
    }

    return decodeBase64(data.content);
  } catch (error) {
    console.error(`Failed to fetch file ${filePath} from ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Lists files in a GitHub repository directory
 */
async function listRepositoryFiles(
  owner: string,
  repo: string,
  path: string = "",
  branch?: string,
  token?: string,
): Promise<Array<{ name: string; type: string; path: string }> | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = new URL(
      `${GITHUB_API}/repos/${owner}/${repo}/contents${path ? "/" + path : ""}`,
    );
    
    if (branch) {
      url.searchParams.set("ref", branch);
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return null;
    }

    return data.map((item: { name: string; type: string; path: string }) => ({
      name: item.name,
      type: item.type,
      path: item.path,
    }));
  } catch (error) {
    console.error(`Failed to list repository files for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Detects tech stack from source files (for non-Node.js projects)
 */
async function fetchAndExtractTechStackFromSource(
  owner: string,
  repo: string,
  branch?: string,
  token?: string,
): Promise<TechStackInfo | null> {
  try {
    const language = await getRepositoryPrimaryLanguage(owner, repo, token);
    
    if (!language) {
      return null;
    }

    let techStack = null;

    if (language.toLowerCase() === "swift") {
      // Fetch Swift files - search recursively
      console.log(`Detecting Swift tech stack for ${owner}/${repo}...`);
      
      // First check root
      const filesAtRoot = await listRepositoryFiles(owner, repo, "", branch, token);
      let swiftFiles = filesAtRoot ? filesAtRoot.filter(f => f.name.endsWith(".swift")) : [];
      
      // If no Swift files at root, search in subdirectories
      if (swiftFiles.length === 0 && filesAtRoot) {
        for (const file of filesAtRoot.slice(0, 10)) {
          if (file.type === "dir") {
            const subFiles = await listRepositoryFiles(owner, repo, file.path, branch, token);
            if (subFiles) {
              const foundFiles = subFiles.filter(f => f.name.endsWith(".swift"));
              if (foundFiles.length > 0) {
                swiftFiles = foundFiles;
                break;
              }
            }
          }
        }
      }
      
      if (swiftFiles.length > 0) {
        let sourceContent = "";
        for (const file of swiftFiles.slice(0, 5)) {
          const content = await fetchFileContent(owner, repo, file.path, branch, token);
          if (content) {
            sourceContent += "\n" + content;
          }
        }
        if (sourceContent) {
          const detected = detectSwiftTechStack(sourceContent);
          techStack = groupTechStackByCategory(detected);
        }
      }
    } else if (language.toLowerCase() === "c++" || language.toLowerCase() === "cpp") {
      // Fetch C++ files - search recursively
      console.log(`Detecting C++/Arduino tech stack for ${owner}/${repo}...`);
      
      // First check root
      const filesAtRoot = await listRepositoryFiles(owner, repo, "", branch, token);
      let sourceFiles = filesAtRoot ? filesAtRoot.filter(f => 
        f.name.endsWith(".cpp") || 
        f.name.endsWith(".ino") || 
        f.name.endsWith(".h") ||
        f.name.endsWith(".hpp")
      ) : [];
      
      // If no source files at root, search in subdirectories
      if (sourceFiles.length === 0 && filesAtRoot) {
        for (const file of filesAtRoot.slice(0, 10)) {
          if (file.type === "dir") {
            const subFiles = await listRepositoryFiles(owner, repo, file.path, branch, token);
            if (subFiles) {
              const foundFiles = subFiles.filter(f => 
                f.name.endsWith(".cpp") || 
                f.name.endsWith(".ino") || 
                f.name.endsWith(".h") ||
                f.name.endsWith(".hpp")
              );
              if (foundFiles.length > 0) {
                sourceFiles = foundFiles;
                break;
              }
            }
          }
        }
      }
      
      if (sourceFiles.length > 0) {
        let sourceContent = "";
        for (const file of sourceFiles.slice(0, 5)) {
          const content = await fetchFileContent(owner, repo, file.path, branch, token);
          if (content) {
            sourceContent += "\n" + content;
          }
        }
        if (sourceContent) {
          const detected = detectCppArduinoTechStack(sourceContent);
          techStack = groupTechStackByCategory(detected);
        }
      }
    } else if (language.toLowerCase() === "html" || language.toLowerCase() === "javascript") {
      // Fetch HTML or JS files - search recursively
      console.log(`Detecting HTML/JS tech stack for ${owner}/${repo}...`);
      
      // First check root
      const filesAtRoot = await listRepositoryFiles(owner, repo, "", branch, token);
      let sourceFiles = filesAtRoot ? filesAtRoot.filter(f => 
        f.name.endsWith(".html") || 
        f.name.endsWith(".js") || 
        f.name.endsWith(".jsx") ||
        f.name.endsWith(".ts") ||
        f.name.endsWith(".tsx")
      ) : [];
      
      // If no source files at root, search in subdirectories
      if (sourceFiles.length === 0 && filesAtRoot) {
        for (const file of filesAtRoot.slice(0, 10)) {
          if (file.type === "dir") {
            const subFiles = await listRepositoryFiles(owner, repo, file.path, branch, token);
            if (subFiles) {
              const foundFiles = subFiles.filter(f => 
                f.name.endsWith(".html") || 
                f.name.endsWith(".js") || 
                f.name.endsWith(".jsx") ||
                f.name.endsWith(".ts") ||
                f.name.endsWith(".tsx")
              );
              if (foundFiles.length > 0) {
                sourceFiles = foundFiles;
                break;
              }
            }
          }
        }
      }
      
      if (sourceFiles.length > 0) {
        let sourceContent = "";
        for (const file of sourceFiles.slice(0, 5)) {
          const content = await fetchFileContent(owner, repo, file.path, branch, token);
          if (content) {
            sourceContent += "\n" + content;
          }
        }
        if (sourceContent) {
          const detected = detectHtmlTechStack(sourceContent);
          techStack = groupTechStackByCategory(detected);
        }
      }
    }

    return techStack;
  } catch (error) {
    console.error(`Failed to fetch tech stack from source for ${owner}/${repo}:`, error);
    return null;
  }
}
