import { db, collection, getDocs } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";
import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";


function getVehicleIcon(v){
  if(v.tipo === "moto") return "🏍";
  if(v.tipo === "van") return "🚚";
  return "🚗";
}

export async function renderGarage(appDiv){
  appDiv.innerHTML = `
    <div class="garageHeader">
      🚘 Garage
    </div>
    <button class="addVehicleBtn" onclick="nav('vehicleAdd')">
      + Aggiungi veicolo
    </button>
    <div id="garageList"></div>
  `;
  
  const vehiclesSnap = await getDocs(collection(db,"vehicles"));

  let html="";
  for(const vDoc of vehiclesSnap.docs){
    const v = vDoc.data();
    const id = vDoc.id;
    const urgenti = v.urgenti || 0;
    const imminenti = v.imminenti || 0;
    const tagliandoKm = v.tagliando_km || null;
    const tagliandoStato = v.tagliando_stato || "ok";
    const statoAdditivo = v.stato_additivo || "ok";

    let km = v.km_attuali || 0;
    let tagliandoText;
    let interventiText;
    if(tagliandoStato === "urgente"){
      tagliandoText = `<span class="tagliandoUrgente">🔴 Tagliando urgente</span>`;
    }

    else if(tagliandoStato === "imminente"){
      tagliandoText = `<span class="tagliandoImminente">🟠 Tagliando tra ${(tagliandoKm - km).toLocaleString()} km</span>`;
    }

    else{
      tagliandoText = `<span class="tagliandoOk">🟢 Tagliando ok</span>`;
    }

    let additivoText = "";
    if(statoAdditivo === "warning"){
        additivoText = `
            <div class="vehicleAdditivo">
                <span class="additivoWarning">
                    🧴 Additivo tra 1 pieno
                </span>
            </div>
        `;
    }

    if(statoAdditivo === "urgente"){
        additivoText = `
            <div class="vehicleAdditivo">
                <span class="additivoUrgente">
                    ⚠️ Prossimo pieno con additivo
                </span>
            </div>
        `;
    }

    if(urgenti === 0 && imminenti === 0){
      interventiText = `<span class="interventiOk">🟢 Interventi ok</span>`;
    }
    else{
      let parts = [];

      if(urgenti > 0){
        parts.push(
          `<span class="interventiUrgenti">🔴 ${urgenti === 1 ? "1 intervento urgente" : urgenti + " interventi urgenti"}</span>`
        );
      }

      if(imminenti > 0){
        parts.push(
          `<span class="interventiImminenti">🟠 ${imminenti === 1 ? "1 intervento imminente" : imminenti + " interventi imminenti"}</span>`
        );
      }

      interventiText = `
        <span class="interventiText">
          ${parts.join('<span class="interventiDivider">•</span>')}
        </span>
      `;
    }

    html += `
      <div class="vehicleCard vehicleEnter" onclick="entraVeicolo('${id}')">
        <div class="vehicleArrow">›</div>
        <div class="vehicleTitle">
          ${getVehicleIcon(v)} ${v.marca || ""} ${v.modello || v.nome || ""}
          ${v.motore ? `
          <div class="vehicleSubtitle">
            ${v.motore}
          </div>
        ` : ""}
        </div>
        
        <div class="vehicleMeta">
          ${v.targa ? `
            <span class="plateITA">${v.targa}</span>
          ` : ""}

          <span class="vehicleKm">
            ${km.toLocaleString()} km
          </span>
        </div>

        <div class="vehicleAlerts">
          <div class="vehicleTagliando">
            ${tagliandoText}
          </div>

          <div class="vehicleInterventi">
            ${interventiText}
          </div>

          ${additivoText}

          <span class="vehicleFuelQuick" onclick="event.stopPropagation(); nav('fuelAdd')">
            ⛽ Inserisci rifornimento
          </span>
        </div>
      </div>
    `;
  }
  document.getElementById("garageList").innerHTML = html;

  requestAnimationFrame(()=>{
    document.querySelectorAll(".vehicleCard")
    .forEach((el,i)=>{
        el.style.opacity="0";
        el.style.transform="translateY(20px)";
        
        setTimeout(()=>{
            el.style.transition="all .35s ease";
            el.style.opacity="1";
            el.style.transform="translateY(0)";
        }, i*60);
    });
  });
}

window.entraVeicolo=function(id){
  setVehicleId(id);
  setTab("home","garage");
  render();
}
