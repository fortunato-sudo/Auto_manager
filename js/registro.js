import { db, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, doc } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatDateOnly, formatKm, formatNumero, parseNumero } from "./utils.js";
import { cacheManut, setCacheManut, cacheRegistro, setCacheRegistro ,setTab, vehicleId, registroEditId, setRegistroEditId } from "./state.js";
import { calcolaTagliando } from "./manut.js";

async function ricalcolaManutenzioni(){
    const storicoSnap = await getDocs(
        collection(db,"vehicles",vehicleId,"registro")
    );

    const storico = storicoSnap.docs.map(d=>d.data());
    if(!cacheManut) return;

    for(const m of cacheManut){
        let ultimoKm = 0;
        let ultimaData = null;

        storico.forEach(r=>{
            if(
                r.manutenzione === m.data.nome ||
                (r.correlate && r.correlate.includes(m.id))
            ){
                if(r.km > ultimoKm){
                    ultimoKm = r.km;
                    ultimaData = r.data;
                }
            }
        });

        await setDoc(
            doc(db,"vehicles",vehicleId,"manutenzioni",m.id),
            {
                ultimo_km: ultimoKm,
                ultima_data: ultimaData
            },
            {merge:true}
        );
    }
}

export async function renderRegistro(appDiv){
    appDiv.innerHTML+=`
        ${headerMenu("Registro")}
        <button class="mainBtn" onclick="nuovoRegistro()">
            + Nuovo intervento
        </button>
        <div id="registro"></div>
    `;
    
    let storicoList = cacheRegistro;

	if(!storicoList){
    	const snap = await getDocs(collection(db,"vehicles",vehicleId,"registro"));
    	storicoList = snap.docs.map(doc=>({
        	id:doc.id,
        	data:doc.data()
    	}));
    	setCacheRegistro(storicoList);
	}

    storicoList.sort((a,b)=>{
        return new Date(b.data.data) - new Date(a.data.data);
    });

    storicoList.forEach(s=>{
        let row = `
            <div class="manutRow">
                <div class="manutInfo">

                    <div class="manutTitle">
                        ${s.data.manutenzione}
                    </div>

                    <div class="manutFreq">
                        ${formatDateOnly(s.data.data)} | ${formatKm(s.data.km)} km
                    </div>

                    ${s.data.officina ? `<div class="manutFreq">Officina: ${s.data.officina}</div>` : ""}
                    ${s.data.note ? `<div class="manutFreq">Note: ${s.data.note}</div>` : ""}
                    ${s.data.costo ? `<div class="manutFreq">💰 ${formatNumero(s.data.costo,2)} €</div>` : ""}

                    <div class="fuelActions">
                        <button class="btnEdit" onclick="modificaRegistro('${s.id}')">
                            ✏️ Modifica
                        </button>

                        <button class="btnDelete" onclick="eliminaRegistro('${s.id}')">
                            🗑 Elimina
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("registro").innerHTML+=row;
    });
}

export function calcolaManutenzioneAnnuale(registroList){
    const anni = {};
    registroList.forEach(r=>{
        const d = new Date(r.data.data);
        const anno = d.getFullYear();
        if(!anni[anno]){
            anni[anno] = {
                interventi:[],
                totale:0
            };
        }
        anni[anno].interventi.push(r.data);

        if(r.data.costo){
            anni[anno].totale += r.data.costo;
        }
    });
    return anni;
}

export async function renderRegistroAdd(appDiv){
    appDiv.innerHTML+=`
        ${headerBack("Nuovo intervento")}

        <div class="group">
            <div class="formGroup">
                <div class="formLabel">Intervento</div>
                <select id="nomeInt" class="formInput"></select>
            </div>

            <div class="formGroup">
                <div class="formLabel">Km</div>
                <input id="kmInt" class="formInput" placeholder="100000">
            </div>

            <div class="formGroup">
                <div class="formLabel">Officina</div>
                <input id="officinaInt" class="formInput" placeholder="Norauto">
            </div>

            <div class="formGroup">
                <div class="formLabel">Note</div>
                <input id="noteInt" class="formInput">
            </div>

            <div class="formGroup">
                <div class="formLabel">Costo intervento</div>
                <input id="costoInt" class="formInput" placeholder="€">
            </div>

            <div id="manutCorrelate"></div>

            <button class="formButton" onclick="salvaRegistro()">
                Salva intervento
            </button>
        </div>
    `;

    let select = document.getElementById("nomeInt");
    let lista = cacheManut;
    if(!lista){
        const snap = await getDocs(
            collection(db,"vehicles",vehicleId,"manutenzioni")
        );

        lista = snap.docs.map(d=>({
            id:d.id,
            data:d.data()
        }));
        setCacheManut(lista);
    }

    const listaOrdinata = [...lista].sort((a,b)=>
        a.data.nome.localeCompare(b.data.nome)
    );

    select.innerHTML += `
        <option value="Tagliando completo">
            Tagliando completo
        </option>
    `;

    if(cacheManut){
        const lista = [...cacheManut].sort((a,b)=>
            a.data.nome.localeCompare(b.data.nome)
        );

        lista.forEach(m=>{
            select.innerHTML += `
                <option value="${m.data.nome}">
                    ${m.data.nome}
                </option>
            `;
        });
    }
    document
    .getElementById("nomeInt")
    .addEventListener("change", aggiornaCorrelate);
    aggiornaCorrelate();

    if(registroEditId){
        const snap = await getDoc(
            doc(db,"vehicles",vehicleId,"registro",registroEditId)
        );

        const r = snap.data();
        if(r){
            document.getElementById("nomeInt").value = r.manutenzione || "";
            document.getElementById("kmInt").value = r.km || "";
            document.getElementById("officinaInt").value = r.officina || "";
            document.getElementById("noteInt").value = r.note || "";

            // 🔥 genera le correlate
            aggiornaCorrelate();

            // 🔥 attiva toggle salvati
            if(r && r.correlate){
                r.correlate.forEach(id=>{
                    const sw = document.getElementById("corr_"+id);

                    if(sw){
                        sw.classList.add("switchActive");
                    }
                });
            }
        }
    }
}

export function renderCronologiaManut(appDiv, registroList){
    const anni = calcolaManutenzioneAnnuale(registroList);

    let totaleManut = 0;
    registroList.forEach(r=>{
        if(r.data.costo){
            totaleManut += r.data.costo;
        }
    });

    let html = `
        ${headerBack("Cronologia manutenzione")}
        <div class="manutTotalGlobal">
            🔧 Manutenzione totale<br>
            <span class="manutTotalValue">
                ${formatNumero(totaleManut,2)} €
            </span>
        </div>
    `;

    Object.entries(anni)
    .sort((a,b)=>b[0]-a[0])
    .forEach(([anno,d])=>{
        html += `
        <div class="section">${anno}</div>
        `;
        d.interventi.forEach(i=>{
            html += `
            <div class="manutRow">

                <div class="manutInfo">

                    <div class="manutTitle">
                        ${i.manutenzione}
                    </div>

                    <div class="manutFreq">
                        ${formatDateOnly(i.data)}
                    </div>

                    ${i.costo ? `
                        <div class="manutCost">
                            💰 ${formatNumero(i.costo,2)} €
                        </div>
                    ` : ""}
                </div>
            </div>
            `;
        });

        html += `
        <div class="manutTotal">
            Totale ${anno}: 
            ${formatNumero(d.totale,2)} €
        </div>
        `;
    });
    appDiv.innerHTML = html;
}

window.toggleCorrelata = function(id){
    const sw = document.getElementById("corr_"+id);
    sw.classList.toggle("switchActive");
}

window.nuovoRegistro = function(){
    setRegistroEditId(null); // reset modalità modifica
    setTab("registroAdd","registro");
    render();
}

window.salvaRegistro = async function(){
    let nome = document.getElementById("nomeInt").value;
    let km = document.getElementById("kmInt").value;
    let officina = document.getElementById("officinaInt").value;
    let note = document.getElementById("noteInt").value;
    let costo = parseNumero(
        document.getElementById("costoInt").value
    );
    let data = new Date().toISOString();

    await aggiornaKmAutoSeMaggiore(km);

    const vehicleRef = doc(db,"vehicles",vehicleId);
    const snap = await getDoc(vehicleRef);
    const v = snap.data();

    let nuovoTagliandoKm = v.tagliando_km;
    if(nome === "Tagliando completo"){
        const intervallo = v.tagliando_intervallo || 15000;
        nuovoTagliandoKm = Number(km) + intervallo;
    }

    const nuovoStato = calcolaTagliando(Number(km), nuovoTagliandoKm);

    await setDoc(vehicleRef,{
        tagliando_km: nuovoTagliandoKm,
        tagliando_stato: nuovoStato
    },{merge:true});

    let correlate = [];
    for(const m of cacheManut){
        const sw = document.getElementById("corr_"+m.id);
        if(sw && sw.classList.contains("switchActive")){
            correlate.push(m.id);
        }
    }

    if(registroEditId){
        await setDoc(
            doc(db,"vehicles",vehicleId,"registro",registroEditId),
            {
                manutenzione:nome,
                km:Number(km),
                officina,
                note,
                data,
                correlate
            },
            { merge:true }
        );
        setRegistroEditId(null);
    }else{
        await addDoc(
            collection(db,"vehicles",vehicleId,"registro"),
            {
                vehicleId:"default",
                manutenzione:nome,
                km:Number(km),
                data,
                officina,
                note,
                costo:costo,
                correlate
            }
        );
    }

    if(nome === "Tagliando completo"){
        for(const m of cacheManut){
            if(
                m.data.nome.includes("olio") ||
                m.data.nome.includes("filtro")
            ){
                await setDoc(
                    doc(db,"vehicles",vehicleId,"manutenzioni",m.id),
                    {
                        ultimo_km:Number(km),
                        ultima_data:data
                    },
                    {merge:true}
                );
            }
        }
    }

    /* aggiorna manutenzione principale */
    for(const m of cacheManut){
        if(m.data.nome === nome){
            await setDoc(
                doc(db,"vehicles",vehicleId,"manutenzioni",m.id),
                {
                    ultimo_km:Number(km),
                    ultima_data:data
                },
                {merge:true}
            );
        }
    }

    /* manutenzioni correlate */
    for(const m of cacheManut){
        const sw = document.getElementById("corr_"+m.id);
        if(sw && sw.classList.contains("switchActive"))
            await setDoc(
                doc(db,"vehicles",vehicleId,"manutenzioni",m.id),
                {
                    ultimo_km:Number(km),
                    ultima_data:data
                },
                {merge:true}
            );
    }
    setCacheRegistro(null);
    setCacheManut(null);
    setTab("registro");
    await render();
}

window.modificaRegistro = function(id){
    setRegistroEditId(id);
    setTab("registroAdd","registro");
    render();
}

window.eliminaRegistro = async function(id){
    if(!confirm("Eliminare intervento?")) return;
    await deleteDoc(
        doc(db,"vehicles",vehicleId,"registro",id)
    );
    await ricalcolaManutenzioni();
    setCacheRegistro(null);
    setCacheManut(null);
    await render();
}

function aggiornaCorrelate(){
    const nome = document.getElementById("nomeInt").value;
    let correlate = [];

    if(nome === "Tagliando completo"){
        correlate = cacheManut.filter(m =>
            m.data.tagliando === true
        );
    }else{
        correlate = cacheManut.filter(m =>
            m.data.dipende_da === nome
        );
    }

    let html = "";
    if(correlate.length > 0){
        html += `
            <div class="section">
                Manutenzioni correlate
            </div>
        `;

        correlate.forEach(m=>{
            html += `
                <div class="row">
                    <div class="fuelToggleRow">

                        <span class="fuelToggleLabel">
                            ${m.data.nome}
                        </span>

                        <div class="switch"
                            onclick="toggleCorrelata('${m.id}')"
                            id="corr_${m.id}">

                            <div class="switchKnob"></div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById("manutCorrelate").innerHTML = html;
}