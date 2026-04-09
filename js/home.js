import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";
import { formatNumero, formatKm } from "./utils.js";

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

    let tagliandoKm = vehicle?.tagliando_km || null;
    let tagliandoStato = vehicle?.tagliando_stato || "ok";
    let tagliandoText = "-";
    if(vehicle.tagliando_km){
        let diff = vehicle.tagliando_km - km;

        if(diff <= 0){
            tagliandoText = "⚠️ Tagliando urgente";
        }else{
            tagliandoText = `Tra ${formatKm(diff)} km`;
        }
    }

    let tagliandoProgress = 0;
    if(vehicle.tagliando_km){
        const intervallo = vehicle.tagliando_intervallo || 15000;
        const fatto = intervallo - (vehicle.tagliando_km - km);
        tagliandoProgress = Math.max(0, Math.min(100, (fatto / intervallo) * 100));
    }

	appDiv.style.opacity = 0;
    const stato = statoVeicolo(urg, imm, null);
    appDiv.innerHTML+=`
        ${headerMenu("Dashboard")}

        <div class="widgets">
            <div class="widget statoWidget">
                <div class="wTitle">🚗 Stato veicolo</div>
                <div class="wValue statoValue">
                    ${stato.icon} ${stato.text}
                </div>
            </div>
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

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">
                    🚗 Autonomia stimata
                </div>
                <div class="wValue">
                    ${autonomia ? Math.round(autonomia.autonomiaTeorica)+" km" : "-"}
                </div>
                <div class="wSub">
                    Ultimo pieno: ${
                        autonomia ? Math.round(autonomia.autonomiaUltimoPieno)+" km" : "-"
                    }
                </div>
            </div>
        </div>

        <div class="widgets">
            <div class="widget">
                <div class="wTitle">⛽ Consumo medio</div>
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
                <div class="wTitle">
                    ⛽ Costo totale carburante:
                    ${costoAuto ? formatNumero(costoAuto.carburanteTot,2)+" €" : "-"}
                </div>

                <div class="wTitle">
                    🔧 Costo totale manutenzione: 
                    ${costoAuto ? formatNumero(costoAuto.manutTot,2)+" €" : "-"}
                </div>
            </div>

            <div class="widget">
                <div class="wTitle">
                    💰 Costo totale veicolo:
                    ${costoAuto ? formatNumero(costoAuto.totale,2)+" €" : "-"}
                </div>

                <div class="wTitle">
                    📉 ${costoAuto?.costoKm ? formatNumero(costoAuto.costoKm,3)+" €/km" : "-"}
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

        <div class="section">⚠️ Interventi da controllare</div>
        <div id="imminenti"></div>
    `;
	appDiv.style.opacity = 1;
}