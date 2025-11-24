import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai'; // <--- TADY JE ZMĚNA (smazal jsem SchemaType)
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Inicializace Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json());
app.use(cors());

let history = [];

const SYSTEM_INSTRUCTIONS = `
Jsi Pán jeskyně pro temnou fantasy textovou RPG hru.
Tvým úkolem je popisovat situace, reagovat na příkazy hráče a udržovat herní logiku.
PRAVIDLA:
1. Vždy odpovídej výhradně v češtině.
2. Vždy popiš scénu stručně, ale atmosféricky.
3. Nikdy nepřebírej kontrolu nad hráčovou postavou.
4. Generuj validní JSON.
`;

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;

    if (history.length === 0) {
        history.push({
            role: "system",
            parts: [{ text: SYSTEM_INSTRUCTIONS }]
        });
    }

    history.push({
        role: "user",
        parts: [{ text: `Aktuální stav: ${JSON.stringify(stav_hrace)}. Moje akce: "${akce_hrace}"` }]
    });

    try {
        const response = await ai.models.generateContent({
            model:'gemini-2.0-flash-exp',
            contents: history,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT", // Používáme text místo SchemaType.OBJECT
                    properties: {
                        popis: { type: "STRING" },
                        herni_data: { 
                            type: "OBJECT",
                            properties: {
                                zmena_zdravi: { type: "INTEGER" },
                                nova_polozka: { type: "STRING" },
                                info: { type: "STRING" }
                            }
                        },
                        možnosti: { 
                            type: "ARRAY", 
                            items: { type: "STRING" } 
                        }
                    }
                }
            }
        });

        const ai_text = response.text().trim();
        let json_odpoved;

        try {
            json_odpoved = JSON.parse(ai_text);
        } catch (e) {
            console.error("Gemini vrátil nevalidní JSON:", ai_text);
            json_odpoved = { 
                popis: ai_text, 
                herni_data: {}, 
                možnosti: ["Zkusit to znovu"] 
            };
        }

        history.push({ role: "model", parts: [{ text: ai_text }] });
        res.json(json_odpoved);

    } catch (error) {
        console.error("Chyba:", error);
        res.status(500).json({ error: "Interní chyba serveru: " + error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server běží na portu ${port}`);
});
