import { db, collection, addDoc, setDoc, getDoc, doc, deleteDoc } from "./firebase.js";
import { headerMenu, headerBack } from "./ui.js";
import { formatDate, formatDateOnly, formatKm } from "./utils.js";
import { 
    tab, 
    cacheManut, 
    dettaglioManut, 
    dettaglioId, 
    setTab, 
    setDettaglioManut, 
    setDettaglioId, 
    setCacheManut, 
    setTabPrecedente, 
    vehicleId 
} from "./state.js";

export function renderManut(appDiv){
    appDiv.innerHTML+=`
        ${headerMenu("Manutenzioni")}
        <button class="mainBtn" onclick="nav('manutAdd')">
            + Aggiungi manutenzione
        </button>

        <button class="secondaryBtn" onclick="nav('manutHistory')">
            Cronologia manutenzioni
        </button>

        <div class="section">Lista manutenzioni</div>
        <div id="lista"></div>
    `;
}

export function renderManutList(manutList, km){
    manutList = [...manutList].sort((a,b)=>{
        let statoA = calcolaStato(a.data,km);
        let statoB = calcolaStato(b.data,km);
        
        const ordine = {
            urgente:0,
            imminente:1,
            ok:2
        };
        
        if(ordine[statoA.stato] !== ordine[statoB.stato]){
            return ordine[statoA.stato] - ordine[statoB.stato];
        }
        
        let scadA = statoA.nextKm ?? Infinity;
        let scadB = statoB.nextKm ?? Infinity;
        return scadA - scadB;
    });
    
    let htmlHome="";
    let htmlManut="";
    manutList.forEach(item=>{
        let m=item.data;
        let id=item.id;
        let stato = calcolaStato(m,km);
        let scadenzaTesto = "";
        let kmMancanti = null;

        if(m.ultimo_km !== undefined && stato.nextKm !== null){
            kmMancanti = stato.nextKm - km;
        }

        if(!m.ultimo_km && !m.ultima_data){
            scadenzaTesto = "Mai effettuato";
        }

        if(
            m.frequenza_km > 0 &&
            m.frequenza_mesi > 0
        ){
            if(stato.nextDate){
                scadenzaTesto =
                `${formatDateOnly(stato.nextDate)} | ${formatScadenza(kmMancanti)}`;
            }else{
                scadenzaTesto =
                formatScadenza(kmMancanti);
            }
        }

        // caso: solo km
        else if(
            m.frequenza_km > 0
        ){
            scadenzaTesto =
            formatScadenza(kmMancanti);
        }

        // caso: solo mesi
        else if(
            m.frequenza_mesi > 0
        ){
            scadenzaTesto =
            formatDateOnly(stato.nextDate);
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
                        ${scadenzaTesto}
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
                <div class="formGroup">
                <div class="formLabel">Nome manutenzione</div>
                    <input id="nomeMan" class="formInput" placeholder="Sostituzione olio motore">
                </div>

                <div class="formGroup">
                    <div class="formLabel">Frequenza km</div>
                    <input id="freqKm" class="formInput" placeholder="15000">
                </div>

                <div class="formGroup">
                    <div class="formLabel">Frequenza mesi</div>
                    <input id="freqMesi" class="formInput" placeholder="12">
                </div>

                <div class="formGroup">
                    <div class="formLabel">Prodotto</div>
                    <input id="prodottoMan" class="formInput" placeholder="Motul Specific 0720 5W-30">
                </div>

                <div class="formGroup">
                    <div class="formLabel">Immagine (URL GitHub)</div>
                    <input id="imgMan" class="formInput">
                </div>

                <button class="formButton" onclick="salvaManutenzione()">
                    Salva manutenzione
                </button>
            </div>
        `;
    }
}

export function formatScadenza(kmRestanti){
    if(kmRestanti === null) return "-";

    if(kmRestanti < 0){
        return `⚠️ Scaduto da ${formatKm(Math.abs(kmRestanti))} km`;
    }

    if(kmRestanti === 0){
        return "Scade ora";
    }
    return `⏳ Tra ${formatKm(kmRestanti)} km`;
}

export function calcolaTagliando(kmAttuali, kmTagliando){
    if(!kmTagliando) return "ok";
    const diff = kmTagliando - kmAttuali;

    if(diff <= 0){
        return "urgente";
    }

    if(diff <= 1500){
        return "imminente";
    }
    return "ok";
}

window.aggiungiManutenzione=function(){
    let nome=prompt("Nome manutenzione | Frequenza km | Frequenza mesi | Prodotto\n\nEsempio:\nOlio motore, 15000, 12, Motul");
    if(!nome) return;
    let parts=nome.split(",");
    let nomeMan=parts[0];
    let km=parts[1];
    let mesi=parts[2];
    let prodotto=parts[3];

    addDoc(collection(db,"vehicles",vehicleId,"manutenzioni"),{
        vehicleId:vehicleId,
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

    await addDoc(collection(db,"vehicles",vehicleId,"manutenzioni"),{
        vehicleId: vehicleId,
        nome:nome,
        frequenza_km:Number(km),
        frequenza_mesi:Number(mesi),
        prodotto:prodotto,
        immagine:img
    });
    setCacheManut(null);
    setTab("manut");
    render();
}

window.segnaFatto = async function(){
    let km = prompt("KM intervento");
    if(!km) return;
    await aggiornaKmAutoSeMaggiore(km);
    let officina = prompt("Officina (facoltativo)");
    let note = prompt("Note (facoltativo)");
    let data = new Date().toISOString().split("T")[0];

    const vehicleRef = doc(db,"vehicles",vehicleId);
    const snap = await getDoc(vehicleRef);
    const v = snap.data();

    let nuovoTagliandoKm = v.tagliando_km || null;
    if(nome === "TAGLIANDO_COMPLETO"){
        const intervallo = v.tagliando_intervallo || 15000;
        nuovoTagliandoKm = Number(km) + intervallo;
    }
    
    const nuovoStato = calcolaTagliando(Number(km), nuovoTagliandoKm);

    await setDoc(vehicleRef,{
        tagliando_km: nuovoTagliandoKm,
        tagliando_stato: nuovoStato
    },{merge:true});

    await addDoc(collection(db,"vehicles",vehicleId,"registro"),{
        manutenzione: dettaglioManut.nome,
        km: Number(km),
        data: data,
        officina: officina || "",
        note: note || ""
    });

    await setDoc(doc(db,"vehicles",vehicleId,"manutenzioni",dettaglioId),{
        ultimo_km:Number(km),
        ultima_data:data
    },{merge:true});
    setCacheManut(null);
    setTab("home");
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
        if(progress > 100) progress = 100;
        if(progress < 0) progress = 0;
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
    setTabPrecedente(tab);
    let item = cacheManut.find(m=>m.id===id);
    if(item){
        setDettaglioManut(item.data);
        setDettaglioId(id);
    }
    setTab("dettaglio");
    render();
}

export function renderDettaglio(appDiv, m, km){
    let stato = calcolaStato(m,km);

    let colore = "#007aff";
    if(stato.stato === "imminente") colore = "#ff9f0a";
    if(stato.stato === "urgente") colore = "#ff3b30";

    let prossimoTesto =
        `${formatDateOnly(stato.nextDate)} | ${formatKm(stato.nextKm)} km`;

    if(stato.stato === "urgente"){
        prossimoTesto =
        `⚠️ Scaduto | ${formatKm(stato.nextKm)} km`;
    }

    appDiv.innerHTML+=`
        <div class="headerBar">
                <button class="headerBack" onclick="indietro()">←</button>
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

        <div class="detailCard">

            <div class="detailRow">
                <div class="detailLabel">Ultimo intervento</div>
                <div class="detailValue">
                    ${formatDateOnly(m.ultima_data)} | ${formatKm(m.ultimo_km)} km
                </div>
            </div>

            <div class="detailRow">
                <div class="detailLabel">Prossimo intervento</div>
                <div class="detailValue" style="color:${colore}">
                    ${prossimoTesto}
                </div>
            </div>

            <div class="detailRow productLabel">
                <div class="detailLabel">Prodotto consigliato</div>
            </div>

            <div class="detailRow productValue">
                <div class="detailValue">${m.prodotto||"-"}</div>
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
        await deleteDoc(doc(db,"vehicles",vehicleId,"manutenzioni",dettaglioId));
        setCacheManut(null);
        setTab("manut");
        render();
    }
}
