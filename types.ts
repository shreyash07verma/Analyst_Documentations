
import type { User } from 'firebase/auth';

export enum DocType {
    RFP = 'Request for Proposal (RFP)',
    BRD = 'Business Requirement Document (BRD)',
    SRS = 'Software Requirements Specification (SRS)',
    RACI = 'RACI Matrix',
    USER_STORIES = 'User Stories & Acceptance Criteria',
    IMPACT_ANALYSIS = 'Impact Analysis'
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

export interface DocumentArtifact {
    id: string;
    title: string;
    type: DocType;
    content: string;
    answers: Answer[];
    version: number;
    lastUpdated: Date;
    createdAt: Date;
}

export interface ProjectFile {
    name: string;
    type: string;
    base64: string; // Base64 encoded content (compressed or raw)
    size: number; // Original size
    isCompressed?: boolean; // Flag to indicate if base64 is zlib compressed
}

export interface Project {
    id: string;
    name: string;
    description: string;
    documents: DocumentArtifact[];
    files: ProjectFile[]; // Reference documents uploaded by user
    createdAt: Date;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    position: string;
    createdAt: Date;
}

export type AppView = 
    | 'PROJECTS_LIST' 
    | 'PROJECT_DETAILS' 
    | 'TEMPLATE_SELECT' 
    | 'GENERATING_QUESTIONS' 
    | 'INTERVIEW' 
    | 'GENERATING_DOC' 
    | 'PREVIEW';

export interface GeneratedDocument {
    title: string;
    content: string; 
}
