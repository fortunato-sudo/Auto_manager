import { db, collection, getDocs } from "./firebase.js";
import { setVehicleId, setTab } from "./state.js";

export async function renderGarage(appDiv){
  appDiv.innerHTML=`
    <h2>Garage</h2>
    <div id="garageList"></div>
  `;
  const snap = await getDocs(collection(db,"vehicles"));
  
  let html="";
  snap.forEach(doc=>{
    let v = doc.data();
    let id = doc.id;
  
    html+=`
      <div class="manutRow" onclick="entraVeicolo('${id}')">
        <div class="manutInfo"> 
          <div class="manutTitle">
            ${v.icona} ${v.nome}
          </div>
    
          <div class="manutFreq">
            ${v.km_attuali.toLocaleString()} km
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById("garageList").innerHTML=html;
}

window.entraVeicolo=function(id){
  setVehicleId(id);
  setTab("home");
  render();
}
