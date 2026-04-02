import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirestore<T extends { id: string }>(collectionName: string, initialValue: T[]) {
  const [data, setData] = useState<T[]>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      if (!user) {
        setData(initialValue);
        setIsInitialized(true);
      }
    });
    return () => unsubscribeAuth();
  }, [initialValue]);

  useEffect(() => {
    if (!userId) return;

    const path = `users/${userId}/${collectionName}`;
    const colRef = collection(db, path);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        // Strip out the uid we added for security rules before returning to the app
        const { uid, ...rest } = doc.data();
        items.push({ id: doc.id, ...rest } as T);
      });
      setData(items);
      setIsInitialized(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [userId, collectionName]);

  const setValue = async (value: T[] | ((val: T[]) => T[])) => {
    if (!userId) {
      console.warn("User not authenticated, cannot save to Firestore");
      return;
    }

    const newValue = value instanceof Function ? value(data) : value;
    setData(newValue); // Optimistic update

    try {
      const path = `users/${userId}/${collectionName}`;
      
      // We need to figure out what changed.
      // For simplicity in this generic hook, we'll sync the whole array.
      const colRef = collection(db, path);
      
      // Get current docs to find what to delete
      const snapshot = await getDocs(colRef);
      const currentIds = new Set(snapshot.docs.map(d => d.id));
      const newIds = new Set(newValue.map(item => item.id));

      // Delete removed items
      for (const id of currentIds) {
        if (!newIds.has(id)) {
          await deleteDoc(doc(db, path, id));
        }
      }

      // Add/Update items
      for (const item of newValue) {
        const docRef = doc(db, path, item.id);
        // Add uid for security rules
        const dataToSave = { ...item, uid: userId };
        // Remove id from the document body since it's the document key
        delete (dataToSave as any).id;

        // Strip undefined values to prevent Firestore errors
        Object.keys(dataToSave).forEach(key => {
          if ((dataToSave as any)[key] === undefined) {
            delete (dataToSave as any)[key];
          }
        });

        await setDoc(docRef, dataToSave);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/${collectionName}`);
    }
  };

  return [data, setValue, isInitialized] as const;
}
