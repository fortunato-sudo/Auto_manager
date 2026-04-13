import { auth } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function register(email,password){
    return createUserWithEmailAndPassword(auth,email,password);
}

export function login(email,password){
    return signInWithEmailAndPassword(auth,email,password);
}

export function logout(){
    return signOut(auth);
}