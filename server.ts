import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data for Mopani Singles
const initialDb = {
  profiles: [
    {
      id: 'prof-1',
      full_name: 'Risuna Nkuna',
      age: 26,
      gender: 'Female',
      municipality: 'Greater Giyani',
      village: 'Giyani Section D',
      intention: 'Marriage & Family',
      language: 'Xitsonga / English',
      whatsapp: '+27 72 345 6789',
      bio: 'Digital marketer & entrepreneur based in Giyani. Love traditional Xitsonga cuisine, weekend drives to Tzaneen dam, and good gospel music. Looking for a God-fearing, ambitious partner.',
      image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      is_approved: true,
      is_banned: false,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'prof-2',
      full_name: 'Thabo Modiba',
      age: 30,
      gender: 'Male',
      municipality: 'Greater Tzaneen',
      village: 'Lenyenye',
      intention: 'Long-term relationship',
      language: 'Sepedi / English',
      whatsapp: '+27 83 555 1234',
      bio: 'Agricultural engineer working in Tzaneen citrus estates. Passionate about farming, soccer (Sundowns fan), and hiking around Modjadji Cycad Forest. Let us connect!',
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      is_approved: true,
      is_banned: false,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'prof-3',
      full_name: 'Khensani Baloyi',
      age: 24,
      gender: 'Female',
      municipality: 'Ba-Phalaborwa',
      village: 'Namakgale',
      intention: 'Dating & Friendship',
      language: 'Xitsonga / Sepedi',
      whatsapp: '+27 79 444 9876',
      bio: 'Accountant in Phalaborwa. Enjoy sunset walks, coffee dates, and exploring Kruger National Park wildlife. Looking for someone loyal and fun to talk to.',
      image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      is_approved: true,
      is_banned: false,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 'prof-4',
      full_name: 'Kgomotso Malatji',
      age: 29,
      gender: 'Male',
      municipality: 'Maruleng',
      village: 'Acornhoek',
      intention: 'Serious Relationship',
      language: 'Sepedi / English',
      whatsapp: '+27 71 888 3321',
      bio: 'Teacher and youth mentor. Big fan of local braai spots, afro-soul music, and deep conversations. Seeking a respectful and supportive queen.',
      image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      is_approved: true,
      is_banned: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'prof-5',
      full_name: 'Ntsako Chauke',
      age: 27,
      gender: 'Female',
      municipality: 'Greater Letaba',
      village: 'Modjadjiskloof',
      intention: 'Marriage',
      language: 'Xitsonga / English',
      whatsapp: '+27 63 111 9988',
      bio: 'Nurse by profession. Caring, family-oriented, and loves baking. Hoping to meet a genuine gentleman from Mopani who knows how to treat a woman right.',
      image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      is_approved: false, // Pending admin approval
      is_banned: false,
      created_at: new Date().toISOString()
    }
  ],
  reports: [
    {
      id: 'rep-1',
      reported_id: 'prof-99',
      reason: 'Fake photos and scam attempt',
      reporter: 'Anonymous',
      created_at: new Date().toISOString()
    }
  ],
  likes: [
    { liker_id: 'prof-1', liked_id: 'prof-2', created_at: new Date().toISOString() }
  ]
};

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return initialDb;
  }
}

function saveDb(db: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // --- API Routes ---

  // 1. Get profiles
  app.get('/api/profiles', (req, res) => {
    const db = loadDb();
    const approvedOnly = req.query.approved === 'true';
    let list = db.profiles;
    if (approvedOnly) {
      list = list.filter((p: any) => p.is_approved && !p.is_banned);
    }
    res.json(list);
  });

  // 2. Create profile (goes to pending approval)
  app.post('/api/profiles', (req, res) => {
    const db = loadDb();
    const newProf = {
      id: 'prof-' + Date.now(),
      ...req.body,
      is_approved: false,
      is_banned: false,
      created_at: new Date().toISOString()
    };
    db.profiles.unshift(newProf);
    saveDb(db);
    res.json(newProf);
  });

  // 3. Admin endpoints
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPass = process.env.ADMIN_PASSWORD || 'MopaniAdmin2026!';
    if (password === adminPass) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid admin password' });
    }
  });

  app.get('/api/admin/data', (req, res) => {
    const db = loadDb();
    res.json({
      profiles: db.profiles,
      reports: db.reports,
      pendingCount: db.profiles.filter((p: any) => !p.is_approved && !p.is_banned).length
    });
  });

  app.post('/api/admin/action', (req, res) => {
    const { id, action } = req.body; // action: 'approve' | 'ban' | 'delete'
    const db = loadDb();
    const index = db.profiles.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    if (action === 'approve') {
      db.profiles[index].is_approved = true;
      db.profiles[index].is_banned = false;
    } else if (action === 'ban') {
      db.profiles[index].is_banned = true;
      db.profiles[index].is_approved = false;
    } else if (action === 'delete') {
      db.profiles.splice(index, 1);
    }
    saveDb(db);
    res.json({ success: true, profiles: db.profiles });
  });

  // 4. Reports
  app.post('/api/reports', (req, res) => {
    const db = loadDb();
    const newReport = {
      id: 'rep-' + Date.now(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    db.reports.unshift(newReport);
    saveDb(db);
    res.json({ success: true, report: newReport });
  });

  // 5. Gemini AI Chat (Matchmaker & Relationship Coach)
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages } = req.body;
      if (!ai) {
        return res.json({ reply: "Gemini API key is not configured. Please add GEMINI_API_KEY in secrets to chat with the Mopani Matchmaker AI." });
      }

      const systemInstruction = "You are Mopani Matchmaker AI, a warm, respectful, culturally savvy dating coach and relationship advisor for singles across Mopani District, Limpopo (Giyani, Tzaneen, Phalaborwa, Letaba, Maruleng). You help singles craft charming icebreakers, suggest memorable local date spots (e.g. Tzaneen Dam, Modjadji Forest, Magoebaskloof canopy tours, local cafes in Giyani), and give wholesome relationship advice rooted in respect and local culture (Xitsonga/Sepedi traditions & modern romance). Keep responses encouraging, polite, and engaging.";

      // format contents for @google/genai
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text || "Hello! Let's find your match in Mopani." });
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ error: error.message || 'AI chat failed' });
    }
  });

  // 6. Gemini Text-to-Speech (using gemini-3.8-flash-tts or fallback)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body;
      if (!ai) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const response = await ai.models.generateContent({
        model: 'models/gemini-3.8-flash-tts',
        contents: [{ role: 'user', parts: [{ text: `Read this warmly in a friendly, engaging voice: ${text}` }] }],
        config: {
          responseMimeType: 'audio/mp3',
        }
      });

      // Extract audio part if returned as inline data
      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      if (part && 'inlineData' in part && part.inlineData) {
        return res.json({ audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/mp3' });
      }

      res.status(500).json({ error: 'Audio generation did not return inline audio data' });
    } catch (error: any) {
      console.error('TTS error:', error);
      res.status(500).json({ error: error.message || 'TTS generation failed' });
    }
  });

  // 7. Gemini Image Generation (using gemini-3-pro-image-preview)
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt, size = '1K' } = req.body;
      if (!ai) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not configured' });
      }

      // Map size to aspect ratio or prompt enhancements
      const fullPrompt = `High quality, aesthetic photography: ${prompt}. Set in South African scenic background, warm lighting, vibrant colors.`;

      const response = await ai.models.generateImages({
        model: 'models/gemini-3-pro-image-preview',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        }
      });

      const generatedImage = response.generatedImages?.[0];
      if (generatedImage && generatedImage.image && generatedImage.image.imageBytes) {
        const base64Image = Buffer.from(generatedImage.image.imageBytes, 'base64').toString('base64');
        return res.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
      }

      res.status(500).json({ error: 'Image generation failed to return image bytes' });
    } catch (error: any) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: error.message || 'Image generation failed' });
    }
  });

  // --- Vite Dev Middleware ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mopani Singles running on http://localhost:${PORT}`);
  });
}

startServer();
