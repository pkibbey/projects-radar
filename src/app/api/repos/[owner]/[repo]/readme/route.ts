import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getGitHubToken } from "@/lib/env";
import { getAIModel, getLmStudioUrl } from "@/lib/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { owner, repo } = await params;

    // Fetch repository details from GitHub
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();

    // Generate README content using LM Studio
    const readmeContent = await generateREADME(repoData);

    // Check if README already exists to get its SHA
    let sha: string | undefined;
    const existingResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      sha = existingData.sha;
    }

    // Create/update README.md file in the repository
    const commitBody: any = {
      message: "docs: auto-generate README",
      content: Buffer.from(readmeContent).toString("base64"),
    };

    if (sha) {
      commitBody.sha = sha;
    }

    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(commitBody),
      }
    );

    if (!commitResponse.ok) {
      const errorData = await commitResponse.json().catch(() => ({}));
      console.error("GitHub API error:", errorData);
      throw new Error(
        `Failed to create README: ${commitResponse.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "README.md has been generated and committed to your repository",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to generate README:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate README",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function generateREADME(repoData: any): Promise<string> {
  const model = getAIModel();
  const lmStudioUrl = getLmStudioUrl();

  const client = new OpenAI({
    apiKey: "lm-studio",
    baseURL: lmStudioUrl,
  });

  const {
    name,
    description,
    homepage,
    topics = [],
    language,
    html_url,
  } = repoData;

  try {
    const prompt = `You are an expert technical writer specializing in creating professional, engaging README files. Generate a comprehensive README.md for this GitHub repository.

Repository Details:
- Name: ${name}
- Description: ${description || "No description provided"}
- Language: ${language || "Not specified"}
- Homepage: ${homepage || "None"}
- Topics: ${topics.length > 0 ? topics.join(", ") : "None"}
- URL: ${html_url}

Generate a professional, well-structured README in Markdown format that:
1. Opens with a compelling project title and subtitle
2. Includes a clear "About" section explaining the project's purpose and value
3. Lists key features with emojis (at least 3-5 features)
4. Provides complete "Getting Started" instructions with prerequisites and installation steps
5. Includes a "Usage" section with code examples (create realistic examples based on the project type)
6. Has a "Contributing" section with clear guidelines
7. Includes proper license information
8. Ends with links to support/issues

Make the README:
- Professional yet approachable in tone
- Visually organized with proper Markdown formatting
- Practical with concrete examples
- Encouraging to potential contributors
- Include appropriate badges (build status, license, version placeholders where relevant)

Respond with ONLY the raw Markdown content, no code blocks or additional formatting.`;

    const response = await client.responses.create({
      model,
      input: prompt,
      max_output_tokens: 2000,
    });

    return response.output_text || generateTemplateREADME(repoData);
  } catch (error) {
    console.error("LM Studio README generation failed:", error);
    // Fallback to template-based README if LM Studio fails
    return generateTemplateREADME(repoData);
  }
}

function generateTemplateREADME(repoData: any): string {
  const {
    name,
    description,
    homepage,
    topics = [],
    language,
    clone_url,
    html_url,
    owner,
  } = repoData;

  const hasHomepage = homepage && homepage.trim().length > 0;
  const displayName = name
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const readme = `# ${displayName}

${description || `A GitHub repository for ${name}`}

${hasHomepage ? `🌐 [Visit Project](${homepage})` : ""}

## About

${description || `This project provides functionality for managing and analyzing repository data.`} Whether you're looking to track your repositories, analyze their performance, or generate documentation, this tool is designed to help.

## Features

${
  topics.length > 0
    ? `- 🎯 ${topics.join("\n- 🎯 ")}`
    : `- ✨ Repository management
- 🚀 Automated workflows
- 📊 Data analysis
- 🔧 Easy configuration
- 📝 Comprehensive documentation`
}
${language ? `- 🧠 Built with ${language}` : ""}

## Getting Started

### Prerequisites

- Git
- Node.js (v14 or higher) or your project's required runtime
- Your system's package manager (npm, yarn, pnpm, or bun)

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone ${clone_url}
   cd ${name}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Configure your environment:
   Create a \`.env.local\` file with any required environment variables.

4. Start the development server:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

## Usage

[Add usage examples and instructions here]

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on [GitHub Issues](${html_url}/issues).

---

**Repository:** [${owner.login}/${name}](${html_url})

Generated with ❤️
`;

  return readme;
}
