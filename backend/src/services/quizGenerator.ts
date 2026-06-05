import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateQuizFromContent(moduleTitle: string, content: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
    You are an expert educational assessment designer. 
    Based on the following learning content, generate a multiple-choice quiz.
    
    Content Title: "${moduleTitle}"
    Content: "${content}"
    
    Return exactly 3 questions in JSON format. Each question must have:
    - "text": The question string
    - "options": An array of 4 strings
    - "correctAnswer": The index (0-3) of the correct option
    
    JSON structure:
    {
      "title": "Quiz for ${moduleTitle}",
      "questions": [
        { "text": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0 },
        ...
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}
