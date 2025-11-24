import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Používáme základní model gemini-pro (verze 1.0)
// Ten je nejméně náchylný k chybám s oprávněním.
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    try {
        // Inicializace chatu při prvním tahu
        if (chatHistory.length === 0) {
            chatHistory = [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_INSTRUCTIONS }]
                },
                {
                    role: "model",
                    parts: [{ text: "Rozumím. Jsem připraven vést hru a generovat JSON." }]
                }
            ];
        }

        const userMessage = `Stav hráče: ${JSON.stringify(stav_hrace)}. Akce hráče: "${akce_hrace}". (Nezapomeň na JSON)`;

        const chat = model.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();

        // Uložení historie
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        chatHistory.push({ role: "model", parts: [{ text: text }] });

        // Extrakce JSONu z odpovědi (gemini-pro někdy kecá okolo, musíme najít jen JSON)
        let json_odpoved;
        try {
            // Najdeme první '{' a poslední '}'
            const jsonStartIndex = text.indexOf('{');
            const jsonEndIndex = text.lastIndexOf('}');
            
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = text.substring(jsonStartIndex, jsonEndIndex + 1);
                json_odpoved = JSON.parse(jsonString);
            } else {
                throw new Error("JSON nenalezen");
            }
        } catch (e) {
            console.error("Chyba parsování:", text);
            json_odpoved = {
                popis: text, // Prostě vrátíme celý text, když se JSON nepovede
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
