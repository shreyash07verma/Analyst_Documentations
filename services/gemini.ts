
import { GoogleGenAI } from "@google/genai";
import { DocType, Question, Answer, ProjectFile } from '../types';
import { unzlibSync } from 'fflate';

// Helper to get a fresh client instance
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_REASONING = 'gemini-2.5-flash';
const MODEL_FAST = 'gemini-2.5-flash';
const MODEL_LITE = 'gemini-flash-lite-latest';
// const MODEL_IMAGE = 'gemini-3-pro-image-preview'; // Disabled for simulation

// Static definition of questions based on expert BA input
const STATIC_QUESTIONS: Record<string, Array<{ text: string; required: boolean }>> = {
    [DocType.BRD]: [
        { text: "What is the project title and background?", required: true },
        { text: "What is the project's business objective or need?", required: true },
        { text: "Who are the key stakeholders?", required: true },
        { text: "What is the project scope?", required: true },
        { text: "What are the project boundaries or exclusions?", required: true },
        { text: "What are the high-level business requirements?", required: true },
        { text: "What are the expected benefits and success criteria?", required: true },
        { text: "What is the estimated budget/resource allocation?", required: false },
        { text: "What is the timeline and major milestones?", required: true },
        { text: "What are the identified risks and mitigation plans?", required: false },
        { text: "Are there any assumptions or dependencies?", required: false },
        { text: "Who will provide project governance/oversight?", required: false }
    ],
    [DocType.SRS]: [
        { text: "What is the system overview and purpose?", required: true },
        { text: "What are the major functions/features required?", required: true },
        { text: "What are the workflow or business process requirements?", required: true },
        { text: "What are the data input, processing, and output specifications?", required: true },
        { text: "Are there specific interface requirements with other systems?", required: false },
        { text: "What non-functional requirements apply (e.g., performance, availability)?", required: true },
        { text: "Are there any regulatory or security requirements?", required: true },
        { text: "What are the expected user roles and their access levels?", required: true },
        { text: "What are the test/acceptance criteria for each function?", required: true }
    ],
    [DocType.USER_STORIES]: [
        { text: "Who is the user or persona?", required: true },
        { text: "What action or feature do they need?", required: true },
        { text: "Why is this feature important to the user?", required: true },
        { text: "What are the preconditions for the user story?", required: false },
        { text: "What are the specific acceptance criteria (Given/When/Then)?", required: true },
        { text: "Are there any edge cases or exceptions?", required: false },
        { text: "How will you measure if the story is done?", required: true }
    ],
    [DocType.RFP]: [
        { text: "What is the background and goal of the project?", required: true },
        { text: "What specific products/services are requested?", required: true },
        { text: "What are the mandatory requirements vendors must fulfill?", required: true },
        { text: "What is the anticipated budget range?", required: false },
        { text: "What is the desired project timeline?", required: true },
        { text: "What are the proposal submission guidelines?", required: true },
        { text: "What are the selection and evaluation criteria?", required: true },
        { text: "What references or proof of capability are requested?", required: false },
        { text: "Are there specific questions vendors must answer?", required: true }
    ],
    [DocType.RACI]: [
        { text: "What are the project tasks or deliverables?", required: true },
        { text: "Who are the key roles (Responsible, Accountable, Consulted, Informed)?", required: true },
        { text: "What is the assignment of roles to each task?", required: true },
        { text: "Are any task dependencies or sequencing needed?", required: false },
        { text: "How often will the matrix be reviewed or updated?", required: false }
    ],
    [DocType.IMPACT_ANALYSIS]: [
        { text: "What is the potential change/event being analyzed?", required: true },
        { text: "Which business processes or systems are affected?", required: true },
        { text: "What are the possible consequences for each area?", required: true },
        { text: "What is the estimated duration and severity of impact?", required: true },
        { text: "Who are the key stakeholders impacted?", required: true },
        { text: "What mitigating actions or contingency plans exist?", required: true },
        { text: "What resources are needed for recovery?", required: false },
        { text: "Are there historical incidents of similar impact?", required: false }
    ]
};

export const generateQuestionsForDoc = async (docType: string): Promise<Question[]> => {
    const rawQuestions = STATIC_QUESTIONS[docType] || [];

    if (rawQuestions.length === 0) {
        return [
            { id: 0, text: "What is the main objective of this document?", placeholder: "Describe the goal...", required: true },
            { id: 1, text: "Who are the key stakeholders?", placeholder: "List stakeholders...", required: true },
        ];
    }

    return rawQuestions.map((q, index) => ({
        id: index,
        text: q.text,
        required: q.required,
        placeholder: "Enter details here..."
    }));
};

// Decompress file logic for Gemini usage
const getDecompressedBase64 = (file: ProjectFile): string => {
    if (!file.isCompressed) return file.base64;

    try {
        const binaryString = window.atob(file.base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const decompressed = unzlibSync(bytes);
        
        // Convert Uint8Array back to Binary String for btoa
        let binary = '';
        const dLen = decompressed.byteLength;
        const chunkSize = 8192; 
        for (let i = 0; i < dLen; i+=chunkSize) {
            const chunk = decompressed.subarray(i, Math.min(i+chunkSize, dLen));
            binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        return window.btoa(binary);

    } catch (error) {
        console.error("Decompression failed for", file.name, error);
        return file.base64; // Fallback to raw if failed, though likely invalid
    }
};

export const autoAnswerQuestions = async (
    questions: Question[],
    projectContext: { name: string; description: string; files: ProjectFile[] }
): Promise<Answer[]> => {
    if (!projectContext.files || projectContext.files.length === 0) {
        return [];
    }

    const ai = getAiClient();
    const questionTextList = questions.map(q => `${q.id}. ${q.text}`).join('\n');
    const fileList = projectContext.files.map(f => `"${f.name}"`).join(', ');

    const promptText = `
        You are a smart Data Extraction Assistant.
        I have a list of questions that need to be answered to create a document for project: "${projectContext.name}".
        
        Read the attached files (${fileList}) carefully.
        For each question below, extract the answer directly from the file content if available.
        
        Rules:
        1. If you find the answer in the files, extract it and summarize it clearly.
        2. If the answer is NOT explicitly in the files, return "null" (string) or an empty string. DO NOT make up information.
        3. Return the result as a JSON object where keys are the Question IDs (numbers) and values are the extracted answers (strings).

        Questions:
        ${questionTextList}
    `;

    const parts: any[] = [];
     // Add file parts (Context)
    projectContext.files.forEach(file => {
        parts.push({
            inlineData: {
                mimeType: file.type,
                data: getDecompressedBase64(file) // Decompress before sending
            }
        });
    });
    parts.push({ text: promptText });

    try {
        const result = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: [{ role: 'user', parts: parts }],
            config: {
                responseMimeType: 'application/json'
            }
        });

        const jsonText = result.text;
        if (!jsonText) return [];

        const parsed = JSON.parse(jsonText);
        
        const answers: Answer[] = [];
        for (const q of questions) {
            const val = parsed[q.id.toString()] || parsed[q.id];
            if (val && typeof val === 'string' && val.toLowerCase() !== 'null' && val.trim() !== '') {
                answers.push({
                    questionId: q.id,
                    questionText: q.text,
                    text: val.trim()
                });
            }
        }
        return answers;

    } catch (e) {
        console.error("Auto-answer failed", e);
        return [];
    }
};

async function fetchExternalContext(projectContext: { name: string; description: string }): Promise<string> {
    const contextParts: string[] = [];
    const ai = getAiClient();

    // Google Search Grounding
    if (projectContext.name.length > 3) {
        try {
            const searchPrompt = `Perform high-level business research for this project:
            Project Name: "${projectContext.name}"
            Description: "${projectContext.description}"
            
            Identify:
            1. Key market trends or standards relevant to this domain.
            2. Common compliance or regulatory requirements (e.g., GDPR, ISO).
            3. Potential risks or competitor examples.
            
            Keep the summary concise and professional.`;

            const searchRes = await ai.models.generateContent({
                model: MODEL_FAST,
                contents: searchPrompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            if (searchRes.text) {
                contextParts.push(`### EXTERNAL RESEARCH (Google Search):\n${searchRes.text}`);
                const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (chunks?.length) {
                    const links = chunks
                        .map((c: any) => c.web?.title ? `[${c.web.title}](${c.web.uri})` : null)
                        .filter((s: any) => s)
                        .join(', ');
                    if (links) contextParts.push(`**Sources:** ${links}`);
                }
            }
        } catch (e) {
            console.warn("Search grounding error:", e);
        }
    }

    // Google Maps Grounding
    const locKeywords = ['location', 'address', 'site', 'city', 'region', 'venue', 'campus', 'logistics', 'delivery', 'store', 'facility', 'warehouse'];
    const combinedText = `${projectContext.name} ${projectContext.description}`.toLowerCase();
    
    if (locKeywords.some(k => combinedText.includes(k))) {
        try {
            const mapPrompt = `Identify the specific physical locations or geographical context mentioned in:
            "${projectContext.name} - ${projectContext.description}"
            
            Provide details on the location, nearby relevant infrastructure, or place attributes using Google Maps.`;

            const mapRes = await ai.models.generateContent({
                model: MODEL_FAST,
                contents: mapPrompt,
                config: {
                    tools: [{ googleMaps: {} }]
                }
            });

            if (mapRes.text) {
                contextParts.push(`### LOCATION DATA (Google Maps):\n${mapRes.text}`);
                const chunks = mapRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (chunks?.length) {
                    const maps = chunks
                       .map((c: any) => c.maps?.title ? `[${c.maps.title}](${c.maps.uri})` : null)
                       .filter((s: any) => s)
                       .join(', ');
                    if (maps) contextParts.push(`**Map Links:** ${maps}`);
                }
            }
        } catch (e) {
            console.warn("Maps grounding error:", e);
        }
    }

    return contextParts.join('\n\n');
}

/**
 * Strips markdown code blocks (```markdown ... ```) from the string.
 * This prevents the UI from rendering the entire document as a code block.
 */
const cleanGeminiOutput = (text: string): string => {
    if (!text) return "";
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
        // Remove start fence (e.g. ```markdown, ```md, or just ```)
        cleaned = cleaned.replace(/^```(?:markdown|md)?\s*/i, "");
        // Remove end fence
        cleaned = cleaned.replace(/\s*```$/, "");
    }
    return cleaned;
};

export const generateDocumentContent = async (
    docType: string, 
    answers: Answer[], 
    projectContext: { name: string; description: string; files: ProjectFile[] },
    onStream?: (chunk: string) => void
): Promise<string> => {
    const ai = getAiClient();
    
    let groundingContext = "";
    try {
        groundingContext = await fetchExternalContext(projectContext);
    } catch (e) {
        console.log("Grounding skipped", e);
    }

    const qaPairs = answers.map(a => `**Q: ${a.questionText}**\n**User Input:** ${a.text}`).join('\n\n');

    const fileList = projectContext.files && projectContext.files.length > 0
        ? projectContext.files.map(f => `"${f.name}"`).join(', ')
        : "None";

    const promptText = `
        ROLE:
        You are a world-class Senior Business Analyst and Strategy Consultant. You have extensive experience working at top-tier firms (like McKinsey, BCG, Accenture) and are an expert in creating professional, high-quality business documentation.

        TASK:
        Draft a professional **${docType}** for a project named "${projectContext.name}".
        
        CONTEXT:
        Project Description: "${projectContext.description}"
        Attached Files: ${fileList} (Use these files as the primary source of truth).
        
        INSTRUCTIONS:
        1. **Strictly Scope to Project:** Use the attached files and user answers as your primary knowledge base. Do not hallucinate details unrelated to this project.
        2. **Elaborate & Expand:** The user's answers below might be short or in note form. Your job is to expand them into professional, full sentences and paragraphs. Use industry-standard terminology.
        3. **Fill in Gaps:** If the user provided a high-level goal, break it down into specific objectives. If they mentioned a risk, add standard mitigation strategies. Use the uploaded files to find missing details.
        4. **Structure:** Use clear Markdown formatting. Use tables for lists, roles, or data. Use H2 (##) and H3 (###) for sections.
        5. **Grounding:** Incorporate the provided External Research and Location Data where relevant to make the document realistic and market-aware.
        6. **No Code Blocks:** Do NOT wrap the entire output in markdown code fences (like \`\`\`markdown). Output raw markdown text only.
        
        EXTERNAL DATA:
        ${groundingContext}

        USER ANSWERS (Use these to structure the doc):
        ${qaPairs}
    `;

    const parts: any[] = [];
    
    // Decompress and attach files for the generation context
    if (projectContext.files && projectContext.files.length > 0) {
         projectContext.files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: getDecompressedBase64(file)
                }
            });
        });
    }

    parts.push({ text: promptText });

    try {
        const result = await ai.models.generateContent({
            model: MODEL_REASONING,
            contents: [{ role: 'user', parts: parts }]
        });
        
        const responseText = cleanGeminiOutput(result.text || "");
        
        if (onStream && responseText) {
             onStream(responseText);
        }
        return responseText || "Error: No content generated.";
        
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
};

export const suggestAnswer = async (
    question: string,
    projectContext: { name: string; description: string }
): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        Context: I am a Business Analyst working on a project named "${projectContext.name}".
        Description: "${projectContext.description}".
        
        Task: Suggest a professional, concise answer for the following question based on the project context.
        Question: "${question}"
        
        Answer (1-2 sentences):
    `;

    try {
        const result = await ai.models.generateContent({
            model: MODEL_LITE,
            contents: prompt
        });
        return result.text || "";
    } catch (e) {
        console.error("Suggestion error", e);
        return "";
    }
};

/**
 * Refines a specific section of the document while keeping the rest untouched.
 */
export const refineDocument = async (
    fullDocContent: string,
    targetSectionHeader: string,
    userInstruction: string
): Promise<string> => {
    const ai = getAiClient();
    
    const prompt = `
        TASK:
        You are a Document Editor. I will provide a Markdown document and a specific instruction to update a single section.
        
        YOUR GOAL:
        Locate the section titled "${targetSectionHeader}".
        Rewrite ONLY this section content based on the user's instruction: "${userInstruction}".
        
        RULES:
        1. Keep the document structure exactly the same.
        2. Do NOT modify any other sections. They must remain character-for-character identical.
        3. Only output the FULL updated document (Markdown). Do NOT output chatty text.
        4. Do NOT wrap the output in markdown code blocks (e.g., \`\`\`markdown).
        
        DOCUMENT CONTENT:
        ${fullDocContent}
    `;

    try {
        const result = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt
        });
        return cleanGeminiOutput(result.text || fullDocContent);
    } catch (e) {
        console.error("Refinement error", e);
        throw e;
    }
};

/**
 * Generates a simulated image URL using placehold.co to bypass API Key requirements.
 * The actual 'gemini-3-pro-image-preview' model requires a paid API Key.
 */
export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K'): Promise<string> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Parse size string to pixels
    let width = 1024;
    let height = 576; // 16:9 Aspect Ratio

    if (size === '2K') {
        width = 2048;
        height = 1152;
    } else if (size === '4K') {
        width = 3840;
        height = 2160;
    }

    // Create a URL-safe version of the prompt for the placeholder text
    // Limit to ~30 chars to keep it readable
    const shortText = prompt.substring(0, 30).replace(/[^a-z0-9 ]/gi, '') + (prompt.length > 30 ? '...' : '');
    const encodedText = encodeURIComponent(shortText);

    // Return a dynamic placeholder image URL
    // Using placehold.co which supports custom text and colors
    return `https://placehold.co/${width}x${height}/1e293b/white?text=${encodedText}&font=montserrat`;
};
