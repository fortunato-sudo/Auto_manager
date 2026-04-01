import { db, collection, getDocs } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";
import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";

function getVehicleIcon(nome){
  const n = nome.toLowerCase();
  if(n.includes("cbr") || n.includes("moto") || n.includes("yamaha") || n.includes("ducati")){
    return "🏍";
  }

  if(n.includes("van") || n.includes("furgone") || n.includes("ducato")){
    return "🚚";
  }
  return "🚗";
}

export async function renderGarage(appDiv){
  appDiv.innerHTML = `
    <div class="garageHeader">
      Garage
    </div>
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
    let totaleAlert = urgenti + imminenti;
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
      interventiText = `<span class="badgeOk">Interventi ok</span>`;
    }
    else{
      let badge = "";
      if(urgenti > 0){
        badge += `<span class="badgeUrgente">🔴 ${urgenti}</span>`;
      }
    
      if(imminenti > 0){
        badge += `<span class="badgeImminente">🟠 ${imminenti}</span>`;
      }
      interventiText = badge;
    }

    html += `
      <div class="vehicleCard" onclick="entraVeicolo('${id}')">

        <div class="vehicleTitle">
          <span class="vehicleIcon">
            ${getVehicleIcon(v.nome)}
          </span>

          ${v.nome}
          ${
            totaleAlert > 0
            ? `<span class="vehicleBadge">${totaleAlert}</span>`
            : ""
          }
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
