import {
    db,
    collection,
    getDocs,
    doc,
    setDoc, 
    vehiclePath
} from "./firebase.js";

import { auth } from "./firebase.js";

/* ------------------------
   VEICOLI
------------------------ */

export async function getVehicles(){

    const user = auth.currentUser;
    if(!user) return [];

    const snap = await getDocs(
        collection(db,"users",user.uid,...vehiclePath(vehicleId))
    );

    return snap.docs.map(v=>({
        id:v.id,
        data:v.data()
    }));

}


/* ------------------------
   SALVA VEICOLO
------------------------ */

export async function saveVehicle(vehicleId,data){

    const user = auth.currentUser;
    if(!user) return;

    await setDoc(
        doc(db,"users",user.uid,...vehiclePath(vehicleId)),
        data,
        {merge:true}
    );

}


/* ------------------------
   PATH UTENTE
------------------------ */

export function vehicleDoc(vehicleId){

    const user = auth.currentUser;

    return doc(
        db,
        "users",
        user.uid,
        "vehicles",
        vehicleId
    );

}