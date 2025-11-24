import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Používáme stabilní knihovnu
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Inicializace: Používáme stabilní GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Zde definujeme model. gemini-1.5-flash zde funguje spolehlivě.
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json" 
    }
});

app.use(express.json());
app.use(cors());

// Paměť pro historii chatu
let chatHistory = [];

const SYSTEM_INSTRUCTIONS = `
Jsi Pán jeskyně pro temnou fantasy textovou RPG hru.
Tvým úkolem je popisovat situace, reagovat na příkazy hráče a udržovat herní logiku.
PRAVIDLA:
1. Vždy odpovídej výhradně v češtině.
2. Vždy popiš scénu stručně, ale atmosféricky.
3. Nikdy nepřebírej kontrolu nad hráčovou postavou.
4. Generuj validní JSON s touto strukturou:
{
  "popis": "Text popisu",
  "herni_data": { "zmena_zdravi": 0, "nova_polozka": "", "info": "" },
  "možnosti": ["Možnost 1", "Možnost 2"]
}
`;

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;

    try {
        // Pokud je historie prázdná, začneme novou konverzaci
        if (chatHistory.length === 0) {
            // V této knihovně se system prompt posílá trochu jinak, 
            // ale pro jednoduchost ho pošleme jako první zprávu uživatele.
            chatHistory.push({
                role: "user",
                parts: [{ text: `INSTRUKCE: ${SYSTEM_INSTRUCTIONS}` }]
            });
            chatHistory.push({
                role: "model",
                parts: [{ text: "Rozumím, jsem připraven hrát." }]
            });
        }

        // Připravíme zprávu hráče
        const userMessage = `Aktuální stav: ${JSON.stringify(stav_hrace)}. Moje akce: "${akce_hrace}"`;
        
        // Spustíme chat s historií
        const chat = model.startChat({
            history: chatHistory
        });

        // Odešleme zprávu a čekáme na odpověď
        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();

        // Uložíme do historie (tato knihovna to dělá v rámci objektu chat, 
        // ale my si to držíme i ručně pro jistotu restartu serveru)
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        chatHistory.push({ role: "model", parts: [{ text: text }] });

        // Zpracování JSONu
        let json_odpoved;
        try {
            json_odpoved = JSON.parse(text);
        } catch (e) {
            console.error("Chyba parsování JSON:", text);
            json_odpoved = {
                popis: text,
                herni_data: {},
                možnosti: ["Pokračovat"]
            };
        }

        res.json(json_odpoved);

    } catch (error) {
        console.error("CHYBA API:", error);
        res.status(500).json({ error: "Chyba serveru: " + error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server běží na portu ${port}`);
});
