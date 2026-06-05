import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Access your API key as an environment variable (see "Set up your API key" above)
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateCourseSummary(courseTitle: string, description: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert curriculum designer. Please provide a brief 2-paragraph summary and 3 key learning objectives for a course titled "${courseTitle}". Description: ${description}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return text;
}
