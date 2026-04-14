import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";
import { formatNumero, formatKm } from "./utils.js";
import { calcolaSaluteVeicolo, getClasseSalute, getStatoSalute } from "./stats.js"
 
export function statoVeicolo(urgenti, imminenti, tagliando){
    if(urgenti > 0){
        return {
            icon:"🔴",
            text:`${urgenti} interventi urgenti`
        };
    }

    if(tagliando === "urgente"){
        return {
            icon:"🔴",
            text:"Tagliando urgente"
        };
    }

    if(imminenti > 0){
        return {
            icon:"🟡",
            text:`${imminenti} interventi imminenti`
        };
    }

    if(tagliando === "imminente"){
        return {
            icon:"🟡",
            text:"Tagliando in arrivo"
        };
    }

    return {
        icon:"🟢",
        text:"Tutto ok"
    };
}

export function renderHome(appDiv, km, manutList, stats, vehicle, costoAuto, autonomia){
    let urg=0;
    let imm=0;

    manutList.forEach(item=>{
        let stato=calcolaStato(item.data,km);
        if(stato.stato==="urgente") urg++;
        if(stato.stato==="imminente") imm++;
    });

    let saluteData = calcolaSaluteVeicolo(urg, imm, stats);
    const nessunDato = manutList.length === 0;
    const salute = nessunDato ? null : saluteData.score;
    const problemiSalute = nessunDato ? [] : saluteData.problemi;

    let tagliandoKm = vehicle?.tagliando_km || null;
    let tagliandoStato = vehicle?.tagliando_stato || "ok";
    let tagliandoText = "-";
    if(vehicle?.tagliando_km){
        let diff = vehicle.tagliando_km - km;

        if(diff <= 0){
            tagliandoText = "⚠️ Tagliando urgente";
        }else{
            tagliandoText = `Tra ${formatKm(diff)} km`;
        }
    }

    let tagliandoProgress = 0;
    if(vehicle?.tagliando_km){
        const intervallo = vehicle.tagliando_intervallo || 15000;
        const fatto = intervallo - (vehicle.tagliando_km - km);
        tagliandoProgress = Math.max(0, Math.min(100, (fatto / intervallo) * 100));
    }

	appDiv.style.opacity = 0;
    const stato = statoVeicolo(urg, imm, null);
    const classeSalute = getClasseSalute(salute);   
    const statoSalute = getStatoSalute(salute);
    

    appDiv.innerHTML=`
        ${headerMenu("Dashboard")}

        <div class="widget healthWidget">
            <div class="wTitle">
                🚗 Salute veicolo
            </div>

            ${
                nessunDato
                ?
                `
                <div class="healthScore healthNoData">
                    —
                </div>

                <div class="healthState healthNoDataText">
                    Nessun dato
                </div>
                `
                :
                `
                <div class="healthScore ${classeSalute}">
                    ${salute}%
                </div>

                <div class="healthState ${classeSalute}">
                    ${statoSalute}
                </div>
                `
            }

            <div class="healthBar">
                <div class="healthFill ${classeSalute}" 
                    data-score="${salute}">
                </div>
            </div>

            ${
                nessunDato
                ?
                `<div class="healthIssues">
                    Aggiungi manutenzioni per monitorare lo stato del veicolo
                </div>`
                :
                problemiSalute.length > 0
                ?
                `<div class="healthIssues">
                    ${problemiSalute.join("<br>")}
                </div>`
                :
                `<div class="healthIssuesOk">Nessun problema rilevato</div>`
            }
        </div>
		
        <div class="widgets">
            <div class="widget kmWidget">
                <div class="wTitle">🚗 Chilometraggio</div>
                <div class="wValue">${Number(km).toLocaleString("it-IT")} km</div>

                <div class="kmBox">
                    <input id="km" value="${Number(km).toLocaleString('it-IT')}">
                    <button onclick="saveKm()">Aggiorna km</button>
                </div>
            </div>
        </div>

        <div class="quickActions">
            <button onclick="nav('fuelAdd')">
                ⛽ Aggiungi Rifornimento
            </button>

            <button onclick="nav('registroAdd')">
                🔧 Aggiungi Intervento 
            </button>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">
                    🚗 Autonomia veicolo
                </div>

                <div class="wValue">
                    ${autonomia ? Math.round(autonomia.autonomiaTeorica)+" km" : "-"}
                </div>

                <div class="wSub">
                    Consumo medio ${
                        stats.consumoMedio ?
                        formatNumero(stats.consumoMedio,2)+" km/l"
                        : "-"
                    }
                </div>

                <div class="wSub">
                    Ultimo pieno ${
                        autonomia ?
                        Math.round(autonomia.autonomiaUltimoPieno)+" km"
                        : "-"
                    }
                </div>
            </div>

            <div class="widget">
                <div class="wTitle">
                    ⛽ Previsione carburante mese
                </div>
                <div class="wValue">
                    ${stats.previsioneKm ?
                        formatNumero(stats.previsioneKm.costoMese,0)+" €"
                        :
                        "-"
                    }
                </div>
                <div class="wSub">
                    ${stats.previsioneKm ?
                        "Basato su "+Math.round(stats.previsioneKm.kmGiorno)+" km/giorno"
                        :
                        ""
                    }
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">
                    💰 Costi veicolo
                </div>

                <div class="wValue">
                    Questo mese ${stats.spesaMese ? formatNumero(stats.spesaMese,2)+" €" : "-"}
                </div>

                <div class="wSub">
                    Totale ${
                        costoAuto ? formatNumero(costoAuto.totale,2)+" €" : "-"
                    }
                </div>

                <div class="wSub">
                    Costo/km ${
                        costoAuto?.costoKm ?
                        formatNumero(costoAuto.costoKm,3)+" €/km"
                        : "-"
                    }
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">🔧 Tagliando</div>
                <div class="wValue">${tagliandoText}</div>
                <div class="progressBar tagliandoBar">
                    <div class="progressFill"
                        style="width:${tagliandoProgress}%; background:#ff9f0a">
                    </div>
                </div>
            </div>
        </div>

        ${
            urg > 0 || imm > 0
            ?
            `<div class="section">⚠️ Interventi da controllare</div>
            <div id="imminenti"></div>
            `
            :
            ""
        }
        ${
            urg === 0 && imm === 0
            ?
            `<div class="noInterventi">
                <div class="noInterventiIcon">✅</div>
                <div class="noInterventiText">
                    Tutto in regola
                </div>
                <div class="noInterventiSub">
                    Nessun intervento necessario
                </div>
            </div>`
            :
            ""
        }
    `;
	appDiv.style.opacity = 1;

    setTimeout(()=>{
        const bar = appDiv.querySelector(".healthFill");

        if(bar){
            const score = bar.dataset.score;
            bar.style.width = score + "%";
        }
    },100);
}