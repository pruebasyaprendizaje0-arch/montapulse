import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.config';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param path The path in the storage bucket (e.g., 'avatars/userId.jpg')
 * @param file The file to upload (Blob or File)
 * @returns The download URL of the uploaded file
 */
export const uploadFile = async (path: string, file: Blob | File): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};

/**
 * Uploads a base64 image to Firebase Storage and returns the download URL.
 * @param path The path in the storage bucket
 * @param base64 The base64 string
 * @returns The download URL of the uploaded file
 */
export const uploadBase64Image = async (path: string, base64: string): Promise<string> => {
    // Convert base64 to Blob
    const response = await fetch(base64);
    const blob = await response.blob();
    return uploadFile(path, blob);
};
