import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// !!! ZDE VLOŽ SVŮJ KLÍČ DO UVOZOVEK !!!
// Pokud to s ním nepůjde, je klíč/projekt rozbitý.
const API_KEY = "AIzaSyDQxG-dHvWZTJBpf9lRvw2paZ-9oZJG-Z8"; 

const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(cors());

// Seznam modelů, které zkusíme jeden po druhém
const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-pro",
    "gemini-1.0-pro"
];

let chatHistory = [];

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;
    console.log(`Hráč: ${akce_hrace}`);

    let responseText = null;
    let usedModel = "";

    // ZKUSÍME VŠECHNY MODELY V SMYČCE
    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🔄 Zkouším model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // Jednoduchý test bez historie a složitostí, jen aby to prošlo
            const prompt = `Jsi vypravěč RPG hry. Hráč udělal: "${akce_hrace}". Odpověz krátce česky a na konec dej validní JSON: { "popis": "text", "herni_data": {}, "možnosti": [] }`;
            
            const result = await model.generateContent(prompt);
            responseText = result.response.text();
            
            usedModel = modelName;
            console.log(`✅ ÚSPĚCH! Model ${modelName} funguje!`);
            break; // Vyskočíme ze smyčky, máme vítěze
        } catch (error) {
            console.error(`❌ Model ${modelName} selhal (Chyba 404/400). Jdu na další.`);
        }
    }

    if (!responseText) {
        console.error("💀 VŠECHNY MODELY SELHALY.");
        return res.status(500).json({ error: "FATÁLNÍ CHYBA: Tvůj API klíč nemá přístup k žádnému modelu. Zkontroluj Google Cloud Console." });
    }

    // Zpracování odpovědi (pokud nějaká prošla)
    let json_odpoved;
    try {
        const start = responseText.indexOf('{');
        const end = responseText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            json_odpoved = JSON.parse(responseText.substring(start, end + 1));
        } else {
            json_odpoved = { popis: responseText, herni_data: {}, možnosti: ["Pokračovat"] };
        }
    } catch (e) {
        json_odpoved = { popis: responseText, herni_data: {}, možnosti: ["Pokračovat"] };
    }

    // Přidáme info o modelu pro debug
    json_odpoved.debug_info = `Vygenerováno modelem: ${usedModel}`;
    
    res.json(json_odpoved);
});

app.listen(port, () => {
    console.log(`Server běží na portu ${port}`);
});
