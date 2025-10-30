/**
 * Type definitions for Project Learning Insights
 * 
 * This file defines the shape of learning data that can be captured
 * for each project to transform "incomplete" projects into learning assets.
 */

/**
 * Status reason for why a project is on hold or complete
 */
export type StatusReason = 
  | "learning-complete"    // Learning goals were achieved
  | "deprioritized"        // Other projects took priority
  | "overcomplicated"      // Scope became too large
  | "shifted-focus"        // Requirements/priorities changed
  | "on-hold";             // Waiting for resources

/**
 * Complete learning insight data for a project
 * Stored in the database with timestamps and unique key
 */
export interface ProjectLearning {
  // Database fields
  id?: number;
  key: string;                                    // Unique key: owner/repo
  createdAt: string;                             // ISO timestamp
  updatedAt: string;                             // ISO timestamp

  // Learning content
  problem: string | null;                        // What problem were you solving?
  architecture: string | null;                   // How did you design it?
  keyLearnings: string[];                        // Specific insights gained
  lessonsForImprovement: string[];               // What would you do differently?
  skillsUsed: string[];                          // Technologies and skills demonstrated
  timeInvested: string | null;                   // How long did you work on it?
  statusReason: StatusReason | null;             // Why is this project paused/complete?
}

/**
 * Form input type (without database metadata)
 * Used when creating or updating learning data
 */
export type ProjectLearningInput = Omit<ProjectLearning, 'id' | 'key' | 'createdAt' | 'updatedAt'>;

/**
 * API Response types
 */
export type GetLearningResponse = ProjectLearning | { error: string };
export type CreateLearningResponse = ProjectLearning | { error: string };
export type DeleteLearningResponse = { success: boolean } | { error: string };

/**
 * Example learning entry for documentation
 */
export const EXAMPLE_LEARNING: ProjectLearning = {
  id: 1,
  key: "octocat/Hello-World",
  problem: "Build a real-time analytics dashboard for e-commerce businesses",
  architecture: "React frontend + Node.js backend + PostgreSQL + Redis caching. Deployed on Heroku with GitHub Actions CI/CD.",
  keyLearnings: [
    "Database indexing is critical for query performance at scale",
    "Real-time sync has trade-offs between consistency and latency",
    "Frontend performance matters more than complex features",
    "Comprehensive error handling prevents production surprises",
  ],
  lessonsForImprovement: [
    "Would prioritize test coverage from the start",
    "Would implement monitoring/logging earlier",
    "Would invest more in API design upfront",
    "Would use TypeScript to catch type errors early",
  ],
  skillsUsed: [
    "React",
    "Node.js",
    "TypeScript",
    "PostgreSQL",
    "Redis",
    "Express.js",
    "Docker",
  ],
  timeInvested: "8 weeks",
  statusReason: "deprioritized",
  createdAt: "2025-10-29T10:00:00Z",
  updatedAt: "2025-10-29T10:00:00Z",
};
