# Tech Stack Detection & Analytics Feature

## Overview

This feature enables users to extract, visualize, and analyze technology stack information from project repositories. It automatically detects frontend frameworks, backend tools, databases, DevOps solutions, testing frameworks, build tools, and utilities from each project's `package.json` file.

## Key Features

### 1. **Automated Tech Stack Detection**
- Extracts dependencies from `package.json` (including devDependencies and peerDependencies)
- Categorizes tools into 7 distinct categories:
  - **Frontend**: Frameworks (React, Vue, Next.js), UI libraries, component libraries, state management, animations, forms
  - **Backend**: Frameworks (Express, NestJS), APIs, GraphQL, ORMs, authentication
  - **Database**: PostgreSQL, MongoDB, SQLite, Redis, Firestore, etc.
  - **DevOps**: Docker, Kubernetes, AWS, Vercel, Netlify, Terraform
  - **Testing**: Jest, Cypress, Playwright, Testing Library, Mocha, Vitest
  - **Build**: Webpack, Vite, Rollup, TypeScript, ESLint, Prettier
  - **Utility**: Axios, Lodash, date-fns, and helper libraries

### 2. **Real-time Tech Stack Display on Repo Cards**
- Shows detected technology stack on expanded view of each repository
- Grouped by category with collapsible sections
- Color-coded badges for easy visual identification
- Truncation with "+X more" indication for categories with many tools
- Tool tooltips showing tool type information

### 3. **Comprehensive Analytics Dashboard**
- Navigate to `/analytics` page to view tech trends across all projects
- **Statistics Overview**: Total tools, total projects, average tools per project
- **Filtering & Sorting**: 
  - Filter by technology category
  - Sort by usage frequency or alphabetically
- **Tool Details**:
  - Usage count per tool
  - Percentage of projects using each tool
  - Visual progress bar
  - List of projects using each tool
- **Category Breakdown**: Summary statistics and top 3 tools per category

## Implementation Details

### New Files Created

#### 1. `src/lib/tech-stack-detection.ts`
Core logic for tech stack categorization with:
- `TECH_MAPPING`: Comprehensive mapping of 200+ npm packages to categories
- `detectTechStack()`: Extracts and categorizes technologies from dependencies
- `groupTechStackByCategory()`: Groups technologies by category
- `getCategoryLabel()` & `getCategoryColor()`: UI helper functions

**Exports**:
- `TechCategory` type
- `TechStack` type
- `TechStackInfo` type
- Detection and grouping functions

#### 2. `src/lib/tech-stack-fetcher.ts`
GitHub integration for fetching package.json:
- `fetchPackageJson()`: Retrieves package.json from GitHub repos
- `extractTechStack()`: Parses and categorizes from a package.json object
- `fetchAndExtractTechStack()`: Complete pipeline function

**Uses**: GitHub API with optional token support for increased rate limits

#### 3. `src/components/tech-stack-display.tsx`
React component for displaying categorized tech stack:
- Shows all 7 categories (with optional empty category filtering)
- Configurable item limits per category
- Color-coded badges by category
- Responsive badge wrapping
- "More items" indicator

**Props**:
```typescript
type TechStackDisplayProps = {
  techStack: TechStackInfo;
  showEmptyCategories?: boolean;
};
```

#### 4. `src/app/analytics/page.tsx`
Full-featured analytics dashboard with:
- Statistics cards (total tools, projects, averages)
- Category and sorting filters
- Tool usage cards with:
  - Usage count and percentage
  - Progress bars
  - Project list
  - "More" indicators
- Category breakdown section with top tools per category

#### 5. `src/app/api/analytics/tech-stack/route.ts`
API endpoint for analytics data:
- Aggregates tech stack from all stored repositories
- Calculates usage statistics
- Returns categorized tech usage data
- Endpoint: `GET /api/analytics/tech-stack`

### Modified Files

#### 1. `src/lib/ai.ts`
- Added `TechStackInfo` import from tech-stack-detection
- Extended `RepoAnalysis` type to include optional `techStack?: TechStackInfo` field

#### 2. `src/app/api/repos/[owner]/[repo]/data/route.ts`
- Added import for `fetchAndExtractTechStack`
- Integrated tech stack extraction into POST endpoint
- Automatically populates `analysis.techStack` when generating data

#### 3. `src/components/repo-card.tsx`
- Added import for `TechStackDisplay` component
- Added tech stack display section in expanded/compact views
- Shows detected tools grouped by category
- Respects view mode for truncation
- Positioned alongside AI Summary and insights

#### 4. `src/app/page.tsx`
- Added "📊 Tech Trends" button linking to `/analytics` page
- Button styled to match dashboard UI with indigo accent color

## Database Impact

The existing database schema in `src/lib/db.ts` already stores the complete `RepoAnalysis` object which now includes `techStack`. No schema changes were needed as the analysis is stored as JSON.

**Data Flow**:
1. Repository data generation → fetches package.json
2. Tech stack extracted and categorized
3. Stored in `analysis.techStack` as part of RepoRecord
4. Retrieved and displayed on repo cards
5. Aggregated for analytics dashboard

## Technology Stack Coverage

### Comprehensive Package Support (200+ packages)
The TECH_MAPPING includes detection for:
- **Frontend Frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt, Gatsby, Remix, Astro, Solid.js, Qwik
- **Backend**: Express, Fastify, NestJS, Koa, Hapi, Django, Flask, Rails, Laravel
- **Styling**: Tailwind CSS, Styled Components, Sass, Less, PostCSS
- **State Management**: Redux, MobX, Zustand, Jotai, React Query, Pinia, Vuex
- **UI Libraries**: Material-UI, Chakra UI, shadcn/ui, Radix UI, Bootstrap, daisyUI
- **Database**: PostgreSQL, MongoDB, SQLite, MySQL, Redis, Firestore, DynamoDB
- **Testing**: Jest, Vitest, Cypress, Playwright, React Testing Library, Mocha
- **Build Tools**: Webpack, Vite, Rollup, TypeScript, Turbopack, esbuild
- **Cloud & DevOps**: AWS, Vercel, Netlify, Docker, Kubernetes, Terraform
- **And many more...**

## Usage

### For End Users

1. **View on Dashboard**:
   - Generate/refresh data for a repository
   - Expand repo card to view "Technology Stack" section
   - See tools grouped by category with color-coded badges

2. **Analytics Dashboard**:
   - Click "📊 Tech Trends" button on main page
   - Filter by technology category
   - Sort by usage or alphabetically
   - View project-level adoption of each tool
   - See category summaries and trends

### For Developers

1. **Extend Tech Detection**:
   ```typescript
   import { detectTechStack, groupTechStackByCategory } from "@/lib/tech-stack-detection";
   
   const techStack = detectTechStack(deps, devDeps, peerDeps);
   const grouped = groupTechStackByCategory(techStack);
   ```

2. **Fetch from Repository**:
   ```typescript
   import { fetchAndExtractTechStack } from "@/lib/tech-stack-fetcher";
   
   const techStack = await fetchAndExtractTechStack(owner, repo, branch, token);
   ```

3. **Display in UI**:
   ```typescript
   import { TechStackDisplay } from "@/components/tech-stack-display";
   
   <TechStackDisplay techStack={analysis.techStack} />
   ```

## Performance Considerations

- **Tech detection** is O(n) where n = number of dependencies (typically 20-200)
- **Package.json fetching** is cached with 5-minute revalidation by GitHub API
- **Analytics aggregation** iterates through all stored records once
- **UI rendering** uses lazy badges and efficient list rendering

## Future Enhancements

1. **Trend Analysis**: Track tech changes over time (time-series data)
2. **Compatibility Matrix**: Show which tools work well together
3. **Framework Recommendations**: Suggest alternatives based on project goals
4. **Dependency Audits**: Flag outdated or vulnerable packages
5. **Export Analytics**: Generate reports in PDF/CSV format
6. **Custom Categorization**: Allow users to customize tech categories
7. **AI Insights**: Generate recommendations based on tech stack
8. **Integration Status**: Show which tools are actually active vs just installed

## Error Handling

- Missing package.json: Gracefully returns null, no tech stack shown
- GitHub API rate limits: Handled by existing token system
- Parse errors: Logged to console, doesn't break repo card display
- Analytics fetch failure: Shows user-friendly error message

## Testing Recommendations

1. Test with various package.json structures
2. Verify color coding on different screen sizes
3. Test analytics with 0, 1, and 100+ repositories
4. Verify filter and sort functionality
5. Test with packages not in TECH_MAPPING (should not appear)
6. Performance test with large datasets

## Notes

- Tech detection is automatic when generating repo data
- No user action required to see tech stacks
- Analytics dashboard is read-only (informational)
- All categorizations are hardcoded (can be made configurable in future)
