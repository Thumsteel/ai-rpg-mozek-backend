// server.js
import 'dotenv/config'; // Načte .env soubor (na Renderu ho nahradí proměnná prostředí)
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors'; // Abychom povolili komunikaci s Vercel frontendem

const app = express();
// Port 3000 je standardní, Render si ho automaticky změní na správný.
const port = 3000; 

// --- Inicializace Gemini ---
// Klíč GEMINI_API_KEY se automaticky načte z nastavení Renderu
const ai = new GoogleGenAI({}); 

// Povolí JSON v požadavcích a CORS pro komunikaci s frontendem
app.use(express.json());
// Povolíme komunikaci z jakékoliv domény. Můžeme to později omezit na Vercel URL.
app.use(cors()); 

// V tomto jednoduchém příkladu ukládáme historii globálně
let history = []; 

// --- SYSTÉMOVÉ INSTRUKCE (TVŮJ AI MOZEK) ---
// Můžeš zde měnit pravidla a styl, jakým AI odpovídá!
const SYSTEM_INSTRUCTIONS = `
Jsi Pán jeskyně pro temnou fantasy textovou RPG hru.
Tvým úkolem je popisovat situace, reagovat na příkazy hráče a udržovat herní logiku.
PRAVIDLA:
1. Vždy odpovídej **výhradně v češtině**.
2. Vždy popiš scénu stručně, ale atmosféricky, na základě akce hráče a kontextu.
3. Nikdy nepřebírej kontrolu nad hráčovou postavou.
4. VÝSTUP MUSÍ BÝT VŽDY VALIDNÍ JSON objekt.
`;

// --- API ENDPOINT PRO HRU (KAM BUDE VOLAT VERCEL) ---
app.post('/api/tah', async (req, res) => {
    // Získáme data, která poslal Vercel frontend
    const { akce_hrace, stav_hrace } = req.body; 

    // Při prvním tahu přidáme systémové instrukce do historie
    if (history.length === 0) {
        history.push({
            role: "system",
            parts: [{ text: SYSTEM_INSTRUCTIONS }]
        });
    }

    // Přidáme aktuální tah hráče do historie
    history.push({
        role: "user",
        parts: [{ text: `Aktuální stav: ${JSON.stringify(stav_hrace)}. Moje akce: "${akce_hrace}"` }]
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Rychlý model pro chat/RPG
            contents: history,
            config: {
                // Inst
