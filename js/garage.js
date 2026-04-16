import { db, collection, getDocs, auth, deleteDoc, doc } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";
import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";

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
          `<span class="vehicleBadge badgeDanger">🔴 ${urgenti === 1 ? "1 intervento urgente" : urgenti + " interventi urgenti"}</span>`
        );
      }

      if(imminenti > 0){
        parts.push(
          `<span class="vehicleBadge badgeWarning">🟠 ${imminenti === 1 ? "1 intervento imminente" : imminenti + " interventi imminenti"}</span>`
        );
      }

      interventiText = `
        <span class="interventiText">
          ${parts.join('<span class="interventiDivider"></span>')}
        </span>
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

            <span class="vehicleFuelQuick" onclick="event.stopPropagation(); nav('fuelAdd')">
              ⛽ + Rifornimento
            </span>
          </div>
        </div>
      </div>
    `;
  }
  document.getElementById("garageList").innerHTML = html;

  let startX = 0;
  let currentX = 0;
  let dragging = false;
  let activeRow = null;
  let openedRow = null;

  document.querySelectorAll(".vehicleSwipe").forEach(row=>{
      const card = row.querySelector(".vehicleCard");

      row.addEventListener("touchstart",e=>{
          row.classList.add("swiping");
          startX = e.touches[0].clientX;
          dragging = true;
          activeRow = row;
          card.style.transition="none";

          /* chiude altre card aperte */
          if(openedRow && openedRow !== row){
              const c = openedRow.querySelector(".vehicleCard");
              c.style.transform="translateX(0)";
              openedRow=null;
          }
      });

      row.addEventListener("touchmove",e=>{
          if(!dragging) return;
          currentX = e.touches[0].clientX;
          let diff = currentX - startX;

          if(diff < 0){
              /* limite swipe */
              let maxSwipe = -120;

              /* elasticità */
              if(diff < maxSwipe){
                  diff = maxSwipe + (diff - maxSwipe) * 0.3;
              }
              card.style.transform=`translateX(${diff}px)`;

              /* vibrazione quando appare delete */
              if(diff < -70 && !row.classList.contains("haptic")){
                  row.classList.add("haptic");

                  if(navigator.vibrate){
                      navigator.vibrate(10);
                  }
              }
          }
      });

      row.addEventListener("touchend",()=>{
          row.classList.remove("swiping");
          dragging=false;

          const matrix = new WebKitCSSMatrix(
              window.getComputedStyle(card).transform
          );

          const x = matrix.m41;
          card.style.transition="transform .25s ease";

          if(x < -70){
              card.style.transform="translateX(-120px)";
              openedRow=row;
          }
          else{
              card.style.transform="translateX(0)";
              row.classList.remove("haptic");
          }
      });
  });

  document.querySelectorAll(".vehicleDeleteSwipe")
  .forEach(btn=>{
      btn.addEventListener("click",async e=>{
          const row = btn.closest(".vehicleSwipe");
          const id = row.dataset.id;

          if(!confirm("Eliminare questo veicolo?")) return;

          await deleteDoc(
              doc(db,"users",auth.currentUser.uid,"vehicles",id)
          );
          render();
      });
  });

  document.querySelectorAll(".vehicleSwipe.open")
  .forEach(el=>{
      if(el!==row){
          el.classList.remove("open");
          el.querySelector(".vehicleCard").style.transform="translateX(0)";
      }
  });

  document.addEventListener("click",e=>{
      document.querySelectorAll(".vehicleSwipe.open")
      .forEach(el=>{
          if(!el.contains(e.target)){
              el.classList.remove("open");
          }
      });
  });

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