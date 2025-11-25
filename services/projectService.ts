
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp } from 'firebase/firestore/lite';
import { Project, DocumentArtifact } from '../types';

const COLLECTION_ROOT = 'Projects';
const SUB_COLLECTION = 'user_projects';
const ARTIFACTS_COLLECTION = 'project_artifacts';

/**
 * Save Project Metadata ONLY (excludes artifacts).
 * Path: /Projects/{uid}/user_projects/{projectId}
 */
export const saveUserProject = async (userId: string, project: Project): Promise<void> => {
    try {
        const projectRef = doc(db, COLLECTION_ROOT, userId, SUB_COLLECTION, project.id);
        
        // Destructure to separate documents from metadata
        // We do NOT want to save the 'documents' array in the parent doc anymore
        const { documents, ...projectMetadata } = project;

        const projectData = {
            ...projectMetadata,
            createdAt: Timestamp.fromDate(new Date(project.createdAt))
        };

        // Use setDoc with merge to update metadata without overwriting potential other fields
        await setDoc(projectRef, projectData, { merge: true });

    } catch (error) {
        console.error("Error saving project metadata:", error);
        throw error;
    }
};

/**
 * Save a single Artifact to the sub-collection.
 * Path: /Projects/{uid}/user_projects/{projectId}/project_artifacts/{artifactId}
 */
export const saveProjectArtifact = async (userId: string, projectId: string, artifact: DocumentArtifact): Promise<void> => {
    try {
        const artifactRef = doc(db, COLLECTION_ROOT, userId, SUB_COLLECTION, projectId, ARTIFACTS_COLLECTION, artifact.id);
        
        // Sanitize and convert dates
        const artifactData = {
            ...artifact,
            createdAt: Timestamp.fromDate(new Date(artifact.createdAt)),
            lastUpdated: Timestamp.fromDate(new Date(artifact.lastUpdated)),
            // Ensure no undefined values
            answers: artifact.answers || [],
            content: artifact.content || "",
            version: artifact.version || 1
        };

        await setDoc(artifactRef, artifactData);
        console.log(`Saved artifact to: Projects/${userId}/${SUB_COLLECTION}/${projectId}/${ARTIFACTS_COLLECTION}/${artifact.id}`);

    } catch (error) {
        console.error("Error saving project artifact:", error);
        throw error;
    }
};

/**
 * Delete a project and all its artifacts.
 */
export const deleteUserProject = async (userId: string, projectId: string): Promise<void> => {
    try {
        const projectRef = doc(db, COLLECTION_ROOT, userId, SUB_COLLECTION, projectId);
        
        // 1. Delete all artifacts in sub-collection first
        // Note: Client SDK doesn't support recursive delete of subcollections automatically.
        // We must fetch and delete them.
        const artifactsColRef = collection(db, COLLECTION_ROOT, userId, SUB_COLLECTION, projectId, ARTIFACTS_COLLECTION);
        const artifactSnaps = await getDocs(artifactsColRef);
        
        const deletePromises = artifactSnaps.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Delete the project document
        await deleteDoc(projectRef);
        
    } catch (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
};

/**
 * Fetch all projects for a user, including their sub-collection artifacts.
 */
export const getUserProjects = async (userId: string): Promise<Project[]> => {
    try {
        // 1. Fetch Project Metadata Documents
        const projectsColRef = collection(db, COLLECTION_ROOT, userId, SUB_COLLECTION);
        const projectSnaps = await getDocs(projectsColRef);

        // 2. For each project, fetch its artifacts in parallel
        const projects = await Promise.all(projectSnaps.docs.map(async (pDoc) => {
            const data = pDoc.data();
            
            // Fetch artifacts sub-collection
            const artifactsColRef = collection(pDoc.ref, ARTIFACTS_COLLECTION);
            const artifactSnaps = await getDocs(artifactsColRef);
            
            const documents: DocumentArtifact[] = artifactSnaps.docs.map(aDoc => {
                const aData = aDoc.data();
                return {
                    id: aData.id,
                    title: aData.title,
                    type: aData.type,
                    content: aData.content,
                    answers: aData.answers,
                    version: aData.version,
                    createdAt: aData.createdAt?.toDate ? aData.createdAt.toDate() : new Date(),
                    lastUpdated: aData.lastUpdated?.toDate ? aData.lastUpdated.toDate() : new Date()
                } as DocumentArtifact;
            }).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

            return {
                id: data.id,
                name: data.name || 'Untitled Project',
                description: data.description || '',
                files: data.files || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                documents: documents
            } as Project;
        }));

        return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
};