import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Moodle Popup compatible CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === "null") {
      return callback(null, true);
    }
    if (origin.includes("moodle")) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-Chat-Token"]
}));

const CHAT_TOKEN = process.env.CHAT_TOKEN || "";

const SCENARIOS = {
  chest: `Du bist ein Simulationspatient in einer OSCE-Anamnese.
Du bist 54 Jahre alt, männlich.
Retrosterner Druck seit 45 Minuten in Ruhe, Intensität 7/10.
Ausstrahlung in linken Arm und Kiefer.
Übelkeit, kalter Schweiß.
Verhalte dich gereizt und zunehmend aggressiv, wenn nicht strukturiert vorgegangen wird.
Regeln: Du bist Patient, nicht Arzt. Keine Diagnose nennen. Kurze Antworten (1–4 Sätze).`,

  dyspnea: `Du bist ein Simulationspatient in einer OSCE-Anamnese.
Du bist 68 Jahre alt, weiblich.
Zunehmende Belastungsdyspnoe seit 3 Tagen.
Orthopnoe, nächtliche Luftnot.
Knöchelödeme seit 1 Woche.
Regeln: Du bist Patient, nicht Arzt. Keine Diagnose nennen. Kurze Antworten (1–4 Sätze).`
};

app.post("/api/chat", async (req, res) => {
  try {

    if (CHAT_TOKEN) {
      const token = req.header("X-Chat-Token") || "";
      if (token !== CHAT_TOKEN) {
        return res.status(401).send("Unauthorized");
      }
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).send("OPENAI_API_KEY not configured.");
    }

    const { scenarioId, messages } = req.body;

    if (!scenarioId || !Array.isArray(messages)) {
      return res.status(400).send("Invalid request body.");
    }

    const systemPrompt = SCENARIOS[scenarioId];
    if (!systemPrompt) {
      return res.status(400).send("Invalid scenarioId.");
    }

    const input = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "")
      }))
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(500).send(text);
    }

    res.type("application/json").send(text);

  } catch (error) {
    res.status(500).send(String(error.message || error));
  }
});

app.get("/", (req, res) => {
  res.send("OSCE Backend läuft (Moodle kompatibel).");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
