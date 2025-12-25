
export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
    vapidKey?: string;
  };
  anilist: {
    apiUrl: string;
    clientId?: string;
    clientSecret?: string;
  };
  youtube: {
    apiKey: string;
  };
}

export enum AnimeSort {
  POPULARITY_DESC = "POPULARITY_DESC",
  SCORE_DESC = "SCORE_DESC",
  TRENDING_DESC = "TRENDING_DESC",
  START_DATE_DESC = "START_DATE_DESC",
  FAVOURITES_DESC = "FAVOURITES_DESC"
}

export type MediaType = 'ANIME' | 'MANGA';

export interface SearchFilters {
  query?: string;
  sort?: AnimeSort;
  page?: number;
  type?: MediaType;
  genre?: string;
  year?: number;
  season?: string;
  format?: string;
  status?: string;
}

export interface Anime {
  id: number;
  idMal?: number;
  type: MediaType;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    large: string;
    medium: string;
    color?: string;
  };
  bannerImage?: string;
  description: string;
  averageScore: number;
  popularity: number;
  favourites: number;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  genres: string[];
  format?: string;
  duration?: number;
  source?: string;
  studios?: {
    nodes: {
      id: number;
      name: string;
      isAnimationStudio: boolean;
    }[];
  };
  startDate: {
    year: number;
    month: number;
    day: number;
  };
  endDate?: {
    year: number;
    month: number;
    day: number;
  };
  trailer?: {
    id: string;
    site: string;
    thumbnail?: string;
  };
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  externalLinks?: {
    url: string;
    site: string;
    type: string;
    icon?: string;
    color?: string;
  }[];
  tags?: {
    id: number;
    name: string;
    rank: number;
    description?: string;
  }[];
  relations?: {
    edges: {
      relationType: string;
      node: Anime;
    }[];
  };
  recommendations?: {
    nodes: {
      mediaRecommendation: Anime;
    }[];
  };
  characters?: {
    edges: {
      role: string;
      node: Character;
      voiceActors?: Staff[];
    }[];
  };
  staff?: {
    edges: {
      role: string;
      node: Staff;
    }[];
  };
  meanScore?: number;
}

export interface Character {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
    medium: string;
  };
  description?: string;
  favourites: number;
  age?: string;
  gender?: string;
  bloodType?: string;
  dateOfBirth?: {
    year: number;
    month: number;
    day: number;
  };
  media?: {
    edges: {
      characterRole: string;
      node: Anime;
      voiceActors?: Staff[];
    }[];
    nodes?: Anime[];
  };
}

export interface Staff {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
    medium: string;
  };
  description?: string;
  age?: number;
  gender?: string;
  homeTown?: string;
  staffMedia?: {
    edges: {
      staffRole: string;
      node: Anime;
    }[];
  };
  characterMedia?: {
    edges: {
      characterRole: string;
      node: Anime;
      characters: Character[];
    }[];
  };
}

export interface Studio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
  favourites: number;
  media: {
    nodes: Anime[];
  };
}

export interface ForumThread {
  id: number;
  title: string;
  body: string;
  createdAt: number;
  viewCount: number;
  replyCount: number;
  user: {
    name: string;
    avatar: {
      medium: string;
    };
  };
  mediaCategories?: Anime[];
}

export interface Activity {
  id: number;
  type: string;
  status?: string;
  progress?: string;
  createdAt: number;
  media: {
    id: number;
    title: {
      romaji: string;
    };
    coverImage: {
      medium: string;
    };
  };
  user: {
    name: string;
    avatar: {
      medium: string;
    };
  };
}

export interface UserListEntry {
  animeId: number;
  status: 'WATCHING' | 'COMPLETED' | 'PLANNING' | 'DROPPED' | 'PAUSED' | 'REPEATING' | 'READING';
  score: number;
  progress: number;
  progressVolumes?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  rewatchCount?: number;
  notes?: string;
  private?: boolean;
  startDate?: any;
  finishDate?: any;
  updatedAt: number;
  title?: string;
  image?: string;
  genres?: string[];
  type?: MediaType;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username?: string;
  photoURL: string;
  email: string;
  bio?: string;
  level: number;
  xp: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  permissions?: AdminPermission[];
  favorites?: number[];
  favoriteChars?: number[];
  badges?: {
    name: string;
    description: string;
    icon: string;
    unlockedAt: number;
  }[];
  friends?: string[];
  friendRequests?: FriendRequest[];
  settings?: UserSettings;
  collection?: CollectedCharacter[];
  lastDailySummon?: number;
  fcmToken?: string;
}

export type AdminPermission = 'MANAGE_SYSTEM' | 'MANAGE_CONTENT' | 'MANAGE_USERS' | 'MANAGE_ROLES' | 'MODERATE_COMMUNITY' | 'HANDLE_SUPPORT' | 'VIEW_ANALYTICS' | 'MANAGE_NEWS';

export interface FriendRequest {
  fromId: string;
  fromName: string;
  fromAvatar: string;
  timestamp: number;
}

export interface FeatureLockConfig {
  [key: string]: {
    locked: boolean;
    minLevel: number;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: number;
}

export interface DiscussionPost {
  id?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
  likes: number;
  isFlagged?: boolean;
  isHidden?: boolean;
  flagReason?: string;
}

export interface CharacterComment {
  id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: number;
  likes: number;
}

export interface Episode {
  id?: string;
  animeId: number;
  number: number;
  title: string;
  thumbnail?: string;
  sources: EpisodeSource[];
  isFiller?: boolean;
  language?: string;
  createdAt: number;
}

export interface EpisodeSource {
  name: string;
  url: string;
  type: 'video' | 'embed' | 'hls';
  audio?: string;
}

export interface ManualChapter {
  id: string;
  mangaId: number;
  chapter: string; // number as string
  number: number;
  title: string;
  pages: string[];
  language?: string;
  createdAt: number;
}

export interface MangaChapter {
  id: string;
  chapter: string;
  title?: string;
  language: string;
  pages?: number; // count
  publishAt: string | number;
  source: 'dex' | 'hook' | 'manual' | 'olympus';
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  items: number[];
  createdAt: number;
  isPublic: boolean;
}

export interface UserRecommendation {
  id: string;
  sourceId: number;
  sourceTitle: string;
  sourceImage: string;
  targetId: number;
  targetTitle: string;
  targetImage: string;
  reason: string;
  likes: number;
  createdAt: number;
}

export interface SupportChat {
  id: string; // userId
  hasUnreadAdmin: boolean;
  hasUnreadUser: boolean;
  lastMessage: string;
  updatedAt: number;
}

export interface SupportMessage {
  id: string;
  text: string;
  isAdmin: boolean;
  timestamp: number;
}

export interface TraceResult {
  frameCount: number;
  error: string;
  result: {
    anilist: {
      id: number;
      title: { native: string; romaji: string; english: string };
      isAdult: boolean;
    };
    filename: string;
    episode: number | string;
    from: number;
    to: number;
    similarity: number;
    video: string;
    image: string;
  }[];
}

export interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  tags: string[];
  memberCount: number;
  members?: string[];
}

export interface ChatMessage {
  id?: string;
  userId: string;
  userName: string;
  avatar?: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system'; // 'image' could be added
}

export interface WatchParty {
  id: string;
  hostId: string;
  animeId: number;
  animeTitle: string;
  videoUrl?: string; // For host
  currentTime: number;
  isPlaying: boolean;
  participants: string[];
  status: 'active' | 'ended';
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface CollectedCharacter {
  id: number;
  name: string;
  image: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  obtainedAt: number;
  favourites: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  category: string;
  author: {
    uid: string;
    name: string;
    avatar: string;
  };
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  createdAt: number;
  views: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  images: { url: string }[];
}

export interface Track {
  title: string;
  artist: string;
  anime: string;
  url: string;
  source: 'local' | 'youtube' | 'spotify';
  youtubeId?: string;
  spotifyUri?: string;
  artwork?: string;
  lyrics?: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  accentColor: string;
  layoutDensity: 'compact' | 'normal' | 'comfortable';
  language: 'en' | 'ar' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'zh' | 'ko';
  dataSaver: boolean;
  customCursor: boolean;
  backgroundImage?: string;
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showActivity: boolean;
    showStats: boolean;
  };
  parental: {
    adultContent: boolean;
    spoilerMode: boolean;
    pin?: string;
  };
  dashboard: {
    showTrending: boolean;
    showSeasonal: boolean;
    showUpcoming: boolean;
    showRecommendations: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: number;
    textToSpeech: boolean;
  };
  player: {
    defaultQuality: '1080p' | '720p' | '360p';
    autoplay: boolean;
    audioLanguage: 'sub' | 'dub';
  };
  reader: {
    direction: 'ltr' | 'rtl' | 'vertical';
    fit: 'width' | 'height' | 'contain';
    brightness: number;
    background: 'white' | 'black' | 'gray';
  };
  notifications: {
    airingAlerts: boolean;
    socialAlerts: boolean;
  };
  quickActions: ('list' | 'favorite' | 'share' | 'planning' | 'completed')[];
  youtubeApiKey?: string;
}

export interface AppBranding {
  appName: string;
  logoUrl: string;
  loginBackground: string;
  faviconUrl: string;
}

export interface XPRewardsConfig {
  episode: number;
  chapter: number;
  comment: number;
  gameWin: number;
  dailyLogin: number;
}

export interface AILimitsConfig {
  baseDailyRequests: number;
  requestsPerLevel: number;
  maxDailyRequests: number;
}

export interface AIFeatureConfig {
  [key: string]: {
    enabled: boolean;
    isPremium: boolean;
  };
}

export interface MangaSource {
  id: string;
  name: string;
  version: string;
  icon: string;
  isNsfw: boolean;
  searchManga(query: string): Promise<SourceManga[]>;
  searchMangaId(title: string): Promise<string | null>;
  getChapters(mangaId: string): Promise<SourceChapter[]>;
  getPages(chapterId: string): Promise<string[]>;
  getChapterPages?(chapterId: string): Promise<string[]>; // For legacy
}

export interface SourceManga {
  id: string;
  title: string;
  image: string;
  status: string;
  sourceId?: string;
}

export interface SourceChapter {
  id: string;
  number: string;
  title?: string;
  language: string;
  date: number;
  volume?: string;
  source?: 'dex' | 'hook' | 'manual' | 'olympus';
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
    link?: string;
}
