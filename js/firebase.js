import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
	initializeFirestore,
	persistentLocalCache,
	collection,
	getDocs,
	getDoc,
	doc,
	setDoc,
	addDoc,
	deleteDoc,
	query,
	orderBy,
	limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
	apiKey: "AIzaSyCqwJGw84T2GT29sdPDrVSfD2se61VoCTQ",
	authDomain: "auto-manutenzione.firebaseapp.com",
	projectId: "auto-manutenzione",
	storageBucket: "auto-manutenzione.firebasestorage.app",
	messagingSenderId: "1057175085177",
	appId: "1:1057175085177:web:d159d4108c51ee710834a8",
	measurementId: "G-9KM4Z7C6C9"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app,{
	localCache: persistentLocalCache()
});

export const auth = getAuth(app);

export {
	db,
	collection,
	getDocs,
	getDoc,
	doc,
	setDoc,
	addDoc,
	deleteDoc,
	query,
	orderBy,
	limit
};

export function vehiclePath(vehicleId){
    const uid = auth.currentUser?.uid;

    if(!uid){
        throw new Error("User non autenticato");
    }
    return ["users", uid, "vehicles", vehicleId];
}