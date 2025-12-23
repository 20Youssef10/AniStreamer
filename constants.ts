
import { AppConfig, AnimeSort } from './types';

// --- SERVER CONFIGURATION ---
// In production, this can be set via Vite environment variables (VITE_API_URL).
// If not found, it defaults to localhost. 
// You can also override this via config.txt after deployment.
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

// Fallback config if config.txt fails or is missing
export const DEFAULT_CONFIG: AppConfig = {
  firebase: {
    apiKey: "AIzaSyAXyLvrB51sOAXOSACG-BNSD7qMXlzhfbc",
    authDomain: "anistream-ata1.firebaseapp.com",
    projectId: "anistream-ata1",
    storageBucket: "anistream-ata1.firebasestorage.app",
    messagingSenderId: "1010869287188",
    appId: "1:1010869287188:web:2cb217eab801dbef306a01",
    measurementId: "G-31FKH81ZME"
  },
  anilist: {
    apiUrl: "https://graphql.anilist.co"
  },
  youtube: {
    apiKey: "AIzaSyBcoHE4l3UtUTS9EjcrmHHMluDWxhREPzE"
  }
};

export const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mecha", "Music", "Mystery", "Psychological", 
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
];

export const SORT_OPTIONS = [
  { label: "Popularity", value: AnimeSort.POPULARITY_DESC },
  { label: "Score", value: AnimeSort.SCORE_DESC },
  { label: "Trending", value: AnimeSort.TRENDING_DESC },
  { label: "Date", value: AnimeSort.START_DATE_DESC },
];

export const STATUS_OPTIONS = [
  { label: "Watching", value: "WATCHING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Planning", value: "PLANNING" },
  { label: "Dropped", value: "DROPPED" },
];
