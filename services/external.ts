
export interface TriviaQuestion {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface ReactionGif {
  url: string;
  anime_name: string;
}

export interface SkipTime {
    interval: {
        startTime: number;
        endTime: number;
    };
    skipType: 'op' | 'ed' | 'mixed-op' | 'mixed-ed' | 'recap';
    skipId: string;
    episodeLength: number;
}

class ExternalService {
  // Open Trivia DB - Category 31 is Anime & Manga
  async getAnimeTrivia(amount: number = 10, difficulty?: 'easy' | 'medium' | 'hard'): Promise<TriviaQuestion[]> {
    let url = `https://opentdb.com/api.php?amount=${amount}&category=31&type=multiple`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.error("Trivia API Error", e);
      return [];
    }
  }

  // Nekos.best - Anime Reactions
  async getReaction(category: 'hug' | 'kiss' | 'pat' | 'smug' | 'smile' | 'wave' | 'cry' | 'dance'): Promise<ReactionGif | null> {
    try {
      const res = await fetch(`https://nekos.best/api/v2/${category}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          url: data.results[0].url,
          anime_name: data.results[0].anime_name
        };
      }
      return null;
    } catch (e) {
      console.error("Nekos API Error", e);
      return null;
    }
  }

  // AniSkip API
  async getSkipTimes(malId: number, episodeNumber: number): Promise<SkipTime[]> {
      try {
          const res = await fetch(`https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&types[]=mixed-op&types[]=mixed-ed&types[]=recap`);
          const data = await res.json();
          return data.found ? data.results : [];
      } catch (e) {
          console.warn("AniSkip fetch failed", e);
          return [];
      }
  }
}

export const externalService = new ExternalService();
