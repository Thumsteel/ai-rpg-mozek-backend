import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Systémové instrukce pro hru
const SYSTEM_PROMPT = `
Jsi Pán jeskyně pro temnou fantasy RPG. Hrajeme hru.
Odpovídej česky. Buď stručný a atmosférický.
DŮLEŽITÉ: Tvůj výstup musí být POUZE validní JSON objekt v tomto formátu (bez markdownu okolo):
{
  "popis": "Popis situace...",
  "herni_data": { "zmena_zdravi": 0, "nova_polozka": "" },
  "možnosti": ["Možnost 1", "Možnost 2", "Možnost 3"]
}
`;

// Jednoduchá historie chatu v paměti
let chatHistory = [];

app.post('/api/tah', async (req, res) => {
    const { akce_hrace, stav_hrace } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(`⚔️ Hráč: ${akce_hrace}`);

    // POUŽIJEME MODEL, KTERÝ JSME NAŠLI V SEZNAMU: gemini-2.0-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Pokud je to první tah, inicializujeme historii
    if (chatHistory.length === 0) {
        chatHistory.push({ role: "user", parts: [{ text: SYSTEM_PROMPT }] });
        chatHistory.push({ role: "model", parts: [{ text: "Rozumím, jsem připraven." }] });
    }

    // Přidáme zprávu uživatele
    const userMessage = `Stav: ${JSON.stringify(stav_hrace)}. Akce: "${akce_hrace}".`;
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    // Příprava dat pro Google API
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json" // Vynutíme JSON přímo od modelu
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Kontrola chyb od Google
        if (data.error) {
            console.error("❌ CHYBA GOOGLE:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // Získání textu
        const text = data.candidates[0].content.parts[0].text;
        
        // Uložení odpovědi do historie
        chatHistory.push({ role: "model", parts: [{ text: text }] });

        console.log("✅ AI Odpověděla!");

        // Odeslání JSONu klientovi
        // (Model 2.0-flash vrací krásný čistý JSON, takže ho jen pošleme dál)
        res.send(text);

    } catch (error) {
        console.error("❌ CHYBA SERVERU:", error);
        res.status(500).json({ error: "Chyba serveru." });
    }
});

app.listen(port, () => {
    console.log(`Server běží na portu ${port}`);
});
