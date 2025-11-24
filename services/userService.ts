import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, deleteUser as deleteAuthUser } from 'firebase/auth';
import { UserProfile } from '../types';

const COLLECTION_NAME = 'users';

/**
 * Ensures a user document exists in Firestore.
 * If not, creates it with default values.
 */
export const syncUserToFirestore = async (user: User, displayName?: string): Promise<UserProfile> => {
    const userRef = doc(db, COLLECTION_NAME, user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: user.uid,
            email: user.email || '',
            displayName: data.displayName || displayName || 'Business Analyst',
            position: data.position || 'Senior Business Analyst',
            createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date()
        };
    } else {
        // Create new document
        const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: displayName || user.displayName || 'Business Analyst',
            position: 'Senior Business Analyst',
            createdAt: new Date()
        };

        await setDoc(userRef, newProfile);
        return newProfile;
    }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, COLLECTION_NAME, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: uid,
            email: data.email,
            displayName: data.displayName,
            position: data.position || 'Senior Business Analyst',
            createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date()
        };
    }
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, data);
};

export const deleteUserAccount = async (user: User): Promise<void> => {
    const uid = user.uid;
    // 1. Delete from Firestore
    await deleteDoc(doc(db, COLLECTION_NAME, uid));
    
    // 2. Delete from Auth
    // Note: This requires recent login. If it fails, we might need to prompt for re-auth.
    await deleteAuthUser(user);
};