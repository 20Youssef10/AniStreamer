
import { anilistService } from './anilist';

// Mock Filler Data (In a real app, this would fetch from an API like anime-filler-list)
const FILLER_DB: Record<string, number[]> = {
    '20': [26, 97, 101, 102, 103, 104, 105, 106, 136, 137, 138, 139, 140, 141, 142, 143], // Naruto
    '1735': [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80], // Naruto Shippuden (Example range)
    '269': [33, 50, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100], // Bleach
    '21': [54, 55, 56, 57, 58, 59, 60, 61, 98, 99, 101, 102, 131, 132, 133, 134, 135, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206], // One Piece (Small sample)
    '235': [1, 19, 51, 52, 63, 64, 82, 83, 137] // Detective Conan (Sample)
};

const DANMAKU_POOL = [
    "wwwwww", "Sugoi!", "Don't cry...", "Here it comes!", "BEST SCENE EVER", 
    "LOL", "NANI!?", "Plot twist incoming", "Skip opening?", "Wait for post-credits",
    "Animation budget goes brrr", "My kokoro keeps doki doki", "Protecc at all costs",
    "Gojo satoru??", "Is this a Jojo reference?", "First time?", "Flashback no jutsu"
];

class OtakuService {
    
    isFiller(animeId: number, episodeNumber: number): boolean {
        // Check local mock DB first
        if (FILLER_DB[animeId.toString()]) {
            return FILLER_DB[animeId.toString()].includes(episodeNumber);
        }
        return false;
    }

    getDanmakuComment(): { text: string, color: string, top: number, speed: number } {
        const text = DANMAKU_POOL[Math.floor(Math.random() * DANMAKU_POOL.length)];
        const colors = ['#fff', '#ffeb3b', '#ff5252', '#69f0ae', '#40c4ff'];
        
        return {
            text,
            color: colors[Math.floor(Math.random() * colors.length)],
            top: Math.floor(Math.random() * 80) + 5, // 5% to 85% from top
            speed: Math.floor(Math.random() * 5) + 5 // 5s to 10s duration
        };
    }
}

export const otakuService = new OtakuService();
