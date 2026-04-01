import { db, collection, getDocs, doc, setDoc } from "./firebase.js";

async function migrateCollection(oldName, newPath){

    const snap = await getDocs(collection(db, oldName));

    for(const d of snap.docs){

        const data = d.data();

        await setDoc(
            doc(db, "vehicles", "qashqai", newPath, d.id),
            data
        );

    }

    console.log(oldName + " migrata");
}

async function startMigration(){

    await migrateCollection("fuel", "fuel");
    await migrateCollection("registro", "registro");
    await migrateCollection("manutenzioni", "manutenzioni");
    await migrateCollection("config", "config");

    console.log("Migrazione completata");

}

startMigration();
