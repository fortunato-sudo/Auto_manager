import { fuelChart, setFuelChart } from "./state.js";
import { headerMenu } from "./ui.js";
import { formatNumero } from "./utils.js";

export function calcolaStatisticheFuel(fuelList){
    let consumoTot=0;
    let countConsumi=0;

    let migliorConsumo=null;
    let peggiorConsumo=null;

    let consumoEstate=0;
    let consumoInverno=0;
    let countEstate=0;
    let countInverno=0;

    let spesaTot=0;
    let spesaMese=0;
    let kmPercorsiTot=0;

    let listaConsumi=[];
    let listaPrezzi=[];

    let oggi=new Date();
    let meseAttuale=oggi.getMonth();
    let annoAttuale=oggi.getFullYear();

    fuelList.forEach(item=>{

        let s=item.data;
        /* consumo */
        if(s.consumo){

            consumoTot+=s.consumo;
            countConsumi++;
            listaConsumi.push(s.consumo);

            if(migliorConsumo===null || s.consumo>migliorConsumo)
                migliorConsumo=s.consumo;

            if(peggiorConsumo===null || s.consumo<peggiorConsumo)
                peggiorConsumo=s.consumo;

            if(s.litri)
                kmPercorsiTot += s.litri * s.consumo;

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

        /* prezzo */
        if(s.litro)
            listaPrezzi.push(s.litro);

        /* spesa */
        if(s.totale)
            spesaTot+=s.totale;

        /* spesa mese */
        if(s.data){
            let d=new Date(s.data);
            if(d.getMonth()==meseAttuale && d.getFullYear()==annoAttuale)
                spesaMese+=s.totale;
        }
    });

    let consumoMedio = countConsumi ? consumoTot/countConsumi : null;
    let estateMedia = countEstate ? consumoEstate/countEstate : null;
    let invernoMedia = countInverno ? consumoInverno/countInverno : null;

    let costoKm=null;
    let costo100km=null;
    if(spesaTot && kmPercorsiTot){
        costoKm = spesaTot/kmPercorsiTot;
        costo100km = costoKm*100;
    }

    /* autonomia */
    let autonomia=null;
    let ultimo=fuelList[0]?.data;
    if(consumoMedio && ultimo?.litri)
        autonomia = consumoMedio * ultimo.litri;

    /* anomalie consumo */
    let anomaliaConsumo=null;
    let miglioramentoConsumo=null;
    if(listaConsumi.length>=3){
        let ultimoConsumo=listaConsumi[0];
        let somma=0;
        for(let i=1;i<listaConsumi.length;i++)
            somma+=listaConsumi[i];

        let media=somma/(listaConsumi.length-1);
        if(media>0){
            let diff=((ultimoConsumo-media)/media)*100;
            if(diff<-15)
                anomaliaConsumo=Math.round(Math.abs(diff));
            if(diff>10)
                miglioramentoConsumo=Math.round(diff);
        }
    }

    /* anomalia prezzo */
    let anomaliaPrezzo=null;
    if(listaPrezzi.length>=5){
        let ultimoPrezzo=listaPrezzi[0];
        let somma=0;
        for(let i=1;i<listaPrezzi.length;i++)
            somma+=listaPrezzi[i];

        let media=somma/(listaPrezzi.length-1);
        let diff=((ultimoPrezzo-media)/media)*100;
        if(diff>10)
            anomaliaPrezzo=Math.round(diff);
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
        anomaliaPrezzo
    };
}

function mediaMobileConsumi(listaConsumi, windowSize=5){
    let result=[];
    for(let i=0;i<listaConsumi.length;i++){
        if(i < windowSize-1){
            result.push(null);
            continue;
        }

        let somma=0;
        let count=0;
        for(let j=0;j<windowSize;j++){
            let val = listaConsumi[i-j];
            if(val!==null && val!==undefined){
                somma += val;
                count++;
            }
        }

        if(count>0){
            result.push(
                Number((somma/count).toFixed(2))
            );
        }else{
            result.push(null);
        }
    }
    return result;
}

export function renderStats(appDiv, fuelList, stats){
    appDiv.innerHTML+=`
        ${headerMenu("Statistiche")}

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

    [...fuelList].reverse().forEach(item=>{
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
            let d = new Date(s.data);
            chartLabels.push(
                d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}) +
                " " +
                d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})
            );
            chartData.push(
                s.consumo ? Number(s.consumo.toFixed(2)) : null
            );
            chartPrezzo.push(
                s.litro ? Number(s.litro.toFixed(3)) : null
            );
        }

    });

    let windowSize = chartData.length >= 10 ? 5 : 3;
    let mediaMobile = mediaMobileConsumi(chartData,windowSize);

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

    if(chartData.length > 0 && window.Chart){
        const ctx = document.getElementById("fuelChart");
        if(ctx){
            if(fuelChart && typeof fuelChart.destroy === "function"){
                fuelChart.destroy();
            }

            setFuelChart(new Chart(ctx,{
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
                            pointRadius:4,
                            pointHoverRadius:6,
                            borderWidth:3
                        },
                        {
                            label:"Trend consumo",
                            data:mediaMobile,
                            borderColor:"#34c759",
                            backgroundColor:"rgba(52,199,89,0.15)",
                            tension:0.35,
                            yAxisID:"y1",
                            pointRadius:0,
                            borderWidth:3,
                            borderDash:[6,6]
                        },
                        {
                            label:"Prezzo €/L",
                            data:chartPrezzo,
                            borderColor:"#ff9f0a",
                            backgroundColor:"rgba(255,159,10,0.15)",
                            tension:0.3,
                            yAxisID:"y2",
                            pointRadius:3,
                            pointHoverRadius:5,
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
                                    size:11,
                                    weight:"600"
                                },
                                color:"#6e6e73"
                            }
                        }
                    },
                    scales:{
                        y1:{
                            position:"left",
                            beginAtZero:false,
                            ticks:{
                                maxTicksLimit:6
                                }
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
            }));
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
