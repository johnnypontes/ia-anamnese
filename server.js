import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));

// Créditos em memória (por usuário)
const users = {
  admin: { name: "Dr. Admin", credits: 50, history: [] }
};

// Processar áudio e gerar anamnese
app.post("/api/analyze-audio", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
  }

  const { audioData, mimeType, prompt } = req.body;
  if (!audioData || !mimeType || !prompt) {
    return res.status(400).json({ error: "Dados incompletos: audioData, mimeType e prompt são obrigatórios." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioData } },
          { text: prompt + "\n\nRetorne obrigatoriamente um JSON válido com dois blocos:\n1. Todos os campos clínicos estruturados da anamnese.\n2. Um campo 'transcricao' com o texto bruto da conversa organizado por fala, exatamente assim:\n\"Médico: [fala]\\nPaciente: [fala]\\nMédico: [fala]...\"\nNão omita nenhuma informação mencionada no áudio. Se algo não couber nos campos estruturados, coloque na transcrição." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    res.json({ text: response.text });
  } catch (err) {
    console.error("[GEMINI ERROR]", err);
    res.status(500).json({ error: err.message || "Erro ao processar áudio." });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  const configured = !!process.env.GEMINI_API_KEY;
  res.json({ status: configured ? "ready" : "pending_config", serverKeyConfigured: configured });
});

// Créditos
app.get("/api/user/credits", (req, res) => {
  const userId = req.query.userId || "admin";
  const user = users[userId];
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json({ credits: user.credits });
});

// Registrar uso
app.post("/api/user/usage", (req, res) => {
  const { userId = "admin", patientName } = req.body;
  const user = users[userId];
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  if (patientName !== "HealthCheck") {
    user.credits -= 1;
    user.history.push({ date: new Date(), patient: patientName });
  }
  res.json({ success: true, remainingCredits: user.credits });
});

// Servir frontend em produção
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "✅ configurada" : "❌ ausente"}`);
});
