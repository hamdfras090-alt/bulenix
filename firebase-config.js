// إعدادات Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCyWC7EgoP943lVKEFKaMecV3dvglitp_k",
    authDomain: "bluenix-eff02.firebaseapp.com",
    projectId: "bluenix-eff02",
    storageBucket: "bluenix-eff02.firebasestorage.app",
    messagingSenderId: "315086668461",
    appId: "1:315086668461:web:355c12dba7b5078c097c24",
    measurementId: "G-G13N5RH6DG"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Analytics blocked or failed to load:", e.message);
}
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// تصدير الكائنات للاستخدام في الملفات الأخرى
export {
    app,
    db,
    storage,
    auth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    analytics,
    collection,
    addDoc,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    ref,
    uploadBytes,
    uploadString,
    getDownloadURL,
    deleteObject
};
