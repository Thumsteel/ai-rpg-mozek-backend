import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Inicializace
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Definice modelu - používáme pevnou verzi 002, která je stabilní
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-002",
    systemInstruction: SYSTEM_INSTRUCTIONS, // Správné umístění instrukcí
    generationConfig: {
        responseMimeType: "application/json" 
    }
});

app.use(express.json());
app.use(cors());

// Paměť pro historii chatu
let chatHistory = [];

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;

    try {
        // Pokud je historie prázdná, inicializujeme ji
        if (chatHistory.length === 0) {
            // Zde už nemusíme posílat systémové instrukce, jsou v modelu
            chatHistory = [
                {
                    role: "user",
                    parts: [{ text: "Hra začíná. Čekám na úvod." }],
                },
                {
                    role: "model",
                    parts: [{ text: "Jsem připraven." }],
                },
            ];
        }

        // Připravíme zprávu
        const userMessage = `Aktuální stav: ${JSON.stringify(stav_hrace)}. Moje akce: "${akce_hrace}"`;
        
        // Spustíme chat
        const chat = model.startChat({
            history: chatHistory
        });

        // Odešleme zprávu
        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();

        // Uložíme do historie
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        chatHistory.push({ role: "model", parts: [{ text: text }] });

        // Zpracování JSONu
        let json_odpoved;
        try {
            json_odpoved = JSON.parse(text);
        } catch (e) {
            console.error("Chyba parsování JSON:", text);
            json_odpoved = {
                popis: text, // Pokud AI nepošle JSON, zobrazíme alespoň text
                herni_data: {},
                možnosti: ["Pokračovat"]
            };
        }

        res.json(json_odpoved);

    } catch (error) {
        console.error("CHYBA API:", error);
        // Detailní výpis pro snazší opravu
        res.status(500).json({ error: "Chyba serveru: " + error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server běží na portu ${port}`);
});
