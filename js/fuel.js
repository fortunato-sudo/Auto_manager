import { db, collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, query, orderBy, limit } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatNumero, formatDate, formatKm, parseNumero, getConsumoClasse } from "./utils.js";
import { cacheFuel, setCacheFuel, fuelEditId, setFuelEditId, setTab, vehicleId } from "./state.js";

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
    let additivo = document
        .getElementById("switchAdditivo")
        .classList.contains("switchActive");
    let pienoPerso = document
        .getElementById("switchPienoPerso")
        .classList.contains("switchActive");
    await aggiornaKmAutoSeMaggiore(km);
    let saltoConsumo = document.getElementById("saltaConsumo")?.checked;
    let consumo = null;

    const vehicleRef = doc(db,"vehicles",vehicleId);
    const snap = await getDoc(vehicleRef);
    const v = snap.data();
    const nuovoStato = calcolaTagliando(km, v.tagliando_km);
    await setDoc(vehicleRef,{
        tagliando_stato: nuovoStato
    },{merge:true});   

    /* trova rifornimento precedente */
    /* trova rifornimento precedente valido */
    let ultimoKm = null;

    const listaFuel = (cacheFuel || [])
        .map(f => f.data)
        .sort((a,b)=> b.km - a.km);

    for(const f of listaFuel){

        if(f.pieno_perso){
            break;
        }

        if(f.km < km){
            ultimoKm = f.km;
            break;
        }
    }

    /* calcola consumo */
    if(!saltoConsumo && !pienoPerso && ultimoKm !== null && litri){
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
            additivo:additivo,
            pieno_perso:pienoPerso,
            consumo,
            data:new Date().toISOString()
        },{merge:true});
        setFuelEditId(null);
    }else{
        await addDoc(collection(db,"vehicles",vehicleId,"fuel"),{
			vehicleId:"default",
            totale,
            litro,
            litri,
            km,
            distributore,
            additivo:additivo,
            pieno_perso:pienoPerso,
            consumo,
            data:new Date().toISOString()
        });
    }

    const fuelSnapList = await getDocs(
            collection(db,"vehicles",vehicleId,"fuel")
        );

    const lista = fuelSnapList.docs
        .map(d => d.data())
        .sort((a,b)=> new Date(b.data) - new Date(a.data))

    let pieniSenzaAdditivo = 0;
    for(const f of lista){
        if(f.additivo === true){
            break;
        }
        pieniSenzaAdditivo++;
    }

    let statoAdditivo="ok";

    if(pieniSenzaAdditivo === 2){
        statoAdditivo="warning";
    }

    if(pieniSenzaAdditivo >= 3){
        statoAdditivo="urgente";
    }

    await setDoc(
        doc(db,"vehicles",vehicleId),
        {
            pieni_senza_additivo: pieniSenzaAdditivo,
            stato_additivo: statoAdditivo
        },
        {merge:true}
    );

    /* RICALCOLO CONSUMI DOPO MODIFICA */
    const fuelSnap = await getDocs(
        collection(db,"vehicles",vehicleId,"fuel")
    );

    let fuelList = fuelSnap.docs
        .map(d => ({
            id:d.id,
            data:d.data()
        }))
        .sort((a,b)=> a.data.km - b.data.km);

    for(let i=1;i<fuelList.length;i++){
        let prev = fuelList[i-1];
        let curr = fuelList[i];
        let consumo = null;
        if(
            !prev.data.pieno_perso &&
            !curr.data.pieno_perso &&
            prev.data.km &&
            curr.data.km &&
            curr.data.litri
        ){
            let kmPercorsi = curr.data.km - prev.data.km;
            if(kmPercorsi > 0){
                consumo = kmPercorsi / curr.data.litri;
            }
        }

        await setDoc(
            doc(db,"vehicles",vehicleId,"fuel",curr.id),
            { consumo },
            { merge:true }
        );
    }

    setCacheFuel(null);
    await getFuelList();
    setTab("fuel");
    render();
}

window.modificaFuel = function(id){
    setFuelEditId(id);
    setTab("fuelAdd","fuel");
    render();
}

window.eliminaFuel = async function(id){
    if(confirm("Eliminare questo rifornimento?")){
        await deleteDoc(doc(db,"vehicles",vehicleId,"fuel",id));
        const fuelSnapList = await getDocs(
            collection(db,"vehicles",vehicleId,"fuel")
        );

        const lista = fuelSnapList.docs
            .map(d => d.data())
            .sort((a,b)=> new Date(b.data) - new Date(a.data));

        let pieniSenzaAdditivo = 0;

        for(const f of lista){
            if(f.additivo === true){
                break;
            }
            pieniSenzaAdditivo++;
        }

        let statoAdditivo="ok";

        if(pieniSenzaAdditivo === 2){
            statoAdditivo="warning";
        }

        if(pieniSenzaAdditivo >= 3){
            statoAdditivo="urgente";
        }

        await setDoc(
            doc(db,"vehicles",vehicleId),
            {
                pieni_senza_additivo: pieniSenzaAdditivo,
                stato_additivo: statoAdditivo
            },
            {merge:true}
        );
        setCacheFuel(null);
        render();
    }
}

let pienoPerso=false;
let additivo=false;


window.togglePienoPerso=function(){
    const sw=document.getElementById("switchPienoPerso");
    pienoPerso=!pienoPerso;
    sw.classList.toggle("switchActive");
}

window.toggleAdditivo=function(){
    const sw=document.getElementById("switchAdditivo");
    additivo = !additivo;
    if(additivo){
        sw.classList.add("switchActive");
    }else{
        sw.classList.remove("switchActive");
    }
}

window.nuovoFuel=function(){
    setFuelEditId(null);
    setTab("fuelAdd","fuel");
    render();
}

export function renderFuel(appDiv, fuelList, stats){
    appDiv.innerHTML+=`
        ${headerMenu("Rifornimenti")}
        <button onclick="nuovoFuel()" class="mainBtn">
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
                    <div class="fuelToggleRow">
                        <span class="fuelToggleLabel">⛽ Precedente rifornimento perso</span>
                        <div class="switch" onclick="togglePienoPerso()" id="switchPienoPerso">
                            <div class="switchKnob"></div>
                        </div>
                    </div>
            </div>

            <div class="row">
                    <div class="fuelToggleRow">
                        <span class="fuelToggleLabel">🧴 Additivo diesel</span>
                        <div class="switch" onclick="toggleAdditivo()" id="switchAdditivo">
                            <div class="switchKnob"></div>
                        </div>
                    </div>
            </div>

            <div class="row center">
                <button onclick="salvaFuel()">Salva</button>
            </div>
        </div>
    `;
    additivo = false;
    pienoPerso = false;

    if(fuelEditId){
        const snap = await getDoc(doc(db,"vehicles",vehicleId,"fuel",fuelEditId));

        let f = snap.data();

        document.getElementById("totale").value = f.totale || "";
        document.getElementById("litro").value = f.litro || "";
        document.getElementById("litri").value = f.litri || "";
        document.getElementById("kmFuel").value = f.km || "";
        document.getElementById("distributore").value = f.distributore || "";

        /* stato pieno perso */
        if(f.pieno_perso){
            pienoPerso = true;
            document
                .getElementById("switchPienoPerso")
                .classList.add("switchActive");
        }

        /* stato additivo */
        if(f.additivo){
            additivo = true;
            document
                .getElementById("switchAdditivo")
                .classList.add("switchActive");
        }
    }
}
