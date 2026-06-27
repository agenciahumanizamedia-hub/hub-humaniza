import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2XU6WgDjSwece5OJVE-thiCb4OwP-58M",
  authDomain: "humaniza-os.firebaseapp.com",
  projectId: "humaniza-os",
  storageBucket: "humaniza-os.firebasestorage.app",
  messagingSenderId: "416592042651",
  appId: "1:416592042651:web:66dd16c8e823e57d5b443e",
  measurementId: "G-YQMK274JER"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp };
