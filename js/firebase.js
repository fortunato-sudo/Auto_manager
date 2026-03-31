import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
	getFirestore,
	initializeFirestore,
	persistentLocalCache,
	collection,
	getDocs,
	getDoc,
	doc,
	setDoc,
	addDoc,
	deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig={
    apiKey:"AIzaSy...",
    authDomain:"auto-manutenzione.firebaseapp.com",
    projectId:"auto-manutenzione"
};

const app = initializeApp(firebaseConfig);

/* Firestore molto più veloce su mobile */
const db = initializeFirestore(app,{
	localCache: persistentLocalCache()
});

export {
	db,
	collection,
	getDocs,
	getDoc,
	doc,
	setDoc,
	addDoc,
	deleteDoc
};
