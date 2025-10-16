# Tech Stack Feature Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Dashboard]              [Generate Data]         [View Analytics]      │
│      ▼                          ▼                         ▼              │
│                                                                          │
│  Click "Generate"  →  POST /api/repos/[owner]/[repo]/data              │
│                           ▼                                              │
│                    ┌──────────────────────┐                             │
│                    │ Fetch Repository     │                             │
│                    │ Data from GitHub     │                             │
│                    └──────────┬───────────┘                             │
│                               ▼                                          │
│                    ┌──────────────────────┐                             │
│                    │ Fetch package.json   │                             │
│                    │ from GitHub          │                             │
│                    └──────────┬───────────┘                             │
│                               ▼                                          │
│                    ┌──────────────────────────────────┐                │
│                    │ src/lib/tech-stack-fetcher.ts   │                │
│                    │ - extractTechStack()             │                │
│                    └──────────┬───────────────────────┘                │
│                               ▼                                          │
│                    ┌──────────────────────────────────┐                │
│                    │ src/lib/tech-stack-detection.ts │                │
│                    │ - detectTechStack()              │                │
│                    │ - groupTechStackByCategory()     │                │
│                    │ - TECH_MAPPING (200+ packages)   │                │
│                    └──────────┬───────────────────────┘                │
│                               ▼                                          │
│                    ┌──────────────────────┐                             │
│                    │ TechStackInfo        │                             │
│                    │ {                    │                             │
│                    │   frontend: [...],   │                             │
│                    │   backend: [...],    │                             │
│                    │   database: [...],   │                             │
│                    │   ...                │                             │
│                    │ }                    │                             │
│                    └──────────┬───────────┘                             │
│                               ▼                                          │
│                    ┌──────────────────────┐                             │
│                    │ Store in Database    │                             │
│                    │ as part of           │                             │
│                    │ RepoAnalysis         │                             │
│                    └──────────┬───────────┘                             │
│                               ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ Display Options:                                            │       │
│  ├─────────────────────────────────────────────────────────────┤       │
│  │ 1. Repo Card (Expanded View)                              │       │
│  │    └─> src/components/tech-stack-display.tsx             │       │
│  │        └─> Shows tools grouped by category                │       │
│  │            with color-coded badges                        │       │
│  │                                                             │       │
│  │ 2. Analytics Dashboard (/analytics)                        │       │
│  │    └─> src/app/analytics/page.tsx                         │       │
│  │        └─> Fetches: GET /api/analytics/tech-stack        │       │
│  │        └─> Aggregates data from all repos                 │       │
│  │        └─> Shows trends and statistics                    │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Page / Route Layer                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┐      ┌──────────────────────┐      │
│  │ src/app/page.tsx     │      │ src/app/analytics/   │      │
│  │ (Main Dashboard)     │      │ page.tsx             │      │
│  │                      │      │ (Analytics Dashboard)│      │
│  │ [Generate Button]    │      │ [Statistics]         │      │
│  │ [Repo Cards]         │      │ [Filters & Sorting]  │      │
│  │ [Tech Trends Link]   │      │ [Tool Cards]         │      │
│  └──────────┬───────────┘      │ [Category Breakdown] │      │
│             │                  └──────────┬───────────┘      │
│             │                             │                  │
│             └─────────────────────────────┘                  │
│                      ▼                                        │
└────────────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────────┐  ┌────────────────────────┐
│ Component Layer      │  │ API Layer              │
├──────────────────────┤  ├────────────────────────┤
│                      │  │                        │
│ repo-card.tsx        │  │ /api/repos/.../data    │
│ ├─ RepoCard          │  │ (Generates data,       │
│ └─ TechStackDisplay  │  │  fetches tech stack)   │
│    ├─ Badge (UI)     │  │                        │
│    └─ Color Codes    │  │ /api/analytics/        │
│                      │  │ tech-stack             │
└────────────┬─────────┘  │ (Returns aggregated    │
             │            │  tech stats)           │
             └────────────┴────────────┬───────────┘
                                       ▼
        ┌──────────────────────────────────────────┐
        │ Logic Layer (Libraries)                  │
        ├──────────────────────────────────────────┤
        │                                          │
        │ tech-stack-detection.ts                 │
        │ ├─ TECH_MAPPING (200+ packages)        │
        │ ├─ detectTechStack()                    │
        │ ├─ groupTechStackByCategory()           │
        │ └─ UI helpers                           │
        │                                          │
        │ tech-stack-fetcher.ts                   │
        │ ├─ fetchPackageJson()                   │
        │ ├─ extractTechStack()                   │
        │ └─ fetchAndExtractTechStack()           │
        │                                          │
        └────────────────┬─────────────────────────┘
                         ▼
        ┌──────────────────────────────────────────┐
        │ Data Sources                             │
        ├──────────────────────────────────────────┤
        │                                          │
        │ GitHub API                              │
        │ └─ Fetches package.json files           │
        │                                          │
        │ SQLite Database                         │
        │ ├─ Stores RepoAnalysis                 │
        │ ├─ Includes TechStackInfo              │
        │ └─ Cached queries                       │
        │                                          │
        └──────────────────────────────────────────┘
```

## Category Detection Pipeline

```
package.json Dependencies
        ▼
┌──────────────────────────────────┐
│ Combine:                         │
│ - dependencies                   │
│ - devDependencies                │
│ - peerDependencies               │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ For each package name:           │
│ 1. Check exact match in MAPPING  │
│ 2. Check scoped (split @org/pkg) │
│ 3. Check partial match           │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ Found Match? Categorize as:      │
├──────────────────────────────────┤
│ - Frontend (React, Vue, etc.)    │
│ - Backend (Express, Django, etc.)│
│ - Database (PostgreSQL, etc.)    │
│ - DevOps (Docker, AWS, etc.)     │
│ - Testing (Jest, Cypress, etc.)  │
│ - Build (Webpack, Vite, etc.)    │
│ - Utility (Axios, Lodash, etc.)  │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ Deduplicate by tech name         │
│ (React + react-dom = "React")    │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ Return TechStackInfo grouped     │
│ by category                      │
└──────────────────────────────────┘
```

## Analytics Aggregation Pipeline

```
User clicks: GET /api/analytics/tech-stack
                    ▼
┌──────────────────────────────────┐
│ Fetch all RepoRecords from DB    │
│ with analysis.techStack != null  │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ For each category (frontend,     │
│ backend, etc.):                  │
│   For each tech in category:     │
│     - Count projects using it    │
│     - Build projects list        │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ Aggregate into TechUsageStats[]  │
│ {                                │
│   name: string                   │
│   category: TechCategory         │
│   count: number                  │
│   projects: string[]             │
│ }                                │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ Calculate statistics:            │
│ - Total tools                    │
│ - Total projects                 │
│ - Average tools per project      │
└────────────┬─────────────────────┘
             ▼
Return JSON response with stats
```

## Type Hierarchy

```
TechCategory
├─ 'frontend'
├─ 'backend'
├─ 'database'
├─ 'devops'
├─ 'testing'
├─ 'build'
└─ 'utility'

TechStack
├─ name: string           (e.g., "React")
├─ category: TechCategory (e.g., "frontend")
└─ type?: string          (e.g., "framework")

TechStackInfo
├─ frontend: TechStack[]
├─ backend: TechStack[]
├─ database: TechStack[]
├─ devops: TechStack[]
├─ testing: TechStack[]
├─ build: TechStack[]
└─ utility: TechStack[]

RepoAnalysis (extended)
├─ summary: string
├─ insights: RepoInsight[]
├─ actions: RepoAction[]
├─ packages?: string[]
├─ techStack?: TechStackInfo  ← NEW
└─ analysisDurationMs?: number

RepoRecord
├─ key: string
├─ bundle: RepositoryBundle
├─ analysis: RepoAnalysis (includes techStack)
├─ updatedAt: string
└─ id?: number
```

## Color Coding Scheme

```
┌─────────────────────────────────────────┐
│ UI Color Scheme by Category             │
├─────────────────────────────────────────┤
│ Frontend    → Blue  (bg-blue-100)       │
│ Backend     → Purple (bg-purple-100)    │
│ Database    → Green (bg-green-100)      │
│ DevOps      → Yellow (bg-yellow-100)    │
│ Testing     → Red (bg-red-100)          │
│ Build       → Gray (bg-gray-100)        │
│ Utility     → Slate (bg-slate-100)      │
└─────────────────────────────────────────┘
```

## State Management

### No Global State Required
- Tech stack detection is deterministic (same package.json → same results)
- Data flows through React props
- Analytics fetches fresh data on page load
- No client-side caching needed (GitHub API handles it)

### Data Persistence
- Stored automatically as part of RepoAnalysis in SQLite
- Persisted when repo data is generated
- Retrieved when displaying repo card
- Aggregated for analytics

## Performance Characteristics

```
Operation              Time Complexity    Typical Duration
─────────────────────────────────────────────────────────
Detect tech stack      O(n)              50-100ms
Package.json fetch     O(1)              200-500ms (cached)
Group by category      O(n)              <1ms
Analytics aggregation  O(r*c)            100-500ms (r=repos, c=avg categories)
Dashboard render       O(r)              100-300ms (r=repos)
Analytics render       O(t)              50-150ms (t=total techs)
```

## Future Extension Points

1. **Custom Categories**: Allow users to define custom tech groups
2. **Time Series**: Track tech changes over time
3. **Recommendations**: ML-based tech suggestions
4. **Integration Scoring**: Rate how well tools work together
5. **Version Tracking**: Monitor package version trends
6. **Audit Logging**: Track who viewed/analyzed what
