import { db, doc, setDoc, vehiclePath } from "./firebase.js";
import { setCacheConfig, vehicleId } from "./state.js";

window.saveKm=async function(){
    let km = document
    .getElementById("km")
    .value
    .replace(/\./g,"");
    await setDoc(
        doc(db,...vehiclePath(vehicleId)),
        {
            km_attuali:Number(km)
        },
        {merge:true}
    );
    setCacheConfig(Number(km));
    render();
}
