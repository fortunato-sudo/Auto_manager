import { db, collection, getDocs, addDoc } from "./firebase.js";

async function migrateCollection(oldName,newPath){

const snap = await getDocs(collection(db,oldName));

for(const docSnap of snap.docs){

await addDoc(
collection(db,...newPath),
docSnap.data()
);

}

console.log(oldName+" migrata");

}

async function startMigration(){

await migrateCollection(
"fuel",
["vehicles","qashqai","fuel"]
);

await migrateCollection(
"registro",
["vehicles","qashqai","registro"]
);

await migrateCollection(
"manutenzioni",
["vehicles","qashqai","manutenzioni"]
);

console.log("Migrazione completata");

}

startMigration();
