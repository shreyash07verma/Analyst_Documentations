
import { Project, DocumentArtifact } from '../types';

const DB_NAME = 'AnalystProDB';
const DB_VERSION = 2; // Bumped version to force schema check
const STORE_NAME = 'projects';

/**
 * Initialize the IndexedDB database and object store.
 */
export const initDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported in this browser."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => resolve();

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create object store with 'id' as the key path
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

/**
 * Retrieve all projects from the database, sorted by creation date (newest first).
 * Includes hydration logic to convert stored date strings back to Date objects.
 */
export const getAllProjects = (): Promise<Project[]> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            // Check if store exists before transaction (handles edge case of very first load)
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                resolve([]);
                return;
            }

            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const rawProjects = getAllRequest.result as any[];
                
                // Hydrate Date objects
                const projects: Project[] = rawProjects.map(p => ({
                    ...p,
                    createdAt: new Date(p.createdAt),
                    documents: (p.documents || []).map((d: any) => ({
                        ...d,
                        lastUpdated: new Date(d.lastUpdated),
                        createdAt: d.createdAt ? new Date(d.createdAt) : new Date()
                    }))
                }));

                // Sort by createdAt desc
                projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                resolve(projects);
            };

            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
};

/**
 * Save or update a project in the database.
 */
export const saveProject = (project: Project): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const putRequest = store.put(project);

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };
    });
};