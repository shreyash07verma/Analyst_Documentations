import { GoogleGenAI, Type } from "@google/genai";
import { DocType, Question, Answer } from '../types';

// Initialize API client
// The API key MUST be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';
const MODEL_REASONING = 'gemini-2.5-flash'; // Using flash for speed, but could be pro for complex docs

export const generateQuestionsForDoc = async (docType: string, customTopic?: string): Promise<Question[]> => {
    const topic = docType === DocType.CUSTOM ? customTopic : docType;
    
    const prompt = `
        I am a Business Analyst. I need to create a comprehensive "${topic}". 
        Generate a list of 7-10 strategic, open-ended questions that I should ask a stakeholder to gather all necessary information to write this document.
        The questions should cover the purpose, scope, key requirements, stakeholders, and success metrics.
        
        CRITICAL INSTRUCTION:
        Mark the most important, fundamental questions (like objective, scope, main requirements) as 'required' (true). 
        Mark secondary, detail-oriented, or optional context questions as 'required' (false).
        
        Return ONLY a JSON array of objects.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            required: { type: Type.BOOLEAN }
                        },
                        required: ["text", "required"]
                    }
                }
            }
        });

        const questionsText = response.text;
        if (!questionsText) return [];

        const parsedQuestions: Array<{text: string, required: boolean}> = JSON.parse(questionsText);
        
        return parsedQuestions.map((q, index) => ({
            id: index,
            text: q.text,
            required: q.required,
            placeholder: "Enter details here..."
        }));

    } catch (error) {
        console.error("Error generating questions:", error);
        // Fallback questions if API fails
        return [
            { id: 0, text: "What is the main objective of this document?", placeholder: "Describe the goal...", required: true },
            { id: 1, text: "Who are the key stakeholders?", placeholder: "List stakeholders...", required: true },
            { id: 2, text: "What are the specific requirements?", placeholder: "List requirements...", required: true },
            { id: 3, text: "Any additional constraints?", placeholder: "Budget, timeline, etc...", required: false }
        ];
    }
};

export const generateDocumentContent = async (
    docType: string, 
    answers: Answer[], 
    customTopic?: string,
    onStream?: (chunk: string) => void
): Promise<string> => {
    const topic = docType === DocType.CUSTOM ? customTopic : docType;

    const qaPairs = answers.map(a => `**Q: ${a.questionText}**\nA: ${a.text}`).join('\n\n');

    const prompt = `
        You are an expert Senior Business Analyst. 
        Write a professional, fully formatted "${topic}" based on the following stakeholder interview answers.
        
        STAKEHOLDER INTERVIEW:
        ${qaPairs}

        INSTRUCTIONS:
        1. Use professional business language.
        2. Structure the document with clear headings (Markdown #, ##, ###), bullet points, and tables where appropriate.
        3. If information is missing for a standard section of this document type, make reasonable professional assumptions or leave a placeholder like "[Details to be provided]".
        4. The output must be pure Markdown.
        5. Ensure the tone is formal and objective.
    `;

    let fullText = "";

    try {
        const streamResult = await ai.models.generateContentStream({
            model: MODEL_REASONING,
            contents: prompt,
        });

        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                if (onStream) {
                    onStream(fullText);
                }
            }
        }
    } catch (error) {
        console.error("Error generating document:", error);
        throw new Error("Failed to generate document.");
    }

    return fullText;
};