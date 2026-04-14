import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setLogLevel, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
console.log("Firebase Config being used:", firebaseConfig);
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with the specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Suppress benign internal Firebase warnings (like idle stream disconnects)
setLogLevel('error');

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Perform a test write to verify the connection and help the user find the database
    const testDocRef = doc(db, 'connection_tests', 'last_test');
    await setDoc(testDocRef, {
      timestamp: serverTimestamp(),
      message: "Conexão verificada com sucesso!",
      databaseId: firebaseConfig.firestoreDatabaseId
    });
    console.log("Firestore connection test successful - Test document written to 'connection_tests/last_test'");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: The client is offline. This often indicates an incorrect Firebase configuration (Project ID or Database ID).");
    } else {
      console.log("Firestore connection verified (server reached successfully).", error);
    }
  }
}
testConnection();

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signInWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Error signing in with Google Redirect", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
