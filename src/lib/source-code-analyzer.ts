/**
 * Source Code Analyzer
 * 
 * Analyzes repository source code to extract:
 * - Project structure and organization
 * - Architecture patterns and best practices
 * - Key technologies and frameworks in use
 * - Main entry points and core functionality
 * - Code quality indicators
 * 
 * This module focuses on actual source code analysis rather than
 * relying on often-missing or outdated documentation.
 */

type SourceCodeSummary = {
  mainLanguages: string[];
  projectStructure: string;
  keyFiles: string[];
  architecturePatterns: string[];
  codeQualityIndicators: string[];
};

/**
 * Analyzes a collection of source code files to extract structural insights
 */
export function analyzeSourceCodeStructure(files: Map<string, string>): SourceCodeSummary {
  const mainLanguages = detectMainLanguages(files);
  const projectStructure = inferProjectStructure(files);
  const keyFiles = identifyKeyFiles(files);
  const architecturePatterns = detectArchitecturePatterns(files);
  const codeQualityIndicators = detectCodeQualityIndicators(files);

  return {
    mainLanguages,
    projectStructure,
    keyFiles,
    architecturePatterns,
    codeQualityIndicators,
  };
}

/**
 * Detects the primary programming languages used in the project
 */
function detectMainLanguages(files: Map<string, string>): string[] {
  const languageCount = new Map<string, number>();

  for (const path of files.keys()) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    
    // Map file extensions to language names
    const languageMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript/React',
      'js': 'JavaScript',
      'jsx': 'JavaScript/React',
      'py': 'Python',
      'java': 'Java',
      'rs': 'Rust',
      'go': 'Go',
      'rb': 'Ruby',
      'php': 'PHP',
      'cs': 'C#',
      'cpp': 'C++',
      'c': 'C',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'clj': 'Clojure',
      'exs': 'Elixir',
      'ex': 'Elixir',
      'erl': 'Erlang',
      'pl': 'Perl',
      'r': 'R',
      'lua': 'Lua',
      'vim': 'VimScript',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'LESS',
      'yaml': 'YAML',
      'yml': 'YAML',
      'json': 'JSON',
      'toml': 'TOML',
      'sh': 'Shell',
      'bash': 'Bash',
    };

    const language = languageMap[ext];
    if (language) {
      languageCount.set(language, (languageCount.get(language) || 0) + 1);
    }
  }

  // Sort by frequency and return top 5
  return Array.from(languageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);
}

/**
 * Infers project structure from directory organization and key files
 */
function inferProjectStructure(files: Map<string, string>): string {
  const paths = Array.from(files.keys());
  
  // Check for common project patterns
  const hasMonorepo = paths.some(p => p.includes('packages/') || p.includes('apps/'));
  const hasTests = paths.some(p => p.includes('__tests__') || p.includes('test/') || p.includes('spec/') || p.includes('.test.') || p.includes('.spec.'));
  const hasSrc = paths.some(p => p.startsWith('src/'));
  const hasLib = paths.some(p => p.startsWith('lib/'));
  const hasUtils = paths.some(p => p.includes('utils/') || p.includes('helpers/'));
  const hasComponents = paths.some(p => p.includes('components/'));
  const hasPages = paths.some(p => p.includes('pages/') || p.includes('app/'));
  const hasConfig = paths.some(p => p.includes('config/') && (p.endsWith('.ts') || p.endsWith('.js') || p.endsWith('.json')));

  const structures: string[] = [];
  
  if (hasMonorepo) structures.push('Monorepo');
  if (hasSrc) structures.push('Source directory (src/)');
  if (hasLib) structures.push('Library structure (lib/)');
  if (hasComponents) structures.push('Component-based (components/)');
  if (hasPages) structures.push('Page-based (pages/)');
  if (hasTests) structures.push('Test files included');
  if (hasConfig) structures.push('Configuration files');
  if (hasUtils) structures.push('Utility functions');

  return structures.length > 0 ? structures.join(', ') : 'Standard project structure';
}

/**
 * Identifies important/key files in the project
 */
function identifyKeyFiles(files: Map<string, string>): string[] {
  const keyFiles: string[] = [];
  const keyPatterns = [
    /^(src\/)?index\.(ts|js|tsx|jsx)$/,
    /^(src\/)?app\.(ts|js|tsx|jsx)$/,
    /^(src\/)?main\.(ts|js|tsx|jsx)$/,
    /^(src\/)?index\.html$/,
    /^(lib\/)?main\.(rs|go|py)$/,
    /^src\/(app|pages|routes)\/.*\.(ts|tsx|js|jsx)$/,
    /Dockerfile/,
    /docker-compose/,
    /webpack\.config/,
    /vite\.config/,
    /next\.config/,
    /tsconfig/,
    /babel\.config/,
  ];

  for (const path of files.keys()) {
    for (const pattern of keyPatterns) {
      if (pattern.test(path)) {
        // Clean up path for display
        const displayName = path.split('/').slice(-2).join('/');
        if (!keyFiles.includes(displayName)) {
          keyFiles.push(displayName);
        }
        break;
      }
    }
  }

  return keyFiles.slice(0, 10); // Return top 10
}

/**
 * Detects common architecture patterns from code structure and content
 */
function detectArchitecturePatterns(files: Map<string, string>): string[] {
  const patterns: Set<string> = new Set();

  for (const [path, content] of files.entries()) {
    // Check for MVC/MVVM patterns
    if (path.includes('controller') || path.includes('controllers/')) {
      patterns.add('MVC Pattern');
    }
    if (path.includes('viewModel') || path.includes('view-model')) {
      patterns.add('MVVM Pattern');
    }

    // Check for service/repository patterns
    if (path.includes('service') || path.includes('services/')) {
      patterns.add('Service Layer');
    }
    if (path.includes('repository') || path.includes('repositories/')) {
      patterns.add('Repository Pattern');
    }

    // Check for middleware patterns
    if (path.includes('middleware') || content.includes('middleware') || content.includes('express.middleware')) {
      patterns.add('Middleware Pattern');
    }

    // Check for API/REST patterns
    if (path.includes('/api/') || path.includes('routes/') || content.includes('@app.route') || content.includes('@router.')) {
      patterns.add('API/REST Structure');
    }

    // Check for GraphQL
    if (content.includes('graphql') || content.includes('apollo') || path.includes('schema.graphql')) {
      patterns.add('GraphQL');
    }

    // Check for hooks/utilities pattern (React)
    if (path.includes('hooks/') || (path.includes('.tsx') && content.includes('useEffect'))) {
      patterns.add('React Hooks');
    }

    // Check for HOC pattern (React)
    if (content.includes('withRouter') || content.includes('withConnect') || content.includes('hoc/')) {
      patterns.add('Higher-Order Components');
    }

    // Check for dependency injection
    if (content.includes('@Injectable') || content.includes('@Inject') || content.includes('container.get')) {
      patterns.add('Dependency Injection');
    }

    // Check for OOP/Class-based patterns
    if (content.includes('class ') && ['.ts', '.java', '.cs', '.cpp'].some(ext => path.endsWith(ext))) {
      patterns.add('Class-Based OOP');
    }

    // Check for functional patterns
    if ((path.endsWith('.ts') || path.endsWith('.js')) && content.includes('const ') && content.includes('=>')) {
      patterns.add('Functional Programming');
    }

    // Check for testing infrastructure
    if (path.includes('__tests__') || path.includes('test/') || path.includes('.test.') || path.includes('.spec.')) {
      patterns.add('Test-Driven Development');
    }
  }

  return Array.from(patterns).slice(0, 8);
}

/**
 * Detects code quality indicators from code patterns
 */
function detectCodeQualityIndicators(files: Map<string, string>): string[] {
  const indicators: Set<string> = new Set();
  let fileCount = 0;
  let filesWithTypes = 0;
  let filesWithTests = 0;
  let filesWithComments = 0;

  for (const [path, content] of files.entries()) {
    fileCount++;

    // Check for TypeScript
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      filesWithTypes++;
    }

    // Check for test files
    if (path.includes('test') || path.includes('spec')) {
      filesWithTests++;
    }

    // Check for comments/documentation
    if (content.includes('//') || content.includes('/*') || content.includes('/**')) {
      filesWithComments++;
    }
  }

  // Calculate percentages
  const typeScriptPercent = fileCount > 0 ? Math.round((filesWithTypes / fileCount) * 100) : 0;
  const testCoverage = fileCount > 0 ? Math.round((filesWithTests / fileCount) * 100) : 0;
  const documentationPercent = fileCount > 0 ? Math.round((filesWithComments / fileCount) * 100) : 0;

  if (typeScriptPercent > 70) {
    indicators.add('Strong TypeScript adoption');
  } else if (typeScriptPercent > 0) {
    indicators.add('Partial TypeScript usage');
  }

  if (testCoverage > 20) {
    indicators.add('Good test coverage structure');
  } else if (testCoverage > 0) {
    indicators.add('Basic test infrastructure');
  }

  if (documentationPercent > 50) {
    indicators.add('Well-documented code');
  } else if (documentationPercent > 20) {
    indicators.add('Moderate code documentation');
  }

  if (fileCount > 50) {
    indicators.add('Substantial codebase');
  } else if (fileCount > 20) {
    indicators.add('Moderate project size');
  } else {
    indicators.add('Minimal codebase');
  }

  return Array.from(indicators);
}

/**
 * Creates a formatted context string from source code summary for AI analysis
 */
export function formatSourceCodeContext(summary: SourceCodeSummary, projectName: string): string {
  return `
Project: ${projectName}

## Source Code Analysis

### Main Languages
${summary.mainLanguages.map(l => `- ${l}`).join('\n')}

### Project Structure
${summary.projectStructure}

### Key Files
${summary.keyFiles.map(f => `- ${f}`).join('\n')}

### Architecture Patterns
${summary.architecturePatterns.map(p => `- ${p}`).join('\n')}

### Code Quality Indicators
${summary.codeQualityIndicators.map(i => `- ${i}`).join('\n')}
`.trim();
}
