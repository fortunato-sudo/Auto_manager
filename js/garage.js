import { db, collection, getDocs, auth, deleteDoc, doc } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";
import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";

let startX = 0;
let currentX = 0;
let dragging = false;
let moved = false;
let blockClick = false;

function getVehicleIcon(v){
  if(v.tipo === "moto") return "🏍";
  if(v.tipo === "van") return "🚚";
  return "🚗";
}

export async function renderGarage(appDiv){
  const vehiclesSnap = await getDocs(
    collection(db,"users",auth.currentUser.uid,"vehicles")
  );
  
  appDiv.innerHTML = `
    ${!vehiclesSnap.empty ? `
      <div class="garageHeader">
        🚘 Garage
      </div>

      <button class="addVehicleBtn" onclick="nav('vehicleAdd')">
        + Aggiungi veicolo
      </button>
    ` : ""}
    <div id="garageList"></div>
  `;

  if(vehiclesSnap.empty){
    document.getElementById("garageList").innerHTML = `
      <div class="garageEmpty">
          <div class="garageEmptyIcon">🚘</div>

          <div class="garageEmptyTitle">
              Il tuo garage è vuoto
          </div>

          <div class="garageEmptyText">
              Gestisci manutenzioni, rifornimenti e costi<br>
              del tuo veicolo in un unico posto.
          </div>

          <button class="mainBtn" onclick="nav('vehicleAdd')">
              + Aggiungi il tuo primo veicolo
          </button>
      </div>
    `;
    return;
  }

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
      tagliandoText = `<span class="vehicleBadge badgeDanger">🔴 Tagliando urgente</span>`;
    }

    else if(tagliandoStato === "imminente"){
      tagliandoText = `<span class="vehicleBadge badgeWarning">🟠 Tagliando tra ${(tagliandoKm - km).toLocaleString()} km</span>`;
    }

    else{
      tagliandoText = `<span class="vehicleBadge badgeOk">🟢 Tagliando ok</span>`;
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
      interventiText = `<span class="vehicleBadge badgeOk">🟢 Interventi ok</span>`;
    }
    else{
      let parts = [];

      if(urgenti > 0){
        parts.push(
          `<div class="vehicleBadge badgeDanger">🔴 ${urgenti === 1 ? "1 intervento urgente" : urgenti + " interventi urgenti"}</div>`
        );
      }

      if(imminenti > 0){
        parts.push(
          `<div class="vehicleBadge badgeWarning">🟠 ${imminenti === 1 ? "1 intervento imminente" : imminenti + " interventi imminenti"}</div>`
        );
      }

      interventiText = `
        <div class="interventiText">
          ${parts.join("")}
        </div>
      `;
    }

    html += `
      <div class="vehicleSwipe" data-id="${id}">
        <div class="vehicleSwipeBg">
          <button class="vehicleDeleteSwipe">
              Elimina
          </button>
        </div>

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

            <span class="vehicleFuelQuick" ontouchend="event.stopPropagation(); nav('fuelAdd')">
              ⛽ + Rifornimento
            </span>
          </div>
        </div>
      </div>
    `;
  }
  document.getElementById("garageList").innerHTML = html;

  initSwipe();

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

function initSwipe(){
  const rows = document.querySelectorAll(".vehicleSwipe");
  rows.forEach(row=>{
    row.style.touchAction="none";
    let startX = 0;
    let currentX = 0;
    let dragging = false;
    let moved = false;

    const card = row.querySelector(".vehicleCard");
    const bg = row.querySelector(".vehicleSwipeBg");
    row.addEventListener("pointerdown",e=>{
      if(e.button !== 0) return;
      
      startX = e.clientX;
      currentX = e.clientX;
      dragging = true;
      moved = false;

      card.style.transition="none";
    });

    row.addEventListener("pointermove",e=>{
      if(!dragging) return;

      currentX = e.clientX;
      let diff = currentX - startX;

      if(Math.abs(diff) > 10){
        moved = true;
        blockClick = true;
      }

      if(diff < 0){
          if(diff < -120){
              diff = -120;
          }

          card.style.transform=`translateX(${diff}px)`;
          bg.style.width = Math.min(Math.abs(diff),120)+"px";
      }
    });

    row.addEventListener("pointerup",async ()=>{
      if(!dragging) return;

      if(!moved){
          dragging=false;
          return;
      }

      dragging = false;

      let diff = currentX - startX;
      card.style.transition="transform .25s ease";
      if(diff < -100){
        const id = row.dataset.id;

        if(confirm("Eliminare questo veicolo?")){
          await deleteDoc(
            doc(db,"users",auth.currentUser.uid,"vehicles",id)
          );

          render();
          return;
        }
      }

      card.style.transform="translateX(0)";
      bg.style.width="0";

      setTimeout(()=>{
        blockClick = false;
      },150);
    });
  });
}

window.entraVeicolo=function(id){
  if(blockClick) return;

  setVehicleId(id);
  setTab("home","garage");
  render();
}

window.eliminaVeicolo = async function(id){
  if(!confirm("Eliminare completamente questo veicolo?")) return;

  const base = ["users",auth.currentUser.uid,"vehicles",id];
  const collezioni = [
    "manutenzioni",
    "registro",
    "fuel"
  ];

  for(const c of collezioni){
    const snap = await getDocs(
      collection(db,...base,c)
    );

    for(const d of snap.docs){
      await deleteDoc(d.ref);
    }
  }

  await deleteDoc(
    doc(db,...base)
  );

  setVehicleId(null);
  setTab("garage");
  render();
}