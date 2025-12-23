
import { Anime, Character, ForumThread, MediaType, SearchFilters, Staff, Studio, Activity } from '../types';

const MEDIA_FRAGMENT = `
  id
  idMal
  type
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    medium
    color
  }
  bannerImage
  description
  averageScore
  meanScore
  popularity
  favourites
  episodes
  chapters
  volumes
  status
  season
  seasonYear
  genres
  format
  duration
  source
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  trailer {
    id
    site
    thumbnail
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  externalLinks {
    url
    site
    type
    icon
    color
  }
  tags {
    id
    name
    description
    rank
    isMediaSpoiler
    isGeneralSpoiler
  }
  rankings {
    id
    rank
    type
    format
    year
    season
    allTime
    context
  }
  relations {
    edges {
      relationType
      node {
        id
        type
        title {
          romaji
          english
          native
        }
        format
        status
        coverImage {
          medium
        }
        seasonYear
      }
    }
  }
  recommendations(perPage: 10, sort: [RATING_DESC, ID]) {
    nodes {
      mediaRecommendation {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
        averageScore
        format
        seasonYear
        status
      }
    }
  }
  staff(perPage: 10) {
    edges {
      role
      node {
        id
        name {
          full
        }
        image {
          medium
        }
      }
    }
  }
  characters(sort: ROLE, perPage: 10) {
    edges {
      role
      node {
        id
        name {
          full
        }
        image {
          medium
        }
      }
      voiceActors(language: JAPANESE, sort: RELEVANCE) {
        id
        name {
          full
        }
        image {
          medium
        }
        languageV2
      }
    }
  }
`;

// Extended fragment for Details pages to fetch more items
const DETAILED_MEDIA_FIELDS = `
  id
  idMal
  type
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    medium
    color
  }
  bannerImage
  description
  averageScore
  meanScore
  popularity
  favourites
  episodes
  chapters
  volumes
  status
  season
  seasonYear
  genres
  format
  duration
  source
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  trailer {
    id
    site
    thumbnail
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  externalLinks {
    url
    site
    type
    icon
    color
  }
  tags {
    id
    name
    description
    rank
    isMediaSpoiler
    isGeneralSpoiler
  }
  rankings {
    id
    rank
    type
    format
    year
    season
    allTime
    context
  }
  relations {
    edges {
      relationType
      node {
        id
        type
        title {
          romaji
          english
          native
        }
        format
        status
        coverImage {
          medium
        }
        seasonYear
      }
    }
  }
  recommendations(perPage: 20, sort: [RATING_DESC, ID]) {
    nodes {
      mediaRecommendation {
        id
        type
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
        averageScore
        format
        seasonYear
        status
      }
    }
  }
  staff(perPage: 25, sort: [RELEVANCE, ID]) {
    edges {
      role
      node {
        id
        name {
          full
        }
        image {
          medium
        }
      }
    }
  }
  characters(sort: [ROLE, RELEVANCE, ID], perPage: 50) {
    edges {
      role
      node {
        id
        name {
          full
        }
        image {
          medium
        }
      }
      voiceActors(language: JAPANESE, sort: RELEVANCE) {
        id
        name {
          full
        }
        image {
          medium
        }
        languageV2
      }
    }
  }
`;

class AnilistService {
  private apiUrl = 'https://graphql.anilist.co';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async fetchGraphQL(query: string, variables: any = {}) {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AniList API Error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    if (json.errors) {
        console.error(json.errors);
        throw new Error(json.errors[0].message);
    }

    return json.data;
  }

  async searchAnime(filters: SearchFilters, tag?: string): Promise<{ Page: { media: Anime[], pageInfo: any } }> {
    let queryVars = `
      $page: Int = 1,
      $perPage: Int = 20,
      $search: String,
      $genre: String,
      $year: Int,
      $season: MediaSeason,
      $format: MediaFormat,
      $status: MediaStatus,
      $sort: [MediaSort],
      $type: MediaType = ANIME
    `;
    
    if (tag) {
        queryVars += `, $tag: String`;
    }

    const query = `
      query (${queryVars}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(
            search: $search,
            genre: $genre,
            seasonYear: $year,
            season: $season,
            format: $format,
            status: $status,
            sort: $sort,
            type: $type,
            tag: ${tag ? '$tag' : 'null'},
            isAdult: false
          ) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;

    const variables: any = { 
        ...filters,
        search: filters.query || undefined
    };
    
    if (variables.year) variables.year = parseInt(variables.year.toString());
    if (tag) variables.tag = tag;

    const data = await this.fetchGraphQL(query, variables);
    return data;
  }

  async getTrending(perPage = 10, isAdult = false, type: MediaType = 'ANIME'): Promise<Anime[]> {
    const query = `
      query ($perPage: Int, $type: MediaType) {
        Page(perPage: $perPage) {
          media(sort: TRENDING_DESC, type: $type, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { perPage, type });
    return data.Page.media;
  }

  async getTrendingManga(perPage = 10): Promise<Anime[]> {
      return this.getTrending(perPage, false, 'MANGA');
  }

  async getSeasonal(season: string, year: number): Promise<Anime[]> {
    const query = `
      query ($season: MediaSeason, $year: Int) {
        Page(perPage: 20) {
          media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { season, year });
    return data.Page.media;
  }

  async getUpcoming(): Promise<Anime[]> {
      const query = `
        query {
            Page(perPage: 20) {
                media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query);
      return data.Page.media;
  }

  async getAnimeDetails(id: number): Promise<Anime> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${DETAILED_MEDIA_FIELDS}
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { id });
    return data.Media;
  }

  async getMangaDetails(id: number): Promise<Anime> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          ${DETAILED_MEDIA_FIELDS}
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { id });
    return data.Media;
  }

  async getRandomAnimeId(): Promise<number> {
      const page = Math.floor(Math.random() * 100) + 1;
      const query = `
        query ($page: Int) {
            Page(page: $page, perPage: 50) {
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    id
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page });
      const items = data.Page.media;
      if (items.length > 0) {
          const randomItem = items[Math.floor(Math.random() * items.length)];
          return randomItem.id;
      }
      return 1;
  }

  async getCharacterDetails(id: number): Promise<Character> {
      const query = `
        query ($id: Int) {
            Character(id: $id) {
                id
                name { full native }
                image { large medium }
                description
                favourites
                age
                gender
                bloodType
                dateOfBirth { year month day }
                media(sort: POPULARITY_DESC) {
                    edges {
                        characterRole
                        node {
                            id
                            type
                            title { romaji english }
                            coverImage { medium }
                            format
                            seasonYear
                        }
                        voiceActors(language: JAPANESE) {
                            id
                            name { full }
                            image { medium }
                            languageV2
                        }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { id });
      return data.Character;
  }

  async getStaffDetails(id: number): Promise<Staff> {
      const query = `
        query ($id: Int) {
            Staff(id: $id) {
                id
                name { full native }
                image { large medium }
                description
                age
                gender
                homeTown
                staffMedia(sort: POPULARITY_DESC, perPage: 25) {
                    edges {
                        staffRole
                        node {
                            id
                            title { romaji english }
                            coverImage { medium }
                            seasonYear
                        }
                    }
                }
                characterMedia(sort: POPULARITY_DESC, perPage: 25) {
                    edges {
                        characterRole
                        node {
                            id
                            title { romaji english }
                            coverImage { medium }
                            seasonYear
                        }
                        characters {
                            id
                            name { full }
                            image { medium }
                        }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { id });
      return data.Staff;
  }

  async getStudioDetails(id: number): Promise<Studio> {
      // Optimized query to prevent fetching heavy nested data which causes API timeouts
      // Removed isAdult argument as it is not valid for Studio.media connection in some API versions
      const query = `
        query ($id: Int) {
            Studio(id: $id) {
                id
                name
                isAnimationStudio
                favourites
                media(sort: POPULARITY_DESC, perPage: 20) {
                    nodes {
                        id
                        type
                        title { romaji english }
                        coverImage { large medium }
                        averageScore
                        popularity
                        status
                        format
                        seasonYear
                        episodes
                        genres
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { id });
      return data.Studio;
  }

  async getForumThreads(categoryId = 5): Promise<ForumThread[]> {
      const query = `
        query ($categoryId: Int) {
            Page(perPage: 20) {
                threads(categoryId: $categoryId, sort: REPLIED_AT_DESC) {
                    id
                    title
                    body
                    createdAt
                    viewCount
                    replyCount
                    categories { id name }
                    user {
                        name
                        avatar { medium }
                    }
                    mediaCategories {
                        id
                        title { romaji }
                        coverImage { medium large }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { categoryId });
      return data.Page.threads;
  }

  async getAnimeWithTrailers(): Promise<Anime[]> {
      const query = `
        query {
            Page(perPage: 20) {
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query);
      return data.Page.media.filter((m: Anime) => m.trailer?.site === 'youtube');
  }

  async getWeeklySchedule(): Promise<any[]> {
      const start = Math.floor(Date.now() / 1000);
      const end = start + 7 * 24 * 60 * 60;
      const query = `
        query ($start: Int, $end: Int) {
            Page(perPage: 50) {
                airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
                    id
                    airingAt
                    episode
                    media {
                        id
                        title { romaji english }
                        coverImage { medium }
                        genres
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { start, end });
      return data.Page.airingSchedules;
  }

  async getGlobalActivity(): Promise<Activity[]> {
      const query = `
        query {
            Page(perPage: 25) {
                activities(sort: ID_DESC, type: ANIME_LIST) {
                    ... on ListActivity {
                        id
                        type
                        status
                        progress
                        createdAt
                        media {
                            id
                            title { romaji }
                            coverImage { medium }
                        }
                        user {
                            name
                            avatar { medium }
                        }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query);
      return data.Page.activities;
  }

  async getRecommendationsByGenre(genre: string): Promise<Anime[]> {
      const query = `
        query ($genre: String) {
            Page(perPage: 10) {
                media(genre: $genre, sort: SCORE_DESC, type: ANIME, isAdult: false) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { genre });
      return data.Page.media;
  }

  async getRandomCharacters(amount = 4): Promise<Character[]> {
      const page = Math.floor(Math.random() * 50) + 1;
      const query = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                characters(sort: FAVOURITES_DESC) {
                    id
                    name { full }
                    image { large medium }
                    favourites
                    media(sort: POPULARITY_DESC, perPage: 1) {
                        nodes {
                            title { romaji }
                        }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page, perPage: amount });
      return data.Page.characters;
  }

  async getRandomPopularPair(): Promise<Anime[]> {
      const page = Math.floor(Math.random() * 10) + 1;
      const query = `
        query ($page: Int) {
            Page(page: $page, perPage: 2) {
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page });
      return data.Page.media;
  }

  async getTopCharacters(page = 1): Promise<{characters: Character[], hasNextPage: boolean}> {
      const query = `
        query ($page: Int) {
            Page(page: $page, perPage: 20) {
                pageInfo { hasNextPage }
                characters(sort: FAVOURITES_DESC) {
                    id
                    name { full }
                    image { large }
                    favourites
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page });
      return { characters: data.Page.characters, hasNextPage: data.Page.pageInfo.hasNextPage };
  }

  async getGlobalRankings(type: MediaType): Promise<Anime[]> {
      const query = `
        query ($type: MediaType) {
            Page(perPage: 50) {
                media(sort: SCORE_DESC, type: $type, isAdult: false) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { type });
      return data.Page.media;
  }

  async getBirthdays(): Promise<Character[]> {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      
      const query = `
        query ($month: Int, $day: Int) {
            Page(perPage: 50) {
                characters(birthMonth: $month, birthDay: $day, sort: FAVOURITES_DESC) {
                    id
                    name { full }
                    image { large }
                    media(sort: POPULARITY_DESC, perPage: 1) {
                        nodes {
                            title { romaji }
                        }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { month, day });
      return data.Page.characters;
  }

  async getAnimeByIds(ids: number[]): Promise<Anime[]> {
      if (ids.length === 0) return [];
      const query = `
        query ($ids: [Int]) {
            Page(perPage: 50) {
                media(id_in: $ids, type: ANIME) {
                    ${MEDIA_FRAGMENT}
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { ids });
      return data.Page.media;
  }

  async getCharactersByIds(ids: number[]): Promise<Character[]> {
      if (ids.length === 0) return [];
      const query = `
        query ($ids: [Int]) {
            Page(perPage: 50) {
                characters(id_in: $ids) {
                    id
                    name { full }
                    image { large }
                    favourites
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { ids });
      return data.Page.characters;
  }

  async getAnimeByMalIds(malIds: number[]): Promise<Anime[]> {
      if (malIds.length === 0) return [];
      const query = `
        query ($malIds: [Int]) {
            Page(perPage: 50) {
                media(idMal_in: $malIds, type: ANIME) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { medium }
                    genres
                }
            }
        }
      `;
      // In a real app we'd paginate requests for >50 IDs
      const chunk = malIds.slice(0, 50);
      const data = await this.fetchGraphQL(query, { malIds: chunk });
      return data.Page.media;
  }
}

export const anilistService = new AnilistService();
