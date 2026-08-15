// Direct Gemini API client — avoids Base44 integration credits by using
// the project's own Google AI Studio API key.

const GEMINI_API_KEY = "AIzaSyAePaG4mVzo1SdAqayB6wHBiJmL-FwFDTU";
const GEMINI_MODEL = "gemini-flash-latest";

/**
 * Call Gemini directly via the REST API.
 * @param {Object} opts
 * @param {string} opts.prompt - The user's message
 * @param {string} [opts.systemInstruction] - System prompt / context
 * @param {Array<{role:string,content:string}>} [opts.history] - Prior messages
 * @param {boolean} [opts.useSearch] - Enable Google Search grounding
 * @returns {Promise<string>} The generated text
 */
export async function askGemini({ prompt, systemInstruction, history = [], useSearch = false }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const contents = [
    ...history.map(h => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const body = {
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
  return text || "I couldn't generate a response. Please try again.";
}

// Vision: analyze an image (base64) and return structured JSON
export async function askGeminiVision({ prompt, imageBase64, mimeType = "image/jpeg", responseSchema }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { data: imageBase64, mimeType } },
      ],
    }],
    // Low temperature: this extracts factual dates/names from an image, so we
    // want the same screenshot to produce the same result every time rather
    // than occasionally drifting to a different date for the same entry.
    generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" },
  };
  if (responseSchema) body.generationConfig.responseSchema = responseSchema;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini Vision error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
  try { return JSON.parse(text); } catch { return { events: [] }; }
}

// Image generation via Gemini (no integration credits)
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
export async function generateImageGemini({ prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.9 },
  };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini Image error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData);
  if (!img) throw new Error("No image generated");
  return { base64: img.inlineData.data, mimeType: img.inlineData.mimeType || "image/png" };
}