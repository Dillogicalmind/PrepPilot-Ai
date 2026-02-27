import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SyllabusInfo {
  sections: string[];
  sources: { title: string; uri: string }[];
}

export async function getExamSections(examName: string): Promise<SyllabusInfo> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Find the official syllabus sections or domains for the exam: "${examName}". 
  You MUST search for information ONLY from official certification bodies (e.g., ISC2, AWS, Microsoft, CompTIA) or primary course providers.
  Identify the main domains/sections of the exam.
  Return the data as a JSON object with a "sections" key containing an array of 4-6 section names.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sections: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["sections"]
      }
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map(chunk => chunk.web)
    .filter((web): web is { title: string; uri: string } => !!web?.uri) || [];

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      sections: data.sections || ["General Knowledge", "Core Concepts", "Advanced Topics", "Practice Set"],
      sources: sources.slice(0, 3) // Top 3 sources
    };
  } catch (error) {
    console.error("Failed to parse sections:", error);
    return {
      sections: ["General Knowledge", "Core Concepts", "Advanced Topics", "Practice Set"],
      sources: []
    };
  }
}

export async function generateQuestions(examName: string, count: number, section?: string): Promise<Question[]> {
  const model = "gemini-3-flash-preview";
  
  const sectionPrompt = section ? `specifically for the section "${section}"` : "";
  const prompt = `Generate ${count} multiple-choice questions for the exam: "${examName}" ${sectionPrompt}. 
  Each question must have exactly 4 options. 
  Provide the correct answer as a 0-based index.
  Include a brief explanation for the correct answer.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Exactly 4 options"
            },
            correctAnswer: { 
              type: Type.INTEGER, 
              description: "0-based index of the correct option" 
            },
            explanation: { type: Type.STRING, description: "Brief explanation" }
          },
          required: ["text", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  try {
    const questionsData = JSON.parse(response.text || "[]");
    return questionsData.map((q: any, index: number) => ({
      ...q,
      id: `q-${index}`
    }));
  } catch (error) {
    console.error("Failed to parse questions:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}
