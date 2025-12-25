
import { Anime, Character, Staff, Studio, Activity, NewsArticle, ForumThread, MediaType, AnimeSort, SearchFilters } from '../types';

interface PageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

interface PaginatedResult<T> {
  pageInfo: PageInfo;
  media: T[];
  characters?: T[];
}

export class AnilistService {
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
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AniList API Error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    if (json.errors) {
        throw new Error(json.errors[0].message);
    }
    return json.data;
  }

  // --- ANIME & MANGA ---

  async getAnimeDetails(id: number): Promise<Anime> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          description
          averageScore
          popularity
          favourites
          episodes
          status
          season
          seasonYear
          genres
          format
          duration
          source
          studios { nodes { id name isAnimationStudio } }
          startDate { year month day }
          endDate { year month day }
          trailer { id site thumbnail }
          nextAiringEpisode { airingAt timeUntilAiring episode }
          externalLinks { url site type icon color }
          tags { id name rank description }
          relations { edges { relationType node { id type title { romaji english } coverImage { medium } format status } } }
          recommendations { nodes { mediaRecommendation { id type title { romaji english } coverImage { medium } averageScore } } }
          characters(sort: ROLE, perPage: 10) { edges { role node { id name { full } image { medium } } voiceActors(language: JAPANESE) { id name { full } image { medium } languageV2 } } }
          staff(sort: RELEVANCE, perPage: 6) { edges { role node { id name { full } image { medium } } } }
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { id });
    return data.Media;
  }

  async getMangaDetails(id: number): Promise<Anime> { // Reusing Anime interface for simplicity as they share most fields in this app's types
    const query = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          id
          idMal
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          description
          averageScore
          popularity
          favourites
          chapters
          volumes
          status
          startDate { year month day }
          genres
          format
          source
          tags { id name rank }
          externalLinks { url site type icon color }
          relations { edges { relationType node { id type title { romaji english } coverImage { medium } format status } } }
          recommendations { nodes { mediaRecommendation { id type title { romaji english } coverImage { medium } averageScore } } }
          characters(sort: ROLE, perPage: 10) { edges { role node { id name { full } image { medium } } } }
          staff(sort: RELEVANCE, perPage: 6) { edges { role node { id name { full } image { medium } } } }
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { id });
    return { ...data.Media, type: 'MANGA' };
  }

  // --- SEARCH & LISTS ---

  async searchAnime(filters: SearchFilters, tag?: string): Promise<{ Page: { pageInfo: PageInfo; media: Anime[] } }> {
    const fixedQuery = `
      query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $sort: [MediaSort], $genre: String, $tag: String, $seasonYear: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total perPage currentPage lastPage hasNextPage }
          media(search: $search, type: $type, sort: $sort, genre: $genre, tag: $tag, seasonYear: $seasonYear, season: $season, format: $format, status: $status) {
            id
            type
            title { romaji english }
            coverImage { large medium }
            averageScore
            popularity
            favourites
            episodes
            chapters
            volumes
            status
            seasonYear
            genres
            format
          }
        }
      }
    `;
    
    const variables: any = {
      page: filters.page || 1,
      perPage: 20,
      type: filters.type || 'ANIME',
      sort: filters.sort || 'POPULARITY_DESC',
      search: filters.query || undefined,
      genre: filters.genre || undefined,
      tag: tag || undefined,
      status: filters.status || undefined,
      format: filters.format || undefined
    };

    if (filters.year) variables.seasonYear = filters.year;
    if (filters.season) variables.season = filters.season;

    const data = await this.fetchGraphQL(fixedQuery, variables);
    return data;
  }

  async getTrending(limit: number = 10, perPage: boolean = false, type: MediaType = 'ANIME'): Promise<Anime[]> {
      const query = `
        query ($perPage: Int, $type: MediaType) {
            Page(perPage: $perPage) {
                media(sort: TRENDING_DESC, type: $type) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    bannerImage
                    description
                    averageScore
                    format
                    seasonYear
                    genres
                    status
                    nextAiringEpisode { airingAt timeUntilAiring episode }
                    trailer { id site thumbnail }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { perPage: limit, type });
      return data.Page.media;
  }

  async getSeasonal(season: string, year: number, type: MediaType = 'ANIME', limit: number = 10): Promise<Anime[]> {
      const query = `
        query ($season: MediaSeason, $seasonYear: Int, $type: MediaType, $perPage: Int) {
            Page(perPage: $perPage) {
                media(season: $season, seasonYear: $seasonYear, type: $type, sort: POPULARITY_DESC) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    averageScore
                    format
                    seasonYear
                    genres
                    status
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { season, seasonYear: year, type, perPage: limit });
      return data.Page.media;
  }

  async getPopularAllTime(type: MediaType = 'ANIME', limit: number = 10): Promise<Anime[]> {
      const query = `
        query ($type: MediaType, $perPage: Int) {
            Page(perPage: $perPage) {
                media(sort: POPULARITY_DESC, type: $type) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    averageScore
                    popularity
                    format
                    seasonYear
                    genres
                    status
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { type, perPage: limit });
      return data.Page.media;
  }

  async getTopRated(type: MediaType = 'ANIME', limit: number = 10): Promise<Anime[]> {
      const query = `
        query ($type: MediaType, $perPage: Int) {
            Page(perPage: $perPage) {
                media(sort: SCORE_DESC, type: $type) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    averageScore
                    popularity
                    format
                    seasonYear
                    genres
                    status
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { type, perPage: limit });
      return data.Page.media;
  }

  async getNewEpisodes(limit: number = 10): Promise<Anime[]> {
      const query = `
        query ($perPage: Int, $notYetAired: Boolean) {
            Page(perPage: $perPage) {
                airingSchedules(notYetAired: $notYetAired, sort: TIME_DESC) {
                    media {
                        id
                        type
                        title { romaji english }
                        coverImage { large medium }
                        averageScore
                        genres
                    }
                    episode
                    airingAt
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { perPage: limit, notYetAired: false });
      return data.Page.airingSchedules.map((schedule: any) => ({
          ...schedule.media,
          nextAiringEpisode: { episode: schedule.episode, airingAt: schedule.airingAt }
      }));
  }

  async getUpcoming(limit: number = 10): Promise<Anime[]> {
      const query = `
        query ($perPage: Int) {
            Page(perPage: $perPage) {
                media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    startDate { year month day }
                    genres
                    format
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { perPage: limit });
      return data.Page.media;
  }

  // --- CHARACTERS & STAFF ---

  async getCharacterDetails(id: number): Promise<Character> {
    const query = `
      query ($id: Int) {
        Character(id: $id) {
          id
          name { full native alternative }
          image { large medium }
          description
          favourites
          siteUrl
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
                characterMedia(sort: POPULARITY_DESC) {
                    edges {
                        characterRole
                        node { id title { romaji english } coverImage { medium } seasonYear }
                        characters { id name { full } image { medium } }
                    }
                }
                staffMedia(sort: POPULARITY_DESC) {
                    edges {
                        staffRole
                        node { id title { romaji english } coverImage { medium } }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { id });
      return data.Staff;
  }

  async getStudioDetails(id: number): Promise<Studio> {
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
                        title { romaji english }
                        coverImage { large medium }
                        averageScore
                        popularity
                        format
                        seasonYear
                        genres
                        status
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { id });
      return data.Studio;
  }

  async getTopCharacters(page: number = 1): Promise<{ characters: Character[], hasNextPage: boolean }> {
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
      return { 
          characters: data.Page.characters,
          hasNextPage: data.Page.pageInfo.hasNextPage
      };
  }

  async getRandomCharacters(amount: number = 10): Promise<Character[]> {
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const query = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                characters(sort: FAVOURITES_DESC) {
                    id
                    name { full }
                    image { large }
                    favourites
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page: randomPage, perPage: amount });
      return data.Page.characters;
  }

  async getCharactersByIds(ids: number[]): Promise<Character[]> {
      if (ids.length === 0) return [];
      const query = `
        query ($ids: [Int]) {
            Page {
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

  // --- UTILS ---

  async getRandomAnimeId(): Promise<number> {
      const randomPage = Math.floor(Math.random() * 100) + 1;
      const query = `
        query ($page: Int) {
            Page(page: $page, perPage: 1) {
                media(sort: POPULARITY_DESC, type: ANIME) {
                    id
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { page: randomPage });
      return data.Page.media[0]?.id || 1;
  }

  getNextSeason() {
      const date = new Date();
      const month = date.getMonth();
      const year = date.getFullYear();
      let season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' = 'WINTER';
      let nextYear = year;

      if (month >= 2 && month <= 4) season = 'SUMMER';
      else if (month >= 5 && month <= 7) season = 'FALL';
      else if (month >= 8 && month <= 10) { season = 'WINTER'; nextYear = year + 1; }
      else season = 'SPRING';

      return { season, year: nextYear };
  }

  async getForumThreads(limit: number = 5): Promise<ForumThread[]> {
      const query = `
        query ($perPage: Int) {
            Page(perPage: $perPage) {
                threads(sort: REPLIED_AT_DESC) {
                    id
                    title
                    body
                    createdAt
                    viewCount
                    replyCount
                    user { name avatar { medium } }
                    mediaCategories { id title { romaji } coverImage { large } }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { perPage: limit });
      return data.Page.threads;
  }

  async getGlobalActivity(): Promise<Activity[]> {
      const query = `
        query {
            Page(perPage: 20) {
                activities(type: ANIME_LIST, sort: ID_DESC) {
                    ... on ListActivity {
                        id
                        type
                        status
                        progress
                        createdAt
                        media { id title { romaji } coverImage { medium } }
                        user { name avatar { medium } }
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
                media(genre: $genre, sort: SCORE_DESC, type: ANIME) {
                    id
                    title { romaji english }
                    coverImage { large medium }
                    averageScore
                    description
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { genre });
      return data.Page.media;
  }

  async getGlobalRankings(type: MediaType): Promise<Anime[]> {
      return this.getPopularAllTime(type, 50);
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

  async getAnimeByIds(ids: number[]): Promise<Anime[]> {
      if (ids.length === 0) return [];
      const query = `
        query ($ids: [Int]) {
            Page(perPage: 50) {
                media(id_in: $ids) {
                    id
                    type
                    title { romaji english }
                    coverImage { large medium }
                    averageScore
                    format
                    seasonYear
                    status
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { ids });
      return data.Page.media;
  }

  async getAnimeByMalIds(malIds: number[]): Promise<Anime[]> {
      if (malIds.length === 0) return [];
      const query = `
        query ($ids: [Int]) {
            Page(perPage: 50) {
                media(idMal_in: $ids) {
                    id
                    idMal
                    type
                    title { romaji english }
                    coverImage { medium }
                    genres
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { ids: malIds });
      return data.Page.media;
  }

  async getAnimeWithTrailers(): Promise<Anime[]> {
      const query = `
        query {
            Page(perPage: 20) {
                media(sort: TRENDING_DESC, type: ANIME) {
                    id
                    title { romaji english }
                    coverImage { large medium }
                    bannerImage
                    trailer { id site thumbnail }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query);
      return data.Page.media;
  }

  async getAdvancedRanking(type: MediaType, format?: string, status?: string, limit: number = 50): Promise<Anime[]> {
      const query = `
        query ($type: MediaType, $format: MediaFormat, $status: MediaStatus, $perPage: Int) {
            Page(perPage: $perPage) {
                media(type: $type, format: $format, status: $status, sort: POPULARITY_DESC) {
                    id
                    title { romaji english }
                    coverImage { medium }
                    averageScore
                    popularity
                    format
                    seasonYear
                    status
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { type, format, status, perPage: limit });
      return data.Page.media;
  }

  async getBirthdays(): Promise<Character[]> {
      const date = new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      const query = `
        query ($month: Int, $day: Int) {
            Page(perPage: 20) {
                characters(birthMonth: $month, birthDay: $day, sort: FAVOURITES_DESC) {
                    id
                    name { full }
                    image { large }
                    media(sort: POPULARITY_DESC, perPage: 1) {
                        nodes { title { romaji } }
                    }
                }
            }
        }
      `;
      const data = await this.fetchGraphQL(query, { month, day });
      return data.Page.characters;
  }
}

export const anilistService = new AnilistService();
