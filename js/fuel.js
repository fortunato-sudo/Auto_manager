import { db, collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, query, orderBy, limit } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatNumero, formatDate, formatKm, parseNumero, getConsumoClasse } from "./utils.js";
import { cacheFuel, fuelEditId, setCacheFuel, setTab } from "./state.js";

export async function getFuelList(){
    if(cacheFuel !== null){
        return cacheFuel;
    }

    const snap = await getDocs(
	    query(
	        collection(db,"vehicles",vehicleId,"fuel"),
	        orderBy("data","desc"),
	        limit(200)
	    )
	);
	
    let list = snap.docs.map(doc=>({
        id:doc.id,
        data:doc.data()
    }));
    setCacheFuel(list);
    return list;
}

window.calcolaFuel = function(campo){
    let totale=parseNumero(document.getElementById("totale").value);
    let litro=parseNumero(document.getElementById("litro").value);
    let litri=parseNumero(document.getElementById("litri").value);

    if(campo==="totale" && litro){
        document.getElementById("litri").value=
        formatNumero(totale/litro,2);
    }

    if(campo==="litro" && totale){
        document.getElementById("litri").value=
        formatNumero(totale/litro,2);
    }

    if(campo==="litri" && litro){
        document.getElementById("totale").value=
        formatNumero(litro*litri,2);
    }

    if(campo==="litri" && totale){
        document.getElementById("litro").value=
        formatNumero(totale/litri,3);
    }
}

window.salvaFuel = async function(){
    let totale = parseNumero(document.getElementById("totale").value);
    let litro = parseNumero(document.getElementById("litro").value);
    let litri = parseNumero(document.getElementById("litri").value);
    let km = Number(document.getElementById("kmFuel").value);
    let distributore = document.getElementById("distributore").value;
    await aggiornaKmAutoSeMaggiore(km);
    let saltoConsumo = document.getElementById("saltaConsumo")?.checked;
    let consumo = null;

    /* trova rifornimento precedente */
    let ultimoKm=null;
    (cacheFuel || []).forEach(f=>{
        let k=Number(f.data.km);
        if(km > k){
            if(ultimoKm===null || k>ultimoKm){
                ultimoKm=k;
            }
        }
    });

    /* calcola consumo */
    if(!saltoConsumo && ultimoKm !== null && litri){
        let kmPercorsi = km - ultimoKm;
        if(kmPercorsi>0){
            consumo = kmPercorsi / litri;
        }
    }

    /* salva */
    if(fuelEditId){
        await setDoc(doc(db,"vehicles",vehicleId,"fuel",fuelEditId),{
            totale,
            litro,
            litri,
            km,
            distributore,
            consumo,
            data:new Date().toISOString()
        },{merge:true});
        fuelEditId=null;
    }else{
        await addDoc(collection(db,"vehicles",vehicleId,"fuel"),{
			vehicleId:"default",
            totale,
            litro,
            litri,
            km,
            distributore,
            consumo,
            data:new Date().toISOString()
        });
    }
    setCacheFuel(null);
    setTab("fuel");
    render();
}

window.modificaFuel = function(id){
    fuelEditId = id;
    setTab("fuelAdd");
    render();
}

window.eliminaFuel = async function(id){
    if(confirm("Eliminare questo rifornimento?")){
        await deleteDoc(doc(db,"vehicles",vehicleId,"fuel",id));
        setCacheFuel(null);
        render();
    }
}

export function renderFuel(appDiv, fuelList, stats){
    appDiv.innerHTML+=`
        ${headerMenu("Rifornimenti")}
        <button onclick="nav('fuelAdd')" class="mainBtn">
            + Nuovo rifornimento
        </button>
        <div class="section">Ultimi rifornimenti</div>
        <div id="fuelList"></div>
    `;

    let fuelBox=document.getElementById("fuelList");
    if(stats.anomaliaConsumo){
        fuelBox.innerHTML+=`
            <div class="anomaliaBox">
                ⚠️ Consumo +${stats.anomaliaConsumo}% rispetto alla media
            </div>
        `;
    }

    if(stats.miglioramentoConsumo){
        fuelBox.innerHTML+=`
            <div class="anomaliaBox">
                📉 Consumo migliorato del ${stats.miglioramentoConsumo}%
            </div>
        `;
    }

    if(stats.anomaliaPrezzo){
        fuelBox.innerHTML+=`
            <div class="anomaliaBox">
                ⛽ Prezzo carburante +${stats.anomaliaPrezzo}% rispetto alla media
            </div>
        `;
    }

    let consumoTot=0;
    let countConsumi=0;
    let listaConsumi=[];
    let anomaliaConsumo=null;

    if(anomaliaConsumo){
        let media = listaConsumi.reduce((a,b)=>a+b,0) / listaConsumi.length;
        let ultimoConsumo = listaConsumi[0];
        let fuelBox = document.getElementById("fuelList");

        if(fuelBox){
            fuelBox.innerHTML =
            `<div class="anomaliaBox">
                ⚠️ Consumo +${anomaliaConsumo}% rispetto alla media<br>
                <span class="anomaliaDettaglio">
                    Ultimo pieno: ${formatNumero(ultimoConsumo,2)} km/l<br>
                    Media: ${formatNumero(media,2)} km/l
                </span>
            </div>` + fuelBox.innerHTML;
        }
    }
	
	let html = "";
	fuelList.forEach(item=>{
	    let s=item.data;
	    let id=item.id;	
	    if(s.consumo){
	        listaConsumi.push(s.consumo);
	    }
	
	    let row = `
	        <div class="manutRow">
	            <div class="manutInfo">
	                <div class="fuelTitle">
	                    ${formatDate(s.data)} • ${formatNumero(s.totale,2)} €
	                </div>
	                ${s.distributore ? `<div class="fuelStation">⛽ ${s.distributore}</div>` : ""}
	                <div class="fuelGrid">
	                    <div class="fuelInfo">
	                        💧 ${formatNumero(s.litro,3)} €/L
	                    </div>
	                    <div class="fuelInfo">
	                        ⛽ ${formatNumero(s.litri,2)} L
	                    </div>
	                    <div class="fuelInfo">
	                        🚗 ${formatKm(s.km)} km
	                    </div>
	                    ${s.consumo ?
	                        `<div class="fuelConsumo ${getConsumoClasse(s.consumo)}">📈 ${formatNumero(s.consumo,2)} km/l</div>`
	                        :
	                        `<div class="fuelNoConsumo">⚠️ Consumo non calcolato</div>`
	                    }
	                </div>
	                <div class="fuelActions">
	                    <button class="btnEdit" onclick="modificaFuel('${id}')">
	                        ✏️ Modifica
	                    </button>
	                    <button class="btnDelete" onclick="eliminaFuel('${id}')">
	                        🗑 Elimina
	                    </button>
	                </div>
	            </div>
	        </div>
	    `;
	    html += row;
	});
	let box = document.getElementById("fuelList");
	if(box){
	    box.innerHTML = html;
	}
}

export async function renderFuelAdd(appDiv){
    let titoloFuel = fuelEditId ? "Modifica rifornimento" : "Nuovo rifornimento";
    appDiv.innerHTML+=`
        ${headerBack(titoloFuel)}

        <div class="group">
            <div class="row">
                <div>Prezzo totale</div>
                <input id="totale" placeholder="€" oninput="calcolaFuel('totale')">
            </div>

            <div class="row">
                <div>Prezzo al litro</div>
                <input id="litro" placeholder="€/L" oninput="calcolaFuel('litro')">
            </div>

            <div class="row">
                <div>Litri</div>
                <input id="litri" placeholder="L" oninput="calcolaFuel('litri')">
            </div>

            <div class="row">
                <div>Km auto</div>
                <input id="kmFuel" placeholder="km">
            </div>

            <div class="row">
                <div>Distributore</div>
                <input id="distributore" placeholder="Nome distributore">
            </div>

            <div class="row">
                <label style="display:flex; gap:8px; align-items:center;">
                    <input type="checkbox" id="saltaConsumo">
                    Rifornimento precedente perso
                </label>
            </div>

            <div class="row center">
                <button onclick="salvaFuel()">Salva</button>
            </div>
        </div>
    `;

    if(fuelEditId){
        const snap = await getDoc(doc(db,"vehicles",vehicleId,"fuel",fuelEditId));

		let f = snap.data();
	        document.getElementById("totale").value = f.totale || "";
	        document.getElementById("litro").value = f.litro || "";
	        document.getElementById("litri").value = f.litri || "";
	        document.getElementById("kmFuel").value = f.km || "";
	        document.getElementById("distributore").value = f.distributore || "";
	}
}
