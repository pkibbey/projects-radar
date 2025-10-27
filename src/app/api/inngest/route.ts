import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processSingleRepository,
  processBatchRepositories,
  refreshRepositoryIntelligence,
  syncRepositoriesFromGitHub,
  processRepositoryData,
  generateSingleShortDescription,
  generateBatchShortDescriptions,
} from "@/lib/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSingleRepository,
    processBatchRepositories,
    refreshRepositoryIntelligence,
    syncRepositoriesFromGitHub,
    processRepositoryData,
    generateSingleShortDescription,
    generateBatchShortDescriptions,
  ],
});
