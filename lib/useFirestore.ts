import { useState, useEffect, useRef } from 'react';
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

export function useFirestore<T extends { id: string }>(collectionName: string, initialValue: T[], userId: string | null) {
  const [data, setData] = useState<T[]>(initialValue);
  const dataRef = useRef(data);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasMerged, setHasMerged] = useState(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!userId) {
      setData(initialValue);
      setIsInitialized(true);
      setHasMerged(false);
      return;
    }

    const path = `users/${userId}/${collectionName}`;
    const colRef = collection(db, path);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        const { uid, ...rest } = doc.data();
        items.push({ id: doc.id, ...rest } as T);
      });

      // Logic to prevent losing data on first login:
      if (items.length === 0 && !hasMerged) {
        if (dataRef.current.length === 0 && initialValue.length > 0) {
          dataRef.current = initialValue;
          setData(initialValue);
        }
      } else {
        dataRef.current = items;
        setData(items);
      }
      
      setIsInitialized(true);
      setHasMerged(true);
    }, (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('CANCELLED') || errorMessage.includes('unavailable')) {
        console.warn(`Firestore transient error (${collectionName}):`, errorMessage);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, collectionName]);

  const setValue = async (value: T[] | ((val: T[]) => T[])) => {
    if (!userId) {
      console.warn("User not authenticated, cannot save to Firestore");
      return;
    }

    const newValue = value instanceof Function ? value(dataRef.current) : value;
    dataRef.current = newValue;
    setData(newValue); // Optimistic update

    try {
      const path = `users/${userId}/${collectionName}`;
      const userPath = `users/${userId}`;
      const colRef = collection(db, path);
      
      console.log(`Syncing ${collectionName} to Firestore path: ${path}`);

      // Ensure the parent user document exists so it's visible in the console
      await setDoc(doc(db, userPath), {
        lastSync: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: userId
      }, { merge: true });
      
      const snapshot = await getDocs(colRef);
      const currentIds = new Set(snapshot.docs.map(d => d.id));
      const newIds = new Set(newValue.map(item => item.id));

      for (const id of currentIds) {
        if (!newIds.has(id)) {
          await deleteDoc(doc(db, path, id));
        }
      }

      for (const item of newValue) {
        const docRef = doc(db, path, item.id);
        const dataToSave = { ...item, uid: userId };
        delete (dataToSave as any).id;

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

  const syncToFirestore = async (targetUserId?: string) => {
    const effectiveUserId = targetUserId || userId;
    if (!effectiveUserId) return;
    
    // If we are syncing to a different user (e.g. guest), we need to use a different path
    if (targetUserId && targetUserId !== userId) {
      try {
        const path = `users/${targetUserId}/${collectionName}`;
        for (const item of data) {
          const docRef = doc(db, path, item.id);
          const dataToSave = { ...item, uid: targetUserId };
          delete (dataToSave as any).id;
          Object.keys(dataToSave).forEach(key => {
            if ((dataToSave as any)[key] === undefined) {
              delete (dataToSave as any)[key];
            }
          });
          await setDoc(docRef, dataToSave);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${targetUserId}/${collectionName}`);
      }
    } else {
      await setValue([...data]);
    }
  };

  return [data, setValue, isInitialized, syncToFirestore] as const;
}
