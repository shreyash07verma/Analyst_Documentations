export enum DocType {
    RFP = 'Request for Proposal (RFP)',
    BRD = 'Business Requirement Document (BRD)',
    SRS = 'Software Requirements Specification (SRS)',
    RACI = 'RACI Matrix',
    PUGH = 'Pugh Matrix',
    USER_STORIES = 'User Stories & Acceptance Criteria',
    CUSTOM = 'Custom Document'
}

export interface Template {
    id: string;
    name: string;
    description: string;
    iconName: string;
    type: DocType;
}

export interface Question {
    id: number;
    text: string;
    placeholder?: string;
    required?: boolean;
}

export interface Answer {
    questionId: number;
    questionText: string;
    text: string;
}

export type AppStep = 'dashboard' | 'generating-questions' | 'interview' | 'generating-doc' | 'preview';

export interface GeneratedDocument {
    title: string;
    content: string; // Markdown content
}