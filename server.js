import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// !!! SEM VLOŽ TEN KLÍČ Z NOVÉHO GMAILU !!!
const API_KEY = "AIzaSyC3x7t9yKJlHvGBOfSVqVQHQR9cUGTfAq8"; 

const genAI = new GoogleGenerativeAI(API_KEY);

// Použijeme nejrychlejší model. S novým účtem musí fungovat.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(express.json());
app.use(cors());

let chatHistory = [];

const SYSTEM_INSTRUCTIONS = `
Jsi Pán jeskyně pro temnou fantasy textovou RPG hru.
Hrajeme hru. Odpovídej česky.
Na konci každé odpovědi dej JSON v tomto formátu (nic jiného):
{
  "popis": "Tvůj popis situace",
  "herni_data": { "zmena_zdravi": 0, "nova_polozka": "" },
  "možnosti": ["Možnost A", "Možnost B"]
}
`;

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;
    console.log(`Hráč: ${akce_hrace}`);

    try {
        if (chatHistory.length === 0) {
            chatHistory = [
                { role: "user", parts: [{ text: SYSTEM_INSTRUCTIONS }] },
                { role: "model", parts: [{ text: "Rozumím." }] }
            ];
        }

        const userMessage = `Stav: ${JSON.stringify(stav_hrace)}. Akce: "${akce_hrace}".`;
        
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(userMessage);
        const text = result.response.text();

        // Parsování JSONu
        let json_odpoved;
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                json_odpoved = JSON.parse(text.substring(start, end + 1));
            } else {
                json_odpoved = { popis: text, herni_data: {}, možnosti: ["Pokračovat"] };
            }
        } catch (e) {
            json_odpoved = { popis: text, herni_data: {}, možnosti: ["Pokračovat"] };
        }

        res.json(json_odpoved);

    } catch (error) {
        console.error("CHYBA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server běží na portu ${port}`);
});
