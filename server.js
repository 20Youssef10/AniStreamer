
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// --- CONFIGURATION ---
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || '077252f0edc212a3d155be6e4a9c0fbe';
const MAL_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || '90d159f81f90f645ad22a0f8a9119e5d0c2fda9e6c308284fff0076f1ed76608';

const ANILIST_CLIENT_ID = process.env.ANILIST_CLIENT_ID || '33401';
const ANILIST_CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET || 'Xn8eRj7Wa0vR0SPm6InsEuXbrEc0tMhhLo1zbHHS';

// Initialize AI Client with key from environment
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const app = express();

// Configure CORS to allow your frontend domains explicitly
app.use(cors({ 
    origin: [
        'http://localhost:5173', 
        'http://localhost:4173',
        'https://anistream-ata1.web.app', 
        'https://anistream-ata1.firebaseapp.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

const router = express.Router();
const MANGADEX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).send('AniStream Backend is Operational');
});

// --- MANGADEX PROXY ---
router.get('/mangadex/search', async (req, res) => {
    try {
        const { title, limit = 10 } = req.query;
        if (!title) return res.json({ data: [] });
        
        const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=${limit}&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
        const resp = await fetch(url, { headers: { 'User-Agent': MANGADEX_UA } });
        if (!resp.ok) throw new Error(`MangaDex API error: ${resp.status}`);
        
        const data = await resp.json();
        res.json(data);
    } catch (e) {
        console.error("MangaDex Search Proxy Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/mangadex/chapters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 500, offset = 0 } = req.query;
        const url = `https://api.mangadex.org/manga/${id}/feed?order[chapter]=desc&limit=${limit}&offset=${offset}`;
        const resp = await fetch(url, { headers: { 'User-Agent': MANGADEX_UA } });
        if (!resp.ok) throw new Error(`MangaDex API error: ${resp.status}`);

        const data = await resp.json();
        res.json(data);
    } catch (e) {
        console.error("MangaDex Chapters Proxy Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/mangadex/pages/:chapterId', async (req, res) => {
    try {
        const { chapterId } = req.params;
        const url = `https://api.mangadex.org/at-home/server/${chapterId}`;
        const resp = await fetch(url, { headers: { 'User-Agent': MANGADEX_UA } });
        if (!resp.ok) throw new Error(`MangaDex API error: ${resp.status}`);

        const data = await resp.json();
        res.json(data);
    } catch (e) {
        console.error("MangaDex Pages Proxy Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- OLYMPUS SCANS PROXY ---
router.get('/olympus/proxy', async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) return res.status(400).json({ error: "Path required" });

        const BASE_URL = 'https://olympusscans.com'; 
        const targetUrl = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

        const resp = await fetch(targetUrl, {
            headers: {
                'User-Agent': MANGADEX_UA,
                'Referer': BASE_URL,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            redirect: 'follow'
        });

        const text = await resp.text();
        res.status(resp.status).send(text); 
    } catch (e) {
        console.error("Olympus Proxy Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- MAL OAUTH PROXY ---
router.post('/mal/token', async (req, res) => {
    try {
        const { code, code_verifier, redirect_uri } = req.body;
        const params = new URLSearchParams();
        params.append('client_id', MAL_CLIENT_ID);
        params.append('client_secret', MAL_CLIENT_SECRET);
        params.append('code', code);
        params.append('code_verifier', code_verifier);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', redirect_uri);

        const response = await fetch('https://myanimelist.net/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'MAL Token Error');
        res.json(data);
    } catch (e) {
        console.error("MAL Token Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- ANILIST OAUTH PROXY ---
router.post('/anilist/token', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;
        
        const response = await fetch('https://anilist.co/api/v2/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: ANILIST_CLIENT_ID,
                client_secret: ANILIST_CLIENT_SECRET,
                redirect_uri: redirect_uri,
                code: code,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AniList Token Error');
        res.json(data);
    } catch (e) {
        console.error("AniList Token Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- AI Endpoints ---

router.post('/chat', async (req, res) => {
    try {
        const { message, history, model, config } = req.body;
        const selectedModel = model || 'gemini-3-pro-preview';
        const ai = getAI();

        let contents = [];
        if (history && Array.isArray(history)) {
            contents = history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }));
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await ai.models.generateContent({
            model: selectedModel,
            contents: contents,
            config: config || {
                systemInstruction: "You are an expert anime assistant named 'AniStream Bot'.",
            }
        });

        res.json({ text: response.text });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: { tools: [{ googleSearch: {} }] },
        });

        res.json({
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/analyze', async (req, res) => {
    try {
        const { mimeType, data, prompt } = req.body;
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data } },
                    { text: prompt || "Analyze this media." }
                ]
            }
        });
        res.json({ text: response.text });
    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/edit-image', async (req, res) => {
    try {
        const { image, prompt } = req.body;
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: image } },
                    { text: prompt }
                ]
            }
        });

        let resultImage = null;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                resultImage = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        
        if (resultImage) res.json({ image: resultImage });
        else res.status(500).json({ error: "No image generated" });

    } catch (error) {
        console.error("Image Edit Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/generate-video', async (req, res) => {
    try {
        const { prompt, aspectRatio, image } = req.body;
        const ai = getAI();
        
        const payload = {
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio || '16:9'
            }
        };

        if (image) {
            payload.image = {
                imageBytes: image,
                mimeType: 'image/png'
            };
        }

        let operation = await ai.models.generateVideos(payload);

        let attempts = 0;
        while (!operation.done && attempts < 10) { 
            await new Promise(resolve => setTimeout(resolve, 2000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            attempts++;
        }

        if (operation.done) {
             const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
             if (videoUri) {
                 res.json({ videoUrl: `${videoUri}&key=${process.env.API_KEY}` });
             } else {
                 res.status(500).json({ error: "Video generation failed (no URI)" });
             }
        } else {
            res.status(504).json({ error: "Generation taking too long, please try again." });
        }

    } catch (error) {
        console.error("Video Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
