export type ProjectConfigEntry = {
  owner: string;
  repo: string;
  branch?: string;
  displayName?: string;
  fetchDocuments?: boolean; // Optional: whether to fetch markdown files from the repo
};

export const projectConfig: ProjectConfigEntry[] = [
  {
    owner: "pkibbey",
    repo: "Ableton-Tracklist-Exporter",
    displayName: "Ableton Tracklist Exporter",
  },
  {
    owner: "pkibbey",
    repo: "ambient-light-api-demo",
    displayName: "Ambient Light API Demo",
  },
  {
    owner: "pkibbey",
    repo: "aqua-track",
    displayName: "Aqua Track",
  },
  {
    owner: "pkibbey",
    repo: "arduino-twitter",
    displayName: "Arduino Twitter",
  },
  {
    owner: "pkibbey",
    repo: "best-practices",
    displayName: "Best Practices",
  },
  {
    owner: "pkibbey",
    repo: "cereal-science",
    displayName: "Cereal Science",
  },
  {
    owner: "pkibbey",
    repo: "cerealscience",
    displayName: "Cerealscience",
  },
  {
    owner: "pkibbey",
    repo: "cinematic-journey",
    displayName: "Cinematic Journey",
  },
  {
    owner: "pkibbey",
    repo: "controlled-art",
    displayName: "Controlled Art",
  },
  {
    owner: "pkibbey",
    repo: "document-analyzer",
    displayName: "Document Analyzer",
  },
  {
    owner: "pkibbey",
    repo: "feelings-wheel-cinema",
    displayName: "Feelings Wheel Cinema",
  },
  {
    owner: "pkibbey",
    repo: "FileOrganizer",
    displayName: "File Organizer",
  },
  {
    owner: "pkibbey",
    repo: "FriendBNB",
    displayName: "FriendBNB",
  },
  {
    owner: "pkibbey",
    repo: "friends",
    displayName: "Friends",
  },
  {
    owner: "pkibbey",
    repo: "gameshow-app",
    displayName: "Gameshow App",
  },
  {
    owner: "pkibbey",
    repo: "image-pal",
    displayName: "Image Pal",
  },
  {
    owner: "pkibbey",
    repo: "media-manager",
    displayName: "Media Manager",
  },
  {
    owner: "pkibbey",
    repo: "media-processor",
    displayName: "Media Processor",
  },
  {
    owner: "pkibbey",
    repo: "movie-search",
    displayName: "Movie Search",
  },
  {
    owner: "pkibbey",
    repo: "movie-swipe",
    displayName: "Movie Swipe",
  },
  {
    owner: "pkibbey",
    repo: "movies-web",
    displayName: "Movies Web",
  },
  {
    owner: "pkibbey",
    repo: "phineaskibbey",
    displayName: "Phineas Kibbey",
  },
  {
    owner: "pkibbey",
    repo: "phineaskibbey-next",
    displayName: "Phineas Kibbey Next",
  },
  {
    owner: "pkibbey",
    repo: "pinball-bounty",
    displayName: "Pinball Bounty",
  },
  {
    owner: "pkibbey",
    repo: "pkibbey.github.io",
    displayName: "pkibbey.github.io",
  },
  {
    owner: "pkibbey",
    repo: "podcast-to-video",
    displayName: "Podcast to Video",
  },
  {
    owner: "pkibbey",
    repo: "projects-dashboard",
    displayName: "Projects Dashboard",
  },
  {
    owner: "pkibbey",
    repo: "qr-code-component",
    displayName: "QR Code Component",
  },
  {
    owner: "pkibbey",
    repo: "resensationalizer",
    displayName: "Resensationalizer",
  },
  {
    owner: "pkibbey",
    repo: "review-everything",
    displayName: "Review Everything",
  },
  {
    owner: "pkibbey",
    repo: "stay-with-friends",
    displayName: "Stay with Friends",
  },
  {
    owner: "pkibbey",
    repo: "surprise-app",
    displayName: "Surprise App",
  },
  {
    owner: "pkibbey",
    repo: "timeline-predictor",
    displayName: "Timeline Predictor",
  },
  {
    owner: "pkibbey",
    repo: "torrent-trailers",
    displayName: "Torrent Trailers",
  },
  {
    owner: "pkibbey",
    repo: "train-properties",
    displayName: "Train Properties",
  },
  {
    owner: "pkibbey",
    repo: "ui-starter-kit",
    displayName: "UI Starter Kit",
  },
  {
    owner: "pkibbey",
    repo: "video-chat",
    displayName: "Video Chat",
  },
];

// Configuration for which markdown/documentation files to fetch from repositories
// Set to empty array if you only want repo metadata without fetching files
export const DEFAULT_FILES = [
  "README.md",
  "PROJECT_ANALYSIS.md",
  "TODO.md",
  "PROJECT.md",
] as const;
