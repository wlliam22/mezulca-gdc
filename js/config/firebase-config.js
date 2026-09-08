// js/config/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// [IMPORTANTE] Reemplazar con tus credenciales de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC1Twnlwxfe_k9vqRRiNlmGvWhgXaHFP5M",
    authDomain: "mezulcagdc.firebaseapp.com",
    projectId: "mezulcagdc",
    storageBucket: "mezulcagdc.firebasestorage.app",
    messagingSenderId: "84609165811",
    appId: "1:84609165811:web:78eaca624da24ff3c30a86"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };