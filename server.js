import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// !!! VLOŽ KLÍČ SEM !!!
const API_KEY = "AIzaSyC3x7t9yKJlHvGBOfSVqVQHQR9cUGTfAq8"; 

app.use(express.json());
app.use(cors());

app.post('/api/tah', async (req, res) => {
    console.log("🕵️‍♂️ Spouštím detektiva...");

    // Místo generování textu se zeptáme na seznam modelů
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("------------------------------------------------");
        console.log("📡 ODPOVĚĎ GOOGLU (SEZNAM MODELŮ):");
        
        if (data.error) {
            console.error("❌ KRITICKÁ CHYBA ÚČTU:", JSON.stringify(data, null, 2));
            return res.json({ popis: "CHYBA ÚČTU: " + data.error.message });
        }

        if (!data.models) {
            console.error("❌ ŽÁDNÉ MODELY! Tvůj účet nemá přístup k AI.");
            return res.json({ popis: "Tvůj účet je prázdný. Žádné modely." });
        }

        // Vypíšeme všechny modely, které tento klíč vidí
        const nazvyModelu = data.models.map(m => m.name);
        console.log("✅ DOSTUPNÉ MODELY:", JSON.stringify(nazvyModelu, null, 2));
        console.log("------------------------------------------------");

        // Pošleme to do hry jako text, abys to viděl i na Vercelu
        res.json({
            popis: "DETEKTIV DOKONČEN. Podívej se do Logů na Renderu, co tento klíč vidí.",
            herni_data: {},
            možnosti: ["Zkontrolovat logy"]
        });

    } catch (error) {
        console.error("❌ CHYBA SÍTĚ:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Detektivní server běží na portu ${port}`);
});
