import { renderHome } from "./home.js";
import { renderManut, renderManutAdd, renderManutList, renderDettaglio, calcolaStato } from "./manut.js";
import { renderFuel, renderFuelAdd } from "./fuel.js";
import { renderStats, calcolaStatisticheFuel } from "./stats.js";
import { renderRegistro, renderRegistroAdd } from "./registro.js";
import { getFuelList } from "./fuel.js";
import { db, collection, getDocs, getDoc, doc, setDoc } from "./firebase.js";
import {
    tab,
    dettaglioManut,
    dettaglioId,
    tabPrecedente,
    rendering,
    cacheFuel,
    cacheManut,
    cacheConfig,
    setCacheFuel,
    setCacheManut,
    setCacheConfig,
    setRendering,
    setTab
} from "./state.js";
import "./config.js";

const splashStart = Date.now();

window.aggiornaKmAutoSeMaggiore = async function(kmNuovi){
    const snap=await getDoc(doc(db,"config","auto"));
    let kmAttuali=snap.data()?.km_attuali || 0;
    if(kmNuovi > kmAttuali){
        await setDoc(doc(db,"config","auto"),{
            km_attuali:Number(kmNuovi)
        });
        /* aggiorna cache */
        setCacheConfig(Number(kmNuovi));
    }
}

async function preloadDB(){
    /* fuel */
    if(!cacheFuel){
        setCacheFuel(await getFuelList());
    }

    /* manutenzioni */
    if(!cacheManut){
        const snap = await getDocs(collection(db,"manutenzioni"));
        setCacheManut(
            snap.docs.map(doc=>({
                id:doc.id,
                data:doc.data()
            }))
        );
    }

    /* km auto */
    if(cacheConfig===null){
        const snap = await getDoc(doc(db,"config","auto"));
        setCacheConfig(snap.data()?.km_attuali || 0);
    }
}

 async function render(){
    if(rendering) return;
    setRendering(true);
    try{
        const appDiv=document.getElementById("app");
        window.scrollTo(0,0);
        appDiv.innerHTML = "";

        let fuelList = cacheFuel;
        if((tab==="home" || tab==="fuel" || tab==="stats") && !fuelList){
            fuelList = await getFuelList();
        }

        let stats=null;
        if(tab==="home" || tab==="fuel" || tab==="stats"){
            stats = calcolaStatisticheFuel(fuelList);
        }

        let km = cacheConfig;
        if(km===null){
            const snap = await getDoc(doc(db,"config","auto"));
            km = snap.data()?.km_attuali || 0;
            setCacheConfig(km);
        }

        let manutList = cacheManut || [];
        if((tab==="home" || tab==="manut" || tab==="dettaglio") && !manutList){
            const manut = await getDocs(collection(db,"manutenzioni"));
            let tempManut = [];
            manut.forEach(docSnap=>{
                tempManut.push({
                    id:docSnap.id,
                    data:docSnap.data()
                });
            });
            setCacheManut(tempManut);
            manutList = tempManut;

            /* sort solo una volta */
            tempManut.sort((a,b)=>{
                let statoA = calcolaStato(a.data, cacheConfig);
                let statoB = calcolaStato(b.data, cacheConfig);
                const ordine = {
                    urgente:0,
                    imminente:1,
                    ok:2
                };

                if(ordine[statoA.stato] !== ordine[statoB.stato]){
                    return ordine[statoA.stato] - ordine[statoB.stato];
                }

                let kmA = statoA.nextKm ?? Infinity;
                let kmB = statoB.nextKm ?? Infinity;
                return kmA - kmB;
            });
        }

        switch(tab){
            case "home":
                renderHome(appDiv, km, manutList, stats);
            break;

            case "manut":
                renderManut(appDiv);
            break;

            case "manutAdd":
                renderManutAdd(appDiv);
            break;

            case "registro":
                await renderRegistro(appDiv);
            break;

            case "registroAdd":
                await renderRegistroAdd(appDiv);
            break;

            case "fuel":
                renderFuel(appDiv, fuelList, stats);
            break;

            case "fuelAdd":
                await renderFuelAdd(appDiv);
            break;

            case "stats":
                renderStats(appDiv, fuelList, stats);
            break;

            case "dettaglio":
                renderDettaglio(appDiv, dettaglioManut, km);
            break;
        }

        if(tab==="home" || tab==="manut"){
            renderManutList(manutList, km);
        }

    }catch(err){
        console.error("Errore render:",err);
        document.getElementById("app").innerHTML=
        `<div style="padding:20px">
            Errore app.<br>
            Apri la console (F12).
        </div>`;
    }
    finally{
        setRendering(false);
        const splash = document.getElementById("splash");
        if(splash){
            const elapsed = Date.now() - splashStart;
            const delay = Math.max(1800 - elapsed, 0);
            
            setTimeout(()=>{
                splash.style.transform="scale(1.12)";
                splash.style.opacity="0";
        
                setTimeout(()=>{
                    splash.remove();
                },400);
            }, delay);
        }
    }
}

window.indietro=function(){
    setTab(tabPrecedente);
    render();
}

document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem("darkMode")==="true"){
        document.body.classList.add("dark");
    }
    (async function(){
        try{
            await preloadDB();
        }catch(e){
            console.warn("Preload fallito", e);
        }
        render();
    })();
    document.body.classList.remove("loading");

    /* swipe menu */
    let startX = 0;
    document.addEventListener("touchstart",function(e){
        startX = e.touches[0].clientX;
    });
    document.addEventListener("touchmove",function(e){
        let currentX = e.touches[0].clientX;
        let diff = currentX - startX;
        const menu=document.getElementById("menuDrawer");
        if(menu && menu.classList.contains("menuOpen")){
            if(diff < -50){
                menu.classList.remove("menuOpen");
                document.getElementById("menuOverlay")
                .classList.remove("menuOverlayOpen");
            }
        }
    });
    const overlay = document.getElementById("menuOverlay");
    if(overlay){
        overlay.addEventListener("click",function(){
            document.getElementById("menuDrawer")
            .classList.remove("menuOpen");
            overlay.classList.remove("menuOverlayOpen");
            document.body.classList.remove("menuOpen");

            /* refresh status bar */
            document.body.style.background="transparent";
            requestAnimationFrame(()=>{
                document.body.style.background="";
            });
        });
    }
});

window.render = render;
