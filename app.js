import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig={
    apiKey:"AIzaSy...",
    authDomain:"auto-manutenzione.firebaseapp.com",
    projectId:"auto-manutenzione"
};

const app=initializeApp(firebaseConfig);
const db=getFirestore(app);

let tab="home";
let dettaglioManut=null;
let dettaglioId=null;
let tabPrecedente = "home";
let fuelEditId = null;
let fuelChart = null;
let cacheFuel=null;
let rendering = false;
let cacheFuel=null;
let cacheManut=null;
let cacheConfig=null;
let cacheRegistro=null;

async function aggiornaKmAutoSeMaggiore(kmNuovi){
	const conf=await getDocs(collection(db,"config"));
	let kmAttuali=0;
	conf.forEach(d=>{
		kmAttuali=d.data().km_attuali||0;
	});

	if(kmNuovi > kmAttuali){
		await setDoc(doc(db,"config","auto"),{
			km_attuali:Number(kmNuovi)
		});
	}
}

async function getFuelList(){
    const fuelSnap = await getDocs(collection(db,"fuel"));

    let fuelList=[];
    fuelSnap.forEach(docSnap=>{
        fuelList.push({
            id:docSnap.id,
            data:docSnap.data()
        });
    });

    fuelList.sort((a,b)=>{
        return new Date(b.data.data) - new Date(a.data.data);
    });
    return fuelList;
}

function formatKm(km){
    if(km === null || km === undefined) return "-";
    return Number(km).toLocaleString("it-IT");
}

function formatNumero(num, decimali){
    if(num===null || num===undefined) return "";
    return Number(num)
    .toFixed(decimali)
    .replace(".",",");
}

function getConsumoClasse(consumo){
    if(consumo >= 18) return "consumoOttimo";
    if(consumo >= 15) return "consumoBuono";
    if(consumo >= 12) return "consumoMedio";
    return "consumoBasso";
}

function calcolaStatisticheFuel(fuelList){
    let consumoTot=0;
    let countConsumi=0;
    let listaConsumi=[];
    let listaPrezzi=[];
    let anomaliaConsumo=null;
    let miglioramentoConsumo=null;
    let anomaliaPrezzo=null;
    let migliorConsumo=null;
    let peggiorConsumo=null;
    let consumoEstate=0;
    let consumoInverno=0;
    let countEstate=0;
    let countInverno=0;
    let prezzoMedio = 0;
	let countPrezzi = 0;
	let prezzoAlto = null;
    let spesaTot=0;
    let kmPercorsiTot=0;
    let oggi=new Date();
    let meseAttuale=oggi.getMonth();
    let annoAttuale=oggi.getFullYear();
    let spesaMese=0;

    fuelList.forEach(item=>{
        let s=item.data;

        if(s.consumo){
            consumoTot+=s.consumo;
            countConsumi++;
            listaConsumi.push(s.consumo);

            if(migliorConsumo===null || s.consumo>migliorConsumo){
                migliorConsumo=s.consumo;
            }

            if(peggiorConsumo===null || s.consumo<peggiorConsumo){
                peggiorConsumo=s.consumo;
            }

            if(s.litri){
                kmPercorsiTot += s.litri * s.consumo;
            }

            if(s.litro){
                listaPrezzi.push(s.litro);
            }

            if(s.data){
                let d=new Date(s.data);
                let mese=d.getMonth()+1;

                if(mese>=4 && mese<=9){
                    consumoEstate+=s.consumo;
                    countEstate++;
                }else{
                    consumoInverno+=s.consumo;
                    countInverno++;
                }
            }
        }
        
        if(s.litro){
			prezzoMedio += s.litro;
			countPrezzi++;
		}

        if(s.totale){
            spesaTot+=s.totale;
        }

        if(s.data){
            let d=new Date(s.data);

            if(d.getMonth()==meseAttuale && d.getFullYear()==annoAttuale){
                spesaMese+=s.totale;
            }
        }

        if(listaConsumi.length >= 3){
            let ultimoConsumo = listaConsumi[0];
            let somma = 0;

            for(let i = 1; i < listaConsumi.length; i++){
                somma += listaConsumi[i];
            }

            let media = somma / (listaConsumi.length - 1);
            if(media > 0){
                let diff = ((ultimoConsumo - media) / media) * 100;

                /* consumo peggiorato */
                if(diff < -15){
                    anomaliaConsumo = Math.round(Math.abs(diff));
                }

                /* consumo migliorato */
                if(diff > 10){
                    miglioramentoConsumo = Math.round(diff);
                }
            }
        }

        if(listaPrezzi.length>=5){
            let ultimoPrezzo = listaPrezzi[0];
            let somma=0;

            for(let i=1;i<listaPrezzi.length;i++){
                somma+=listaPrezzi[i];
            }

            let media = somma/(listaPrezzi.length-1);
            let diff=((ultimoPrezzo-media)/media)*100;
            if(diff>10){
                anomaliaPrezzo=Math.round(diff);
            }
        }
    });
    
    if(countPrezzi >= 5){
		prezzoMedio = prezzoMedio / countPrezzi;
		let ultimo = fuelList[0]?.data?.litro;
		if(ultimo){
			let diff = ((ultimo - prezzoMedio) / prezzoMedio) * 100;
			if(diff > 10){
				prezzoAlto = Math.round(diff);
			}
		}
	}

    let consumoMedio = countConsumi ? consumoTot/countConsumi : null;
    let estateMedia = countEstate ? consumoEstate/countEstate : null;
    let invernoMedia = countInverno ? consumoInverno/countInverno : null;
    let costoKm=null;
    let costo100km=null;

    if(spesaTot && kmPercorsiTot){
        costoKm = spesaTot/kmPercorsiTot;
        costo100km = costoKm*100;
    }

    let autonomia = null;
    let ultimoRifornimento = fuelList.length ? fuelList[0].data : null;
    if(consumoMedio && ultimoRifornimento && ultimoRifornimento.litri){
        autonomia = consumoMedio * ultimoRifornimento.litri;
    }

    return{
        consumoMedio,
        migliorConsumo,
        peggiorConsumo,
        estateMedia,
        invernoMedia,
        spesaMese,
        costoKm,
        costo100km,
        autonomia,
        anomaliaConsumo,
        miglioramentoConsumo,
        anomaliaPrezzo,
        prezzoAlto
    };
}

window.nav=function(t){
    if(t !== "back"){
        tabPrecedente = tab;
    }

    tab = t;
    render();
}

window.toggleDark=function(){
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode",document.body.classList.contains("dark"));
}

function formatDate(d){
    if(!d) return "-";
    let date = new Date(d);
    if(isNaN(date)) return "-";

    return date.toLocaleDateString("it-IT",{
        day:"numeric",
        month:"short",
        year:"numeric"
    });
}

function calcolaStato(m, kmAttuali){
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

function renderHome(appDiv, km, manutList, stats){
    let urg=0;
    let imm=0;

    manutList.forEach(item=>{
        let stato=calcolaStato(item.data,km);
        if(stato.stato==="urgente") urg++;
        if(stato.stato==="imminente") imm++;
    });
  
    appDiv.innerHTML+=`
        <div class="header">
            <button class="darkToggle" onclick="toggleDark()">🌙</button>
            <div class="titleBlock">
                <img src="img/logo.png" class="appLogoLarge">
                <div class="appTitle">
                    Garage Manager
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget kmWidget">
                <div class="wTitle">Km auto</div>
                <div class="kmBox">
                    <input id="km" value="${km}">
                    <button onclick="saveKm()">Aggiorna</button>
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">📉 Consumo medio</div>
                <div class="wValue">
                    ${stats.consumoMedio ? formatNumero(stats.consumoMedio,2)+" km/l" : "-"}
                </div>
            </div>
            <div class="widget">
                <div class="wTitle">💶 Spesa carburante mese</div>
                <div class="wValue">
                    ${stats.spesaMese ? formatNumero(stats.spesaMese,2)+" €" : "-"}
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">Interventi Urgenti</div>
                <div class="wValue">${urg}</div>
            </div>
            <div class="widget">
                <div class="wTitle">Interventi Imminenti</div>
                <div class="wValue">${imm}</div>
            </div>
        </div>

        <div class="section">Interventi imminenti o urgenti</div>
        <div class="list" id="imminenti"></div>
    `;
}

function renderManut(appDiv){
    appDiv.innerHTML+=`
        <div class="header">
            🔧 Manutenzioni
            <button class="darkToggle" onclick="toggleDark()">🌙</button>
        </div>
        <button class="addBtn" onclick="nav('manutAdd')">+ Aggiungi manutenzione</button>
        <div class="list" id="lista"></div>
    `;
}

function renderManutList(manutList, km){
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
            document.getElementById("imminenti").innerHTML+=row;

        if(tab==="manut")
            document.getElementById("lista").innerHTML+=row;
    });
}

function renderDettaglio(appDiv, m, km){
    let stato=calcolaStato(m,km);
    appDiv.innerHTML+=`
        <div class="header">
    		<div class="headerRow">
            	<button onclick="indietro()">←</button>
            	<button class="darkToggle" onclick="toggleDark()">🌙</button>
            </div>
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

function renderManutAdd(appDiv){
    if(tab==="manutAdd"){
        appDiv.innerHTML+=`
            <div class="header">
            	<div class="headerRow">
            		<button onclick="indietro()">←</button>
                    <div>Nuova manutenzione</div>
            		<button class="darkToggle" onclick="toggleDark()">🌙</button>
            	</div>
            </div>

            <div class="group">
                <div class="row">
                    <div>Nome manutenzione</div>
                    <input id="nomeMan">
                </div>

                <div class="row">
                    <div>Frequenza km</div>
                    <input id="freqKm">
                </div>

                <div class="row">
                    <div>Frequenza mesi</div>
                    <input id="freqMesi">
                </div>

                <div class="row">
                    <div>Prodotto</div>
                    <input id="prodottoMan">
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

async function renderRegistro(appDiv){
    appDiv.innerHTML+=`
        <div class="header">
            📋 Registro manutenzioni
            <button class="darkToggle" onclick="toggleDark()">🌙</button>
        </div>
        <button class="mainBtn" onclick="nav('registroAdd')">
            ➕ Nuovo intervento
        </button>
        <div class="list" id="registro"></div>
    `;

    const storico = await getDocs(collection(db,"registro"));
    let storicoList=[];
    storico.forEach(docSnap=>{
        storicoList.push({
            id:docSnap.id,
            data:docSnap.data()
        });
    });

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
                            ${formatDate(s.data.data)} | ${formatKm(s.data.km)} km
                    </div>
                    ${s.data.officina ? `<div class="manutFreq">Officina: ${s.data.officina}</div>` : ""}
                    ${s.data.note ? `<div class="manutFreq">Note: ${s.data.note}</div>` : ""}
                </div>
            </div>
        `;
    document.getElementById("registro").innerHTML+=row;
    });
}

async function renderRegistroAdd(appDiv){
    appDiv.innerHTML+=`
        <div class="header">
            	<div class="headerRow">
            		<button onclick="indietro()">←</button>
                <div>Nuovo intervento</div>
            		<button class="darkToggle" onclick="toggleDark()">🌙</button>
            	</div>
        </div>

        <div class="group">
            <div class="row">
                <div>Intervento</div>
                <input list="listaManut" id="nomeInt">
                <datalist id="listaManut"></datalist>
            </div>

            <div class="row">
                <div>Km</div>
                <input id="kmInt">
            </div>

            <div class="row">
                <div>Officina</div>
                <input id="officinaInt">
            </div>

            <div class="row">
                <div>Note</div>
                <input id="noteInt">
            </div>

            <div class="row center">
                <button onclick="salvaRegistro()">Salva</button>
            </div>
        </div>
    `;

    const manutSnap = await getDocs(collection(db,"manutenzioni"));
    let lista=document.getElementById("listaManut");
    manutSnap.forEach(doc=>{
        let opt=document.createElement("option");
        opt.value = doc.data().nome;
        lista.appendChild(opt);
    });
}

function renderFuel(appDiv, fuelList, stats){
    appDiv.innerHTML+=`
        <div class="header">
            ⛽ Rifornimenti
            <button class="darkToggle" onclick="toggleDark()">🌙</button>
        </div>
        <button onclick="nav('fuelAdd')" class="mainBtn">
            ➕ Nuovo rifornimento
        </button>
        <div class="section">Ultimi rifornimenti</div>
        <div class="list" id="fuelList"></div>
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
    
    if(stats.anomaliaConsumo){
        let media = fuelList
        .map(f=>f.data.consumo)
        .filter(c=>c)
        .reduce((a,b)=>a+b,0) /
        fuelList.filter(f=>f.data.consumo).length;

        let ultimo = fuelList.find(f=>f.data.consumo)?.data.consumo;
        let box=document.getElementById("fuelList");
        if(box){
            box.innerHTML = `
                <div class="anomaliaBox">
                    ⚠️ Consumo +${stats.anomaliaConsumo}% rispetto alla media<br>
                    
                </div>
            ` + box.innerHTML;
        }
    }

    let consumoTot=0;
    let countConsumi=0;
    let listaConsumi=[];
    let anomaliaConsumo=null;
    if(countConsumi>2){
        let media=consumoTot/countConsumi;
        // consumo ultimo rifornimento
        let ultimoConsumo=null;
        
        for(let i=0;i<fuelList.length;i++){

            if(fuelList[i].data.consumo){
                ultimoConsumo=fuelList[i].data.consumo;
                break;
            }
        }

        if(ultimoConsumo){
            let diff=((media-ultimoConsumo)/media)*100;

            if(diff>15){
                anomaliaConsumo=Math.round(diff);
            }
        }
    }

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
        let box = document.getElementById("fuelList");
        if(box){
            box.innerHTML += row;
        }
    });

    if(listaConsumi.length >= 3){
        let ultimoConsumo = listaConsumi[0];
        let media = 0;

        for(let i=1;i<listaConsumi.length;i++){
            media += listaConsumi[i];
        }
        media = media/(listaConsumi.length-1);
        let diff=((media-ultimoConsumo)/media)*100;

        if(diff>15){
            anomaliaConsumo=Math.round(diff);
        }
    }
}

async function renderFuelAdd(appDiv){
    let titoloFuel = fuelEditId ? "Modifica rifornimento" : "Nuovo rifornimento";
    appDiv.innerHTML+=`
    		<div class="header">
            	<div class="headerRow">
            		<button onclick="indietro()">←</button>
                <div>${titoloFuel}</div>
            		<button class="darkToggle" onclick="toggleDark()">🌙</button>
            	</div>
        </div>

        <div class="group">
            <div class="row">
                <div>Prezzo totale</div>
                <input id="totale" oninput="calcolaFuel('totale')">
            </div>

            <div class="row">
                <div>Prezzo al litro</div>
                <input id="litro" oninput="calcolaFuel('litro')">
            </div>

            <div class="row">
                <div>Litri</div>
                <input id="litri" oninput="calcolaFuel('litri')">
            </div>

            <div class="row">
                <div>Km auto</div>
                <input id="kmFuel">
            </div>

            <div class="row">
                <div>Distributore</div>
                <input id="distributore">
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
        const snap = await getDoc(doc(db,"fuel",fuelEditId));
        let f = snap.data();
        document.getElementById("totale").value = f.totale || "";
        document.getElementById("litro").value = f.litro || "";
        document.getElementById("litri").value = f.litri || "";
        document.getElementById("kmFuel").value = f.km || "";
        document.getElementById("distributore").value = f.distributore || "";
    }
}

function renderStats(appDiv, fuelList, stats){
    appDiv.innerHTML+=`
        <div class="header">
            📊 Statistiche
            <button class="darkToggle" onclick="toggleDark()">🌙</button>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">⛽ Consumo medio</div>
                <div class="wValue" id="mediaConsumo">-</div>
            </div>
            <div class="widget">
                <div class="wTitle">💶 Costo carburante</div>
                <div class="wValue" id="costo100km">-</div>
                <div class="wSubValue" id="costoKm">-</div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">🏆 Miglior consumo</div>
                <div class="wValue" id="bestConsumo">-</div>
            </div>
            <div class="widget">
                <div class="wTitle">⚠️ Peggior consumo</div>
                <div class="wValue" id="worstConsumo">-</div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">☀️ Consumo estate</div>
                <div class="wValue" id="consumoEstate">-</div>
            </div>
            <div class="widget">
                <div class="wTitle">❄️ Consumo inverno</div>
                <div class="wValue" id="consumoInverno">-</div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">📅 Spesa mese</div>
                <div class="wValue" id="spesaMese">-</div>
            </div>
            <div class="widget">
                <div class="wTitle">🛣️ Autonomia</div>
                <div class="wValue" id="autonomia">-</div>
            </div>
        </div>

        <div class="group">
            <div class="row">
                <div style="width:100%; height:260px;">
                    <canvas id="fuelChart"></canvas>
                </div>
            </div>
        </div>
    `;

    let consumoTot=0;
    let countConsumi=0;
    let listaConsumi=[];
    let anomaliaConsumo=null;
    let kmPercorsiTot=0;
    let spesaTot=0;
    let spesaMese=0;
    let migliorConsumo=null;
    let peggiorConsumo=null;
    let consumoEstate=0;
    let consumoInverno=0;
    let countEstate=0;
    let countInverno=0;
    let oggi=new Date();
    let meseAttuale=oggi.getMonth();
    let annoAttuale=oggi.getFullYear();
    let chartLabels=[];
    let chartData=[];
    let chartPrezzo=[];

    fuelList.forEach(item=>{
        let s = item.data;
        if(s.consumo){
        listaConsumi.push(s.consumo);
        }

        if(s.consumo && s.data){
            let d=new Date(s.data);
            let mese=d.getMonth()+1;

            if(mese>=4 && mese<=9){
                consumoEstate+=s.consumo;
                countEstate++;
            }
            else{
                consumoInverno+=s.consumo;
                countInverno++;
            }
        }

        if(s.consumo){
            consumoTot+=s.consumo;
            countConsumi++;

            if(s.litri){
                kmPercorsiTot += s.litri * s.consumo;
            }
        }

        if(s.consumo){
            if(migliorConsumo===null || s.consumo>migliorConsumo){
                migliorConsumo=s.consumo;
            }

            if(peggiorConsumo===null || s.consumo<peggiorConsumo){
                peggiorConsumo=s.consumo;
            }

        }

        if(s.consumo && s.litri){
            kmPercorsiTot += s.litri * s.consumo;
        }

        if(s.totale){
            spesaTot+=s.totale;
        }

        if(s.data){
            let d=new Date(s.data);
            if(d.getMonth()==meseAttuale && d.getFullYear()==annoAttuale){
                spesaMese+=s.totale;
            }
        }

        if(s.data){
            chartLabels.push(formatDate(s.data));
            chartData.push(
                s.consumo ? Number(s.consumo.toFixed(2)) : null
            );
            chartPrezzo.push(
                s.litro ? Number(s.litro.toFixed(3)) : null
            );
        }

    });

    if(listaConsumi.length >= 3){
        let ultimoConsumo = listaConsumi[0];
        let somma = 0;
        for(let i = 1; i < listaConsumi.length; i++){
            somma += listaConsumi[i];
        }

        let media = somma / (listaConsumi.length - 1);
        if(media > 0){
            let diff = ((media - ultimoConsumo) / media) * 100;
            if(diff > 15){
                anomaliaConsumo = Math.round(diff);
            }
        }
    }
    
    let estateMedia = countEstate ? consumoEstate/countEstate : null;
    let invernoMedia = countInverno ? consumoInverno/countInverno : null;
    if(stats.autonomia){
        document.getElementById("autonomia").innerText =
        formatNumero(stats.autonomia,0)+" km";
    }

    if(chartData.length > 0 && typeof Chart !== "undefined"){
        const ctx = document.getElementById("fuelChart");
        if(ctx){
            if(fuelChart){
                fuelChart.destroy();
            }

            fuelChart = new Chart(ctx,{
                type:"line",

                data:{
                    labels:chartLabels,
                    datasets:[
                        {
                            label:"Consumo km/l",
                            data:chartData,
                            borderColor:"#007aff",
                            backgroundColor:"rgba(0,122,255,0.15)",
                            tension:0.3,
                            yAxisID:"y1",
                            pointRadius:5,
                            borderWidth:3
                        },
                        {
                            label:"Prezzo €/L",
                            data:chartPrezzo,
                            borderColor:"#ff9f0a",
                            backgroundColor:"rgba(255,159,10,0.15)",
                            tension:0.3,
                            yAxisID:"y2",
                            pointRadius:5,
                            borderWidth:3
                        }
                    ]
                },
                options:{
                    responsive:true,
                    maintainAspectRatio:false,
                    plugins:{
                        legend:{
                            display:true,
                            position:"top",
                            labels:{
                                boxWidth:12,
                                boxHeight:12,
                                padding:10,
                                font:{
                                    size:12
                                },
                                color:"#6e6e73"
                            }
                        }
                    },
                    scales:{
                        y1:{
                            position:"left",
                            beginAtZero:false
                        },
                        y2:{
                            position:"right",
                            beginAtZero:false,
                            grid:{
                                drawOnChartArea:false
                            }
                        }
                    }
                }
            });
        }
    }

    if(stats.consumoMedio){
        document.getElementById("mediaConsumo").innerText=
        formatNumero(stats.consumoMedio,2)+" km/l";
    }

    let ultimoConsumo=null;
    fuelList.forEach(item=>{
        if(item.data.consumo && !ultimoConsumo){
            ultimoConsumo=item.data.consumo;
        }
    });

    if(ultimoConsumo && countConsumi>2){
        let media=(consumoTot/countConsumi);
        let diff=((media-ultimoConsumo)/media)*100;
        if(diff>15){
            anomaliaConsumo=Math.round(diff);
        }
    }

    if(stats.migliorConsumo!==null){
        document.getElementById("bestConsumo").innerText=
        formatNumero(stats.migliorConsumo,2)+" km/l";
    }

    if(stats.peggiorConsumo!==null){
        document.getElementById("worstConsumo").innerText=
        formatNumero(stats.peggiorConsumo,2)+" km/l";
    }

    if(stats.costoKm){
        document.getElementById("costoKm").innerText =
        formatNumero(stats.costoKm,2)+" €/km";

        document.getElementById("costo100km").innerText =
        formatNumero(stats.costo100km,2)+" €/100 km";
    }
    document.getElementById("spesaMese").innerText=
    formatNumero(stats.spesaMese,2)+" €";

    if(stats.estateMedia){
        document.getElementById("consumoEstate").innerText=
        formatNumero(stats.estateMedia,2)+" km/l";
    }

    if(stats.invernoMedia){
        document.getElementById("consumoInverno").innerText=
        formatNumero(stats.invernoMedia,2)+" km/l";
    }
}

appDiv.innerHTML = `
	<div style="padding:20px">
		<div class="skeleton"></div>
		<div class="skeleton"></div>
		<div class="skeleton"></div>
	</div>
`;

async function render(){
    if(rendering) return;
    rendering = true;
    try{
        const appDiv=document.getElementById("app");
        appDiv.innerHTML="";
        if(!cacheFuel){
            cacheFuel = await getFuelList();
        }
        const fuelList = cacheFuel;
        const stats = calcolaStatisticheFuel(fuelList);

        let km=0;
        const conf=await getDocs(collection(db,"config"));
        conf.forEach(d=>km=d.data().km_attuali||0);
        const manut=await getDocs(collection(db,"manutenzioni"));

        let manutList=[];
        manut.forEach(docSnap=>{
            manutList.push({
                id:docSnap.id,
                data:docSnap.data()
            });
        });

        manutList.sort((a,b)=>{
            let kmA=(a.data.ultimo_km||0)+(a.data.frequenza_km||0);
            let kmB=(b.data.ultimo_km||0)+(b.data.frequenza_km||0);
            return kmA-kmB;
        });

        if(tab==="home"){
            renderHome(appDiv, km, manutList, stats);
        }

        if(tab==="manut"){
            renderManut(appDiv);
        }

        if(tab==="manutAdd"){
            renderManutAdd(appDiv);
        }

        if(tab==="registro"){
            await renderRegistro(appDiv);
        }

        if(tab==="registroAdd"){
            await renderRegistroAdd(appDiv);
        }

        if(tab==="fuel"){
            renderFuel(appDiv, fuelList, stats);
        }

        if(tab==="fuelAdd"){
            await renderFuelAdd(appDiv);
        }

        if(tab==="stats"){
        renderStats(appDiv, fuelList, stats);
        }

        if(tab==="dettaglio"){
            renderDettaglio(appDiv, dettaglioManut, km);
        }

        renderManutList(manutList, km);
    }catch(err){
        console.error("Errore render:",err);
        document.getElementById("app").innerHTML=
        `<div style="padding:20px">
            Errore app.<br>
            Apri la console (F12).
        </div>`;
    }
    finally{
        rendering = false;
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
    tab="manut";
    render();
}

function parseNumero(val){
    if(!val) return null;
    return parseFloat(
        val.replace(",",".")
    );
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
        manutenzione:nome,
        km:Number(km),
        data:data,
        officina:officina,
        note:note
    });

    /* aggiorna la manutenzione */
    const manutSnap = await getDocs(collection(db,"manutenzioni"));
    manutSnap.forEach(async docSnap=>{
        if(docSnap.data().nome===nome){
            await setDoc(doc(db,"manutenzioni",docSnap.id),{
                ultimo_km:Number(km),
                ultima_data:data
            },{merge:true});
        }
    });
    tab="registro";
    render();
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
    const fuelSnap = await getDocs(collection(db,"fuel"));
    let ultimoKm = null;
    fuelSnap.forEach(d=>{
        let k = Number(d.data().km);
        if(km > k){
            if(ultimoKm === null || k > ultimoKm){
                ultimoKm = k;
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
        await setDoc(doc(db,"fuel",fuelEditId),{
            totale,
            litro,
            litri,
            km,
            distributore,
            consumo,
            data:new Date().toISOString().split("T")[0]
        },{merge:true});
        fuelEditId=null;
    }else{
        await addDoc(collection(db,"fuel"),{
            totale,
            litro,
            litri,
            km,
            distributore,
            consumo,
            data:new Date().toISOString().split("T")[0]
        });
    }
    cacheFuel=null;
    tab="fuel";
    render();
}

window.apriRegistro = async function(id){
    let scelta = prompt(
        "1 = Modifica\n2 = Elimina"
    );

    if(scelta=="2"){
        if(confirm("Eliminare intervento?")){
            await deleteDoc(doc(db,"registro",id));
            render();
        }
    }

    if(scelta=="1"){
        let nuovoKm = prompt("Nuovi KM");
        if(!nuovoKm) return;
        await setDoc(doc(db,"registro",id),{
            km:Number(nuovoKm)
        },{merge:true});
        render();
    }
}

window.saveKm=async function(){
    let km=document.getElementById("km").value;
    await setDoc(doc(db,"config","auto"),{
        km_attuali:Number(km)
    });
    render();
}

window.apriDettaglio=async function(id){
    const snap=await getDocs(collection(db,"manutenzioni"));
    snap.forEach(docSnap=>{
        if(docSnap.id===id){
            dettaglioManut=docSnap.data();
            dettaglioId=id;
        }
    });
    tab="dettaglio";
    render();
}

window.eliminaFuel = async function(id){
    if(confirm("Eliminare questo rifornimento?")){
        await deleteDoc(doc(db,"fuel",id));
        cacheFuel=null;
        render();
    }
}

window.modificaFuel = function(id){
    fuelEditId = id;
    tab = "fuelAdd";
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

window.eliminaManutenzione=async function(){
    if(confirm("Eliminare questa manutenzione?")){
        await deleteDoc(doc(db,"manutenzioni",dettaglioId));
        tab="manut";
        render();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem("darkMode")==="true"){
        document.body.classList.add("dark");
    }
    render();
});