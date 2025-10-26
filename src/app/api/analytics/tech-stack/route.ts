import db from "@/lib/db";
import type { TechCategory } from "@/lib/tech-stack-detection";

type TechUsageStats = {
  name: string;
  category: TechCategory;
  count: number;
  projects: string[];
};

export async function GET() {
  try {
    const allRepos = await db.listRepoData();
    
    // Build tech usage stats
    const techMap = new Map<string, { category: TechCategory; projects: Set<string> }>();

    for (const repo of allRepos) {
      if (!repo.analysis?.techStack) {
        continue;
      }

      const repoKey = repo.key;
      const techStack = repo.analysis.techStack;

      // Iterate through all categories
      const categories: TechCategory[] = [
        "frontend",
        "backend",
        "testing",
      ];

      for (const category of categories) {
        const techs = techStack[category] || [];
        
        for (const tech of techs) {
          const key = `${tech.name}`;
          
          if (!techMap.has(key)) {
            techMap.set(key, {
              category: tech.category,
              projects: new Set<string>(),
            });
          }
          
          const entry = techMap.get(key)!;
          entry.projects.add(repoKey);
        }
      }
    }

    // Convert to array and sort by count
    const stats: TechUsageStats[] = Array.from(techMap.entries())
      .map(([name, data]) => ({
        name,
        category: data.category,
        count: data.projects.size,
        projects: Array.from(data.projects).sort(),
      }))
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({
        ok: true,
        stats,
        total: stats.length,
        projectsAnalyzed: allRepos.filter(r => r.analysis?.techStack).length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
