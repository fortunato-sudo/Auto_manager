import { headerMenu } from "./ui.js";
import { calcolaStato } from "./manut.js";
import { formatNumero } from "./utils.js";

export function renderHome(appDiv, km, manutList, stats){
    let urg=0;
    let imm=0;

    manutList.forEach(item=>{
        let stato=calcolaStato(item.data,km);
        if(stato.stato==="urgente") urg++;
        if(stato.stato==="imminente") imm++;
    });

	appDiv.style.opacity = 0;
    appDiv.innerHTML+=`
        ${headerMenu('<img src="img/logo.png" class="appLogoLarge">')}
		
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
        <div id="imminenti"></div>
    `;
	appDiv.style.opacity = 1;
}