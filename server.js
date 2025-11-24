import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// !!! SEM VLOŽ TEN KLÍČ Z NOVÉHO GMAILU (Do uvozovek) !!!
// Příklad: const API_KEY = "AIzaSyD-.......";
const API_KEY = "AIzaSyC3x7t9yKJlHvGBOfSVqVQHQR9cUGTfAq8"; 

console.log("Používám klíč (první 4 znaky):", API_KEY.substring(0, 4));

const genAI = new GoogleGenerativeAI(API_KEY);

// Zkusíme starší model 'gemini-pro', ten je nejméně problémový
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.use(express.json());
app.use(cors());

let chatHistory = [];

app.post('/api/tah', async (req, res) => {
    const { akce_hrace } = req.body;
    console.log(`Hráč: ${akce_hrace}`);

    try {
        // Jednoduchý test bez historie, jen jestli to projde
        const result = await model.generateContent(`Hraješ RPG. Hráč udělal: ${akce_hrace}. Odpověz krátce a na konci dej JSON: { "popis": "text", "herni_data": {}, "možnosti": [] }`);
        const text = result.response.text();
        
        console.log("✅ AI ODPOVĚDĚLA:", text);

        // Ošklivý hack na parsování JSONu, jen pro test
        let json_odpoved = { popis: text, herni_data: {}, možnosti: ["Funguje to!"] };
        try {
            const s = text.indexOf('{');
            const e = text.lastIndexOf('}');
            if (s !== -1) json_odpoved = JSON.parse(text.substring(s, e + 1));
        } catch(e) {}

        res.json(json_odpoved);

    } catch (error) {
        console.error("❌ CHYBA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server běží na portu ${port}`);
});
