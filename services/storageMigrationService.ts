import { collection, getDocs, query, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase.config';
import { uploadBase64Image } from './storageService';

/**
 * Migrates all base64 avatars in the users_v2 collection to Firebase Storage.
 */
export const migrateAvatarsToStorage = async (): Promise<{ success: boolean; count: number; message: string }> => {
    try {
        const usersRef = collection(db, 'users_v2');
        const snapshot = await getDocs(usersRef);
        
        let count = 0;
        let errors = 0;

        const migrationPromises = snapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const avatarUrl = userData.avatarUrl;

            // Check if it's a base64 image
            if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image')) {
                try {
                    const userId = userDoc.id;
                    const storagePath = `avatars/${userId}_migrated_${Date.now()}.jpg`;
                    const storageUrl = await uploadBase64Image(storagePath, avatarUrl);
                    
                    // Update user's avatarUrl in Firestore
                    const userDocRef = doc(db, 'users_v2', userId);
                    await updateDoc(userDocRef, {
                        avatarUrl: storageUrl,
                        updatedAt: new Date()
                    });
                    
                    count++;
                } catch (err) {
                    console.error(`Error migrating avatar for user ${userDoc.id}:`, err);
                    errors++;
                }
            }
        });

        await Promise.all(migrationPromises);

        return {
            success: true,
            count,
            message: `Migration complete! Migrated ${count} avatars.${errors > 0 ? ` Encountered ${errors} errors.` : ''}`
        };
    } catch (error) {
        console.error('Error in migrateAvatarsToStorage:', error);
        return {
            success: false,
            count: 0,
            message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
};
