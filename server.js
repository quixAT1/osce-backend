import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ✅ Sauberes CORS für Moodle + Preflight
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === "null") {
      return callback(null, true);
    }
    return callback(null, true); // erlauben (optional später einschränken)
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Chat-Token"],
  credentials: false
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 🔥 Wichtig für Preflight

const CHAT_TOKEN = process.env.CHAT_TOKEN || "";

const SCENARIOS = {
  chest: `Du bist ein gereizter Patient mit akuten Brustschmerzen.
Du bist 54 Jahre alt.
Antworten kurz halten.
Keine Diagnose nennen.`,
  dyspnea: `Du bist eine 68-jährige Patientin mit zunehmender Dyspnoe.
Antworten kurz halten.
Keine Diagnose nennen.`
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

    const input = [
      { role: "system", content: SCENARIOS[scenarioId] },
      ...messages
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
  res.send("Backend läuft (Preflight OK)");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
