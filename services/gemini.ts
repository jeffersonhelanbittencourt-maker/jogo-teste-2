import { GoogleGenAI, Type } from "@google/genai";

// Inicialização segura usando a chave de ambiente
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLore = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Você é um bardo historiador de Arton, o mundo de Tormenta 20. 
               Gere uma lenda, descrição de NPC ou detalhes de local baseados em: ${prompt}. 
               Seja imersivo e use termos do cenário (Deuses, reinos de Arton, etc). 
               O texto deve ser em Português brasileiro.`,
  });
  return response.text;
};

export const generateMonster = async (concept: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Gere uma ameaça (monstro/inimigo) para Tormenta 20 baseada no conceito: ${concept}. 
               Calcule as estatísticas seguindo as regras de criação de ameaças do T20.
               Retorne um JSON com nome, descrição, ND (Nível de Desafio), HP sugerido, Defesa e um resumo de ataques.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          threatLevel: { type: Type.STRING },
          suggestedHP: { type: Type.NUMBER },
          suggestedDefense: { type: Type.NUMBER },
          attacks: { type: Type.STRING }
        },
        required: ["name", "description", "threatLevel", "suggestedHP", "suggestedDefense", "attacks"]
      }
    }
  });
  
  const text = response.text || "{}";
  return JSON.parse(text.trim());
};
