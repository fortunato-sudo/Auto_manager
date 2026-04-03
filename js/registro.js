import { db, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, doc } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatDateOnly, formatKm } from "./utils.js";
import { cacheManut, setCacheManut, cacheRegistro, setCacheRegistro ,setTab, vehicleId, registroEditId, setRegistroEditId } from "./state.js";

export async function renderRegistro(appDiv){
    appDiv.innerHTML+=`
        ${headerMenu("Registro")}
        <button class="mainBtn" onclick="nav('registroAdd')">
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

export async function renderRegistroAdd(appDiv){
    appDiv.innerHTML+=`
        ${headerBack("Nuovo intervento")}

        <div class="group">
            <div class="row">
                <div>Intervento</div>
                <select id="nomeInt" class="selectIntervento"></select>
            </div>

            <div class="row">
                <div>Km</div>
                <input id="kmInt" placeholder="km intervento">
            </div>

            <div class="row">
                <div>Officina</div>
                <input id="officinaInt" placeholder="Nome officina">
            </div>

            <div class="row">
                <div>Note</div>
                <input id="noteInt" placeholder="Note (facoltative)">
            </div>

            <div class="row center">
                <button onclick="salvaRegistro()">Salva</button>
            </div>
        </div>
    `;

    let select=document.getElementById("nomeInt");
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

    if(registroEditId){
        const snap = await getDoc(
            doc(db,"vehicles",vehicleId,"registro",registroEditId)
        );

        const r = snap.data();

        document.getElementById("nomeInt").value = r.manutenzione || "";
        document.getElementById("kmInt").value = r.km || "";
        document.getElementById("officinaInt").value = r.officina || "";
        document.getElementById("noteInt").value = r.note || "";
    }
}

window.salvaRegistro = async function(){
    let nome = document.getElementById("nomeInt").value;
    let km = document.getElementById("kmInt").value;
    let officina = document.getElementById("officinaInt").value;
    let note = document.getElementById("noteInt").value;
    let data = new Date().toISOString();

    await aggiornaKmAutoSeMaggiore(km);

    const vehicleRef = doc(db,"vehicles",vehicleId);
    const snap = await getDoc(vehicleRef);
    const v = snap.data();
    const nuovoStato = calcolaTagliando(km, v.tagliando_km);
    await setDoc(vehicleRef,{
        tagliando_stato: nuovoStato
    },{merge:true});

    if(registroEditId){
        await setDoc(
            doc(db,"vehicles",vehicleId,"registro",registroEditId),
            {
                manutenzione:nome,
                km:Number(km),
                officina,
                note,
                data
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
                note
            }
        );
    }
    setCacheRegistro(null);
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
    const snap = await getDoc(
        doc(db,"vehicles",vehicleId,"registro",id)
    );

    const nomeManut = snap.data().manutenzione;
    await deleteDoc(
        doc(db,"vehicles",vehicleId,"registro",id)
    );

    /* trova ultimo intervento rimasto */
    const storico = await getDocs(
        collection(db,"vehicles",vehicleId,"registro")
    );

    let ultimoKm = 0;
    let ultimaData = null;
    storico.forEach(d=>{
        const r = d.data();
        if(r.manutenzione === nomeManut){
            if(r.km > ultimoKm){
                ultimoKm = r.km;
                ultimaData = r.data;
            }
        }
    });

    /* aggiorna manutenzione */
    cacheManut.forEach(async m=>{
        if(m.data.nome === nomeManut){
            await setDoc(
                doc(db,"vehicles",vehicleId,"manutenzioni",m.id),
                {
                    ultimo_km: ultimoKm,
                    ultima_data: ultimaData
                },
                { merge:true }
            );
        }
    });
    setCacheRegistro(null);
    setCacheManut(null);
    await render();
}
