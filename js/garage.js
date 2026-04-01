import { db, collection, getDocs } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";
import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";

export async function renderGarage(appDiv){
  appDiv.innerHTML = `
    ${headerMenu("Garage")}
    <div id="garageList"></div>
  `;
  
  const vehiclesSnap = await getDocs(collection(db,"vehicles"));

  let html="";
  for(const vDoc of vehiclesSnap.docs){
    const v = vDoc.data();
    const id = vDoc.id;
    const manutSnap = await getDocs(collection(db,"vehicles",id,"manutenzioni"));
    const manutList = manutSnap.docs.map(d=>({
      id:d.id,
      data:d.data()
    }));
    let km = v.km_attuali || 0;

    let urgenti = 0;
    let imminenti = 0;
    let prossimoKm = Infinity;
    manutList.forEach(m=>{
      const stato = calcolaStato(m.data, km);
      if(stato.stato === "urgente") urgenti++;
      if(stato.stato === "imminente") imminenti++;
      if(stato.nextKm && stato.nextKm < prossimoKm){
        prossimoKm = stato.nextKm;
      }
    });

    let tagliandoText;
    let interventiText;
    if(prossimoKm !== Infinity){
      let diff = prossimoKm - km;
      if(diff <= 0){
        tagliandoText = "⚠️ Tagliando urgente";
      }
      else{
        tagliandoText = `⚠️ Tagliando tra ${diff.toLocaleString()} km`;
      }
    }
    else{
      tagliandoText = "✅ Tagliando ok";
    }

    if(urgenti === 0 && imminenti === 0){
      interventiText = "✅ Interventi ok";
    }
    else{
      interventiText = `⚠️ Interventi: ${urgenti} urgenti - ${imminenti} imminenti`;
    }

    html += `
      <div class="vehicleCard" onclick="entraVeicolo('${id}')">

        <div class="vehicleTitle">
          ${v.icona || "🚗"} ${v.nome}
        </div>

        <div class="vehicleKm">
          ${km.toLocaleString()} km
        </div>

        <div class="vehicleTagliando">
          ${tagliandoText}
        </div>

        <div class="vehicleInterventi">
          ${interventiText}
        </div>
      </div>
    `;
  }
  document.getElementById("garageList").innerHTML = html;
}

window.entraVeicolo=function(id){
  setVehicleId(id);
  setTab("home");
  render();
}
