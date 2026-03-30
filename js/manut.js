import { db, collection, addDoc, setDoc, doc, deleteDoc } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatDate, formatKm } from "./utils.js";
import { cacheManut } from "./state.js";

export function renderManut(appDiv){
    appDiv.innerHTML+=`
        ${headerMenu("Manutenzioni")}
        <button class="addBtn" onclick="nav('manutAdd')">+ Aggiungi manutenzione</button>
        <div id="lista"></div>
    `;
}

export function renderManutList(manutList, km){
	let htmlHome="";
    let htmlManut="";
    manutList.forEach(item=>{
        let m=item.data;
        let id=item.id;
        let stato = calcolaStato(m,km);
        let scadenzaTesto = "";
        let kmMancanti = null;

        if(stato.nextKm !== null){
            kmMancanti = stato.nextKm - km;
        }

        // caso: km + mesi
        if(
            m.frequenza_km > 0 &&
            m.frequenza_mesi > 0
        ){
            scadenzaTesto =
            `${formatDate(stato.nextDate)} | ${formatKm(kmMancanti)} km rimasti`;

        }

        // caso: solo km
        else if(
            m.frequenza_km > 0
        ){
            scadenzaTesto =
            `${formatKm(kmMancanti)} km rimasti`;
        }

        // caso: solo mesi
        else if(
            m.frequenza_mesi > 0
        ){
            scadenzaTesto =
            formatDate(stato.nextDate);
        }

        let periodicita = "";
        if(m.frequenza_km > 0 && m.frequenza_mesi > 0){
            periodicita =
            `${formatKm(m.frequenza_km)} km / ${m.frequenza_mesi} mesi`;
        }

        else if(m.frequenza_km > 0){
            periodicita =
            `${formatKm(m.frequenza_km)} km`;
        }

        else if(m.frequenza_mesi > 0){
            periodicita =
            `${m.frequenza_mesi} mesi`;
        }

        let row=`
            <div class="manutRow" onclick="apriDettaglio('${id}')">
                <img class="manutImg" src="img/${m.nome}.JPG">
                <div class="manutInfo">
                    <div class="manutNext">
                        Scadenza: ${scadenzaTesto}
                    </div>
                    <div class="manutTitle">
                        ${m.nome}
                    </div>
                    <div class="manutFreq">
                        Periodicità: ${periodicita}
                    </div>
                    <div class="progressBar">
                        <div class="progressFill" style="width:${stato.progress}%; background:${stato.colore}"></div>
                    </div>
                </div>
            </div>
        `;

        if(tab==="home" && stato.stato!=="ok")
            htmlHome += row;

        if(tab==="manut")
            htmlManut += row;
    });
	if(tab==="home"){
	    let box=document.getElementById("imminenti");
	    if(box) box.innerHTML = htmlHome;
    }

    if(tab==="manut"){
	    let box=document.getElementById("lista");
	    if(box) box.innerHTML = htmlManut;
    }
}

export function renderManutAdd(appDiv){
    if(tab==="manutAdd"){
        appDiv.innerHTML+=`
            ${headerBack("Nuova manutenzione")}

            <div class="group">
                <div class="row">
                    <div>Nome manutenzione</div>
                    <input id="nomeMan" placeholder="Es. Olio motore">
                </div>

                <div class="row">
                    <div>Frequenza km</div>
                    <input id="freqKm" placeholder="km">
                </div>

                <div class="row">
                    <div>Frequenza mesi</div>
                    <input id="freqMesi" placeholder="mesi">
                </div>

                <div class="row">
                    <div>Prodotto</div>
                    <input id="prodottoMan" placeholder="Es. Motul 8100">
                </div>

                <div class="row">
                    <div>Immagine (URL GitHub)</div>
                    <input id="imgMan">
                </div>

                <div class="row center">
                    <button onclick="salvaManutenzione()">Salva</button>
                </div>
            </div>
        `;
    }
}

window.aggiungiManutenzione=function(){
    let nome=prompt("Nome manutenzione | Frequenza km | Frequenza mesi | Prodotto\n\nEsempio:\nOlio motore, 15000, 12, Motul");
    if(!nome) return;
    let parts=nome.split(",");
    let nomeMan=parts[0];
    let km=parts[1];
    let mesi=parts[2];
    let prodotto=parts[3];

    addDoc(collection(db,"manutenzioni"),{
        nome:nomeMan,
        frequenza_km:Number(km),
        frequenza_mesi:Number(mesi),
        prodotto
    }).then(()=>render());
}

window.salvaManutenzione = async function(){
    let nome = document.getElementById("nomeMan").value;
    let km = document.getElementById("freqKm").value;
    let mesi = document.getElementById("freqMesi").value;
    let prodotto = document.getElementById("prodottoMan").value;
    let img = document.getElementById("imgMan").value;

    await addDoc(collection(db,"manutenzioni"),{
        nome:nome,
        frequenza_km:Number(km),
        frequenza_mesi:Number(mesi),
        prodotto:prodotto,
        immagine:img
    });
    cacheManut = null;
    tab="manut";
    render();
}

window.segnaFatto = async function(){
    let km = prompt("KM intervento");
    if(!km) return;
    await aggiornaKmAutoSeMaggiore(km);
    let officina = prompt("Officina (facoltativo)");
    let note = prompt("Note (facoltativo)");
    let data = new Date().toISOString().split("T")[0];

    await addDoc(collection(db,"registro"),{
        manutenzione: dettaglioManut.nome,
        km: Number(km),
        data: data,
        officina: officina || "",
        note: note || ""
    });

    await setDoc(doc(db,"manutenzioni",dettaglioId),{
        ultimo_km:Number(km),
        ultima_data:data
    },{merge:true});
    tab="home";
    render();
}

export function calcolaStato(m, kmAttuali){
    let nextKm = null;
    let kmLeft = null;

    if(m.frequenza_km && m.frequenza_km > 0){
        nextKm = (m.ultimo_km || 0) + m.frequenza_km;
        kmLeft = nextKm - kmAttuali;
    }

    let prossimaData = null;
    let mesiLeft = null;
    if(m.ultima_data && m.frequenza_mesi){
        let ultima = new Date(m.ultima_data);
        prossimaData = new Date(ultima);
        prossimaData.setMonth(prossimaData.getMonth() + m.frequenza_mesi);
        let oggi = new Date();
        mesiLeft =
            (prossimaData.getFullYear() - oggi.getFullYear()) * 12 +
            (prossimaData.getMonth() - oggi.getMonth());
    }

    let stato = "ok";
    if(
        (kmLeft !== null && kmLeft <= 0) ||
        (mesiLeft !== null && mesiLeft <= 0)
    ){
        stato = "urgente";
    }

    else if(
        (kmLeft !== null && kmLeft <= 8000) ||
        (mesiLeft !== null && mesiLeft <= 6)
    ){
        stato = "imminente";
    }

    let progress = 0;
    if(m.frequenza_km && m.frequenza_km > 0){
        progress = ((kmAttuali - (m.ultimo_km || 0)) / m.frequenza_km) * 100;
    }

    else if(m.frequenza_mesi && m.ultima_data){
        let ultima = new Date(m.ultima_data);
        let prossima = new Date(ultima);
        prossima.setMonth(prossima.getMonth() + m.frequenza_mesi);
        let oggi = new Date();
        let totale = prossima - ultima;
        let passato = oggi - ultima;
        progress = (passato / totale) * 100;
        if(progress < 0) progress = 0;
        if(progress > 100) progress = 100;
    }

    let colore = "#007aff";
    if(stato === "imminente") colore = "#ff9f0a";
    if(stato === "urgente") colore = "#ff3b30";

    return{
        stato: stato,
        nextKm: nextKm,
        nextDate: prossimaData ? prossimaData.toISOString().split("T")[0] : null,
        progress: progress,
        colore: colore
    };
}

window.apriDettaglio=function(id){
	let item = cacheManut.find(m=>m.id===id);
	if(item){
		dettaglioManut=item.data;
		dettaglioId=id;
	}
	tab="dettaglio";
	render();
}

export function renderDettaglio(appDiv, m, km){
    let stato=calcolaStato(m,km);
    appDiv.innerHTML+=`
        <div class="headerBar">
            	<button class="headerBack" onclick="indietro()">←</button>
            	<button class="darkToggle headerDark" onclick="toggleDark()">🌙</button>
        </div>

        <div class="detailTop">
            <img class="detailImg" src="img/${m.nome}.JPG">
            <div>
                <div class="detailTitle">${m.nome}</div>
                <div class="detailFreq">
                    Periodicità: ${m.frequenza_km} km / ${m.frequenza_mesi} mesi
                </div>
            </div>
        </div>

        <div class="group">
            <div class="row">
                <div>Ultimo intervento</div>
                <div>${formatDate(m.ultima_data)} | ${formatKm(m.ultimo_km)} km</div>
            </div>
            <div class="row">
                <div>Prossimo intervento</div>
                <div>${formatDate(stato.nextDate)} | ${formatKm(stato.nextKm)} km</div>
            </div>
            <div class="row productLabel">
                <div>Prodotto:</div>
            </div>
            <div class="row productValue">
                <div>${m.prodotto||"-"}</div>
            </div>
        </div>

        <div class="manutActions">
            <button class="manutBtnPrimary" onclick="segnaFatto()">
                Registra intervento
            </button>
            <button class="manutBtnDelete" onclick="eliminaManutenzione()">
                Elimina manutenzione
            </button>
        </div>
    `;
}

window.eliminaManutenzione=async function(){
    if(confirm("Eliminare questa manutenzione?")){
        await deleteDoc(doc(db,"manutenzioni",dettaglioId));
        cacheManut = null;
        tab="manut";
        render();
    }
}