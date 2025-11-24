import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// Nepoužíváme google knihovnu, použijeme vestavěný 'fetch'

const app = express();
const port = process.env.PORT || 3000;

// !!! VLOŽ KLÍČ SEM !!!
const API_KEY = "AIzaSyC3x7t9yKJlHvGBOfSVqVQHQR9cUGTfAq8"; 

app.use(express.json());
app.use(cors());

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;
    console.log(`Hráč: ${akce_hrace}`);

    // Adresa přímo na Google API (obcházíme knihovnu)
    // Zkusíme model gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const dataToSend = {
        contents: [{
            parts: [{
                text: `Jsi Pán jeskyně RPG hry. Stav: ${JSON.stringify(stav_hrace)}. Akce: ${akce_hrace}. Odpověz česky a na konci dej validní JSON: { "popis": "text", "herni_data": {}, "možnosti": [] }`
            }]
        }]
    };

    try {
        console.log("Odesílám požadavek přímo na Google URL...");
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });

        // Přečteme odpověď
        const data = await response.json();

        // Pokud Google vrátí chybu, vypíšeme ji celou
        if (!response.ok) {
            console.error("❌ CHYBA OD GOOGLE:", JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.error.message });
        }

        // Zpracování úspěšné odpovědi
        const text = data.candidates[0].content.parts[0].text;
        console.log("✅ Google odpověděl!");

        // Jednoduché parsování JSONu
        let json_odpoved = { popis: text, herni_data: {}, možnosti: ["Pokračovat"] };
        try {
            const s = text.indexOf('{');
            const e = text.lastIndexOf('}');
            if (s !== -1) json_odpoved = JSON.parse(text.substring(s, e + 1));
        } catch (e) {}

        res.json(json_odpoved);

    } catch (error) {
        console.error("❌ CHYBA SÍTĚ:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server běží na portu ${port}`);
});
