import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getDatabase, ref, set, get, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBQ8bWb3Ffl8XFZ47RYwl8Wxkt63xa-3wo",
  authDomain: "qodirs-ai.firebaseapp.com",
  projectId: "qodirs-ai",
  databaseURL: "https://qodirs-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "qodirs-ai.firebasestorage.app",
  messagingSenderId: "522582389440",
  appId: "1:522582389440:web:0a76f47e392df9ba9cb325",
  measurementId: "G-T25XEPBWL9"
};

let app;
let auth;
let db;

try {
  const apps = getApps();
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getDatabase(app);
} catch (error) {
  console.error("Gagal inisialisasi Firebase:", error);
}

export { auth, db };

// Google Sign-In
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// Register with Email
export async function registerWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  await updateProfile(user, { displayName });
  return auth.currentUser; // return the updated profile user
}

// Login with Email
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Logout
export async function logoutFirebase() {
  await signOut(auth);
}

// Password Reset Email
export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Update User Profile (Name & Photo)
export async function updateUserProfile(displayName, photoURL) {
  if (!auth.currentUser) throw new Error('Tidak ada pengguna yang masuk.');
  await updateProfile(auth.currentUser, { displayName, photoURL });
  return auth.currentUser;
}

// Upload Data Backup to Realtime Database
export async function uploadBackupToDatabase(uid, data) {
  if (!db) throw new Error('Realtime Database belum diinisialisasi.');
  const userRef = ref(db, `users/${uid}`);
  
  // Clean data to prevent undefined errors in Firebase
  const cleanData = {
    memexCards: data.memexCards || [],
    habits: data.habits || [],
    scripts: data.scripts || [],
    socialPosts: data.socialPosts || [],
    counters: data.counters || [],
    activityLog: data.activityLog || [],
    history: data.history || [],
    sukiKnowledge: data.sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
    memexChats: data.memexChats || [],
  };

  await set(userRef, {
    ...cleanData,
    updatedAt: new Date().toISOString()
  });
}

// Download Data Backup from Realtime Database
export async function downloadBackupFromDatabase(uid) {
  if (!db) throw new Error('Realtime Database belum diinisialisasi.');
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return null;
}

// Tambah Push Subscription
export async function addPushSubscription(uid, subscription) {
  if (!db) throw new Error('Realtime Database belum diinisialisasi.');
  // Encode endpoint agar aman sebagai key Firebase (tanpa titik/garis miring)
  const safeKey = btoa(subscription.endpoint).replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
  const subRef = ref(db, `users/${uid}/pushSubscriptions/${safeKey}`);
  await set(subRef, subscription);
}

// Hapus Push Subscription
export async function removePushSubscription(uid, endpoint) {
  if (!db) throw new Error('Realtime Database belum diinisialisasi.');
  const safeKey = btoa(endpoint).replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
  const subRef = ref(db, `users/${uid}/pushSubscriptions/${safeKey}`);
  await remove(subRef);
}
