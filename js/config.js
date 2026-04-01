import { db, doc, setDoc } from "./firebase.js";
import { setCacheConfig } from "./state.js";

window.saveKm=async function(){
    let km=document.getElementById("km").value;
    await setDoc(doc(db,"vehicles",vehicleId,"config","auto"),{
        km_attuali:Number(km)
    });
    setCacheConfig(Number(km));
    render();
}
