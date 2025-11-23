
import { GoogleGenAI } from "@google/genai";
import { DocType, Question, Answer, ProjectFile } from '../types';

// Initialize API client
// The API key MUST be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_REASONING = 'gemini-3-pro-preview'; // Upgraded for complex text generation
const MODEL_FAST = 'gemini-2.5-flash'; // For Grounding tools
const MODEL_LITE = 'gemini-flash-lite-latest'; // For low-latency suggestions

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
    // Look up questions from the static map.
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

/**
 * Perform external research using Gemini Grounding (Search & Maps)
 * to enrich the project context before generation.
 */
async function fetchExternalContext(projectContext: { name: string; description: string }): Promise<string> {
    const contextParts: string[] = [];

    // 1. Google Search Grounding
    // We search for broad market context if we have a valid project name
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
                model: MODEL_FAST, // gemini-2.5-flash for tools
                contents: searchPrompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            if (searchRes.text) {
                contextParts.push(`### EXTERNAL RESEARCH (Google Search):\n${searchRes.text}`);
                
                // Append sources if available
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

    // 2. Google Maps Grounding
    // Trigger only if location-specific keywords are found in the project context
    const locKeywords = ['location', 'address', 'site', 'city', 'region', 'venue', 'campus', 'logistics', 'delivery', 'store', 'facility', 'warehouse'];
    const combinedText = `${projectContext.name} ${projectContext.description}`.toLowerCase();
    
    if (locKeywords.some(k => combinedText.includes(k))) {
        try {
            const mapPrompt = `Identify the specific physical locations or geographical context mentioned in:
            "${projectContext.name} - ${projectContext.description}"
            
            Provide details on the location, nearby relevant infrastructure, or place attributes using Google Maps.`;

            const mapRes = await ai.models.generateContent({
                model: MODEL_FAST, // gemini-2.5-flash for tools
                contents: mapPrompt,
                config: {
                    tools: [{ googleMaps: {} }]
                }
            });

            if (mapRes.text) {
                contextParts.push(`### LOCATION DATA (Google Maps):\n${mapRes.text}`);
                
                // Append map links if available
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

export const generateDocumentContent = async (
    docType: string, 
    answers: Answer[], 
    projectContext: { name: string; description: string; files: ProjectFile[] },
    onStream?: (chunk: string) => void
): Promise<string> => {
    
    // Step 1: Gather External Context (Grounding)
    // We assume the user might want external data validation.
    let groundingContext = "";
    try {
        groundingContext = await fetchExternalContext(projectContext);
    } catch (e) {
        console.log("Grounding skipped", e);
    }

    const qaPairs = answers.map(a => `**Q: ${a.questionText}**\n**User Input:** ${a.text}`).join('\n\n');

    // Create prompt content
    const promptText = `
        ROLE:
        You are a world-class Senior Business Analyst and Strategy Consultant. You have extensive experience working with Fortune 500 clients.
        You are tasked with drafting a high-quality, comprehensive "${docType}" for a client project.

        PROJECT CONTEXT:
        Project Name: ${projectContext.name}
        Project Description: ${projectContext.description}

        EXTERNAL RESEARCH & GROUNDING DATA (Real-time Google Data):
        ${groundingContext}
        *Instruction*: Use the above external data to validate assumptions, provide accurate market context, or cite regulations. If the external data is not relevant to the specific user answers, prioritize the user input.

        USER INTERVIEW ANSWERS:
        ${qaPairs}

        CRITICAL INSTRUCTIONS FOR CONTENT GENERATION:
        1. **Elaborate & Expand**: The user inputs are shorthand. You MUST expand them into professional, detailed paragraphs.
           - If user says "Admin needs to ban users", you write: "The System Administrator shall have the capability to suspend or permanently ban user accounts that violate terms of service. This action must be logged for audit purposes, and an automated email notification should be sent to the affected user."
        
        2. **Use Reference Documents**: I have attached Project Reference Documents (PDFs/Text) to this request. 
           - **YOU MUST** analyze these documents to extract specific terminology, architectural details, existing constraints, and business goals.
           - Incorporate this extracted information seamlessly into the generated document.
           - If the user answer contradicts the reference doc, prioritize the user's latest answer but note the deviation if critical.
        
        3. **Standard Sections & Best Practices**:
           - Even if not explicitly asked, include standard sections relevant to a "${docType}" (e.g., Assumptions, Dependencies, Compliance/Regulatory, Glossary).
           - For **Stakeholders**: If the user lists "Marketing", expand to roles like "CMO, Brand Manager, Social Media Lead".
           - For **Requirements**: Translate high-level needs into **SMART** criteria (Specific, Measurable, Achievable, Relevant, Time-bound).
        
        4. **Tone & Formatting**:
           - Use professional, objective, consultative tone.
           - Use Markdown headers (#, ##), tables for structured data, and bullet points.
           - NO conversational filler. Start with the Title.

        Analyze the attached files, grounding data, and user answers now to generate the best possible "${docType}".
    `;

    // Construct the parts for the model
    const parts: any[] = [];
    
    // Add file parts (Context)
    if (projectContext.files && projectContext.files.length > 0) {
        projectContext.files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: file.base64
                }
            });
        });
    }

    // Add text prompt
    parts.push({ text: promptText });

    let fullText = "";

    try {
        const streamResult = await ai.models.generateContentStream({
            model: MODEL_REASONING,
            contents: [{ role: 'user', parts: parts }],
            config: {
                thinkingConfig: {
                    thinkingBudget: 32768, 
                }
            }
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

// Helper for 'Magic Wand' suggestions 
export const suggestAnswer = async (
    question: string, 
    projectContext: { name: string; description: string }
): Promise<string> => {
    const prompt = `
        Context: Project "${projectContext.name}" - ${projectContext.description}.
        Question: "${question}"
        
        Provide a professional, realistic, and specific answer to this question that a Business Analyst would write for this project. 
        Keep it concise (1-2 sentences).
    `;
    
    try {
        // Use Flash-Lite for low latency
        const result = await ai.models.generateContent({
            model: MODEL_LITE,
            contents: prompt
        });
        return result.text || "";
    } catch (e) {
        return "To be determined based on stakeholder feedback.";
    }
};
