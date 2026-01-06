
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://anistream-ata1.web.app'; // Replace with your actual domain
const OUTPUT_FILE = path.resolve(__dirname, '../public/sitemap.xml');

// Static routes in your app
const staticRoutes = [
  '/',
  '/anime',
  '/upcoming',
  '/search',
  '/calendar',
  '/games',
  '/news',
  '/media',
  '/analytics',
  '/ai',
  '/ai-studio',
  '/ar',
  '/swipe',
  '/focus',
  '/birthdays',
  '/chat',
  '/tierlist',
  '/leaderboard',
  '/reader',
  '/top-characters',
  '/ranking',
  '/about',
  '/isekai',
  '/speed-test',
  '/quotes',
  '/login'
];

async function fetchAniListIds(type, sort) {
  const query = `
    query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(type: $type, sort: $sort, isAdult: false) {
          id
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          page: 1,
          perPage: 50, // Limit to top 50 to keep sitemap manageable
          type,
          sort
        }
      })
    });

    const json = await response.json();
    return json.data.Page.media.map(m => m.id);
  } catch (error) {
    console.error(`Error fetching ${type} ids:`, error);
    return [];
  }
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  // 1. Fetch Dynamic IDs
  const trendingAnimeIds = await fetchAniListIds('ANIME', 'TRENDING_DESC');
  const popularAnimeIds = await fetchAniListIds('ANIME', 'POPULARITY_DESC');
  const trendingMangaIds = await fetchAniListIds('MANGA', 'TRENDING_DESC');

  // Deduplicate Anime IDs
  const animeIds = [...new Set([...trendingAnimeIds, ...popularAnimeIds])];

  // 2. Build XML
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add Static Routes
  staticRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${BASE_URL}/#${route}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  // Add Dynamic Anime Routes
  animeIds.forEach(id => {
    sitemap += `  <url>
    <loc>${BASE_URL}/#/anime/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  // Add Dynamic Manga Routes
  trendingMangaIds.forEach(id => {
    sitemap += `  <url>
    <loc>${BASE_URL}/#/manga/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;

  // 3. Write File
  fs.writeFileSync(OUTPUT_FILE, sitemap);
  console.log(`Sitemap generated at ${OUTPUT_FILE}`);
}

generateSitemap();
