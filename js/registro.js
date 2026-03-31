import { db, collection, getDocs, addDoc, setDoc, deleteDoc, doc } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatDateOnly, formatKm } from "./utils.js";
import { cacheManut, setCacheManut, cacheRegistro, setCacheRegistro ,setTab } from "./state.js";

export async function renderRegistro(appDiv){
    appDiv.innerHTML+=`
        ${headerMenu("Registro")}
        <button class="mainBtn" onclick="nav('registroAdd')">
            + Nuovo intervento
        </button>
        <div id="registro"></div>
    `;
    
    let storicoList = [];
    if(!cacheRegistro){
		const snap = await getDocs(collection(db,"registro"));
		const temp = snap.docs.map(doc=>({
			id:doc.id,
			data:doc.data()
		}));
	setCacheRegistro(temp);
	}
    storicoList = cacheRegistro;

    storicoList.sort((a,b)=>{
        return new Date(b.data.data) - new Date(a.data.data);
    });

    storicoList.forEach(s=>{
        let row = `
            <div class="manutRow" onclick="apriRegistro('${s.id}')">
                <div class="manutInfo">
                    <div class="manutTitle">
                        ${s.data.manutenzione}
                    </div>

                    <div class="manutFreq">
                            ${formatDateOnly(s.data.data)} | ${formatKm(s.data.km)} km
                    </div>
                    ${s.data.officina ? `<div class="manutFreq">Officina: ${s.data.officina}</div>` : ""}
                    ${s.data.note ? `<div class="manutFreq">Note: ${s.data.note}</div>` : ""}
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
                <select id="nomeInt"></select>
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
        cacheManut.forEach(m=>{
            select.innerHTML += `
                <option value="${m.data.nome}">
                    ${m.data.nome}
                </option>
            `;
        });
    }      
}

window.salvaRegistro = async function(){
    let nome=document.getElementById("nomeInt").value;
    let km=document.getElementById("kmInt").value;
    await aggiornaKmAutoSeMaggiore(km);
    let officina=document.getElementById("officinaInt").value;
    let note=document.getElementById("noteInt").value;
    let data=new Date().toISOString().split("T")[0];

    /* salva nel registro */
    await addDoc(collection(db,"registro"),{
        vehicleId:"default",
        manutenzione:nome,
        km:Number(km),
        data:data,
        officina:officina,
        note:note
    })

    /* aggiorna la manutenzione */
    cacheManut.forEach(async m=>{
        if(m.data.nome===nome){
            await setDoc(doc(db,"manutenzioni",m.id),{
                ultimo_km:Number(km),
                ultima_data:data
            },{merge:true});
        }
    });
    setCacheManut(null);
	setCacheRegistro(null);
    setTab("registro");
    await render();
}

window.apriRegistro = async function(id){
    let scelta = prompt(
        "1 = Modifica\n2 = Elimina"
    );

    if(scelta=="2"){
        if(confirm("Eliminare intervento?")){
            await deleteDoc(doc(db,"registro",id));
            await render();
        }
    }

    if(scelta=="1"){
        let nuovoKm = prompt("Nuovi KM");
        if(!nuovoKm) return;
        await setDoc(doc(db,"registro",id),{
            km:Number(nuovoKm)
        },{merge:true});
        await render();
    }
}
