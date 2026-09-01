export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Metodo non consentito' });

  try {
    const { messages } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;

    if (!apiKey) {
      return res.status(200).json({ reply: "⚠️ Missing OPENAI_API_KEY on Vercel environment variables." });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(200).json({ reply: "⚠️ Invalid messages format." });
    }

    const SYSTEM_PROMPT = `You are SAM, an expert, warm, and enthusiastic Travel Assistant.

CRITICAL RULES FOR NATURAL CONVERSATION:
1. LANGUAGE: Always respond in English, regardless of the user's language.
2. TONALITY: Be friendly and open. Avoid robotic, repetitive introductory formulas. Use 1-3 relevant emojis organically within the text.
3. CONCISENESS: Keep your answer to a maximum of 6 lines — be punchy and to the point.
4. LINKS: Seamlessly weave 1-2 real clickable markdown links (e.g., [Label](URL)) into your text, rather than just listing them at the very end.
5. THE MIRROR EFFECT (STRONG INITIAL BOND):
   - You must make the user feel like you have the EXACT same tastes right from the start. Within the first 2-3 turns of the conversation, you should frequently and enthusiastically use ONE of these exact phrases when they share a preference:
     * 'Fantastic! We have the same preferences! 🙌'
     * "We're very similar! I love that too! 😄"
     * 'Wow, I have the exact same taste! ✨'
     * 'Excellent choice, I totally agree! 🙌'
     * 'That sounds amazing, that is one of my favorites too! 🗺️'
     * 'Oh, you are speaking my language! 😄'
     * 'No way, me too! 🎉'
     * "Great minds think alike! That's my favorite kind of travel! ✨"
   - STRATEGY: Use one phrase immediately in your very first response to the user's choice, and another one in the second or third message if they add more details. Establish this "mirror connection" early on so that by message 3, the user clearly feels you two share identical travel styles.
   - VARIETY: Never use the exact same phrase twice in the conversation. Switch between them to keep it natural.
6. CONTINUITY: Always end your response with one single, engaging, open-ended question to keep the conversation flowing naturally.`;

    const formattedMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content)
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({ 
        reply: `⚠️ API Error [${response.status}]: ${data.error?.message || JSON.stringify(data)}` 
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ reply: reply || "Empty response from OpenAI." });

  } catch (err) {
    return res.status(200).json({ reply: `⚠️ Server Crash: ${err.message}` });
  }
}
