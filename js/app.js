import { auth, db, doc, setDoc, vehiclePath } from "./firebase.js";
import { getVehicles, saveVehicle, vehicleDoc } from "./sync.js";
import { renderLogin } from "./login.js";

auth.onAuthStateChanged(async user => {
    console.log("AUTH STATE", user);

    document.body.classList.add("loading");

    if(!user){
        console.log("SHOW LOGIN");
        renderLogin();
        return;
    }
    console.log("USER LOGGED");

    try{
        await preloadDB();
    }catch(e){
        console.warn("Preload fallito", e);
    }
    render();
});

import { renderHome } from "./home.js";
import { renderGarage } from "./garage.js";
import { renderManut, renderManutAdd, renderManutList, renderDettaglio, calcolaStato } from "./manut.js";
import { renderFuel, renderFuelAdd, getFuelList, renderDistributori } from "./fuel.js";
import { renderStats, calcolaStatisticheFuel, calcolaCostoAuto, calcolaAutonomia, previsioneCarburanteKm } from "./stats.js";
import { renderRegistro, renderRegistroAdd, renderCronologiaManut } from "./registro.js";
import { collection, getDocs, getDoc } from "./firebase.js";
import {
    tab,
    dettaglioManut,
    dettaglioId,
    tabPrecedente,
    rendering,
    cacheFuel,
    cacheManut,
    cacheRegistro,
    cacheConfig,
    setCacheFuel,
    setCacheManut,
    setCacheRegistro,
    setCacheConfig,
    setRendering,
    setTab,
    vehicleId,
    setVehicleId
} from "./state.js";
import { updateDarkLabel } from "./ui.js";
import { renderVehicleAdd } from "./vehicleAdd.js";
import "./config.js";

const darkSaved = localStorage.getItem("darkMode");
if(darkSaved === "true"){
    document.body.classList.add("dark");
}
updateDarkLabel();

const splashStart = Date.now();

window.logout = async function(){
    const menu = document.getElementById("menuDrawer")
    const overlay = document.getElementById("menuOverlay")

    menu?.classList.remove("menuOpen")
    overlay?.classList.remove("menuOverlayOpen")
    document.body.classList.remove("menuOpen")

    const splash = document.getElementById("splash")
    if(splash){
        splash.innerHTML = `
            <div class="splashContent">
                <img src="img/logo.png" class="splashLogo">
                <div class="splashTitle">Disconnessione...</div>
            </div>
        `
        splash.style.opacity="1"
        splash.style.visibility="visible"
    }

    document.body.classList.add("loading")
    await auth.signOut()
}

window.aggiornaKmAutoSeMaggiore = async function(kmNuovi){
    const snap = await getDoc(doc(db,...vehiclePath(vehicleId)));
    let kmAttuali = snap.data()?.km_attuali || 0;

    if(kmNuovi > kmAttuali){
        await setDoc(
            doc(db,...vehiclePath(vehicleId)),
            { km_attuali:Number(kmNuovi) },
            { merge:true }
        );
        setCacheConfig(Number(kmNuovi));
    }
}

async function preloadDB(){
    if(!vehicleId){
        return;
    }

    /* fuel */
    if(!cacheFuel){
        setCacheFuel(await getFuelList());
    }

    /* manutenzioni */
    if(cacheManut === null){
        const snap = await getDocs(collection(db,...vehiclePath(vehicleId),"manutenzioni"));
        setCacheManut(
            snap.docs.map(doc=>({
                id:doc.id,
                data:doc.data()
            }))
        );
    }

    if(cacheRegistro===null){
        const snap = await getDocs(collection(db,...vehiclePath(vehicleId),"registro"));
        const registroList = snap.docs.map(doc=>({
            id:doc.id,
            data:doc.data()
        }));
        setCacheRegistro(registroList);
    }

    /* km auto */
    if(cacheConfig===null){
        const snap = await getDoc(doc(db,...vehiclePath(vehicleId)));
        setCacheConfig(snap.data()?.km_attuali || 0);
    }
}

async function render(){
    const appDiv = document.getElementById("app");
        if(!vehicleId){
        const vehiclesSnap = await getDocs(
            collection(db,"users",auth.currentUser.uid,"vehicles")
        );

        if(!vehiclesSnap.empty){
            const firstVehicle = vehiclesSnap.docs[0];
            setVehicleId(firstVehicle.id);
            await preloadDB();
        }else{
            if(tab === "vehicleAdd"){
                renderVehicleAdd(appDiv);
                setRendering(false);
                return;
            }

            renderGarage(appDiv);
            setRendering(false);
            return;
        }
    }

    if(rendering) return;
    setRendering(true);
    try{
        const appDiv=document.getElementById("app");
        window.scrollTo(0,0);
        appDiv.innerHTML = ""

        let fuelList = cacheFuel;
        if((tab==="home" || tab==="fuel" || tab==="stats") && !fuelList){
            fuelList = await getFuelList();
        }

        let stats=null;
        if(tab==="home" || tab==="fuel" || tab==="stats"){
            stats = calcolaStatisticheFuel(fuelList);
            stats.previsioneKm = previsioneCarburanteKm(fuelList);
        }

        const vehicleSnap = await getDoc(doc(db,...vehiclePath(vehicleId)));
        const currentVehicle = vehicleSnap.exists() ? vehicleSnap.data() : {};

        let km = cacheConfig;
        if(km===null){
            const snap = await getDoc(doc(db,...vehiclePath(vehicleId),"config","auto"));
            km = snap.data()?.km_attuali || 0;
            setCacheConfig(km);
        }

        let autonomia=null;
        if(tab==="home" || tab==="stats"){
            autonomia = calcolaAutonomia(fuelList, km, currentVehicle);
        }

        const vehicleNameBox = document.getElementById("menuVehicleName");
        const vehicleKmBox = document.getElementById("menuVehicleKm");

        if(vehicleNameBox){
            vehicleNameBox.textContent = currentVehicle?.nome || "";
        }

        if(vehicleKmBox){
            vehicleKmBox.textContent = km ? km.toLocaleString()+" km" : "";
        }

        let manutList = cacheManut;
        if((tab==="home" || tab==="manut" || tab==="dettaglio") && manutList===null){
            const snap = await getDocs(collection(db,...vehiclePath(vehicleId),"manutenzioni"));
            manutList = snap.docs.map(doc=>({
                id:doc.id,
                data:doc.data()
            }));
            setCacheManut(manutList);
        }
        manutList = manutList || [];

        let registroList = cacheRegistro;
        if(registroList===null){
            const snap = await getDocs(collection(db,...vehiclePath(vehicleId),"registro"));
            registroList = snap.docs.map(doc=>({
                id:doc.id,
                data:doc.data()
            }));
            setCacheRegistro(registroList);
        }
        registroList = registroList || [];

        let costoAuto = null;
        if(tab==="home" || tab==="stats"){
            costoAuto = calcolaCostoAuto(fuelList, registroList, km);
        }

        const lastManut = {};
        registroList.forEach(r=>{
            const nome = r.data.manutenzione;
            if(!lastManut[nome] || r.data.km > lastManut[nome].km){
                lastManut[nome] = {
                    km:r.data.km,
                    data:r.data.data
                };
            }
        });

        let urgenti=0;
        let imminenti=0;
        let prossimoKm = Infinity;

        manutList.forEach(m=>{
            const stato = calcolaStato(m.data, km);

            if(stato.stato==="urgente") urgenti++;
            if(stato.stato==="imminente") imminenti++;

            if(stato.nextKm && stato.nextKm < prossimoKm){
                prossimoKm = stato.nextKm;
            }
        });

        let tagliandoStato="ok";
        let tagliandoKm=null;

        if(prossimoKm !== Infinity){
            let diff = prossimoKm - km;

            if(diff <= 0){
                tagliandoStato="urgente";
            }
            else if(diff < 8000){
                tagliandoStato="imminente";
                tagliandoKm=diff;
            }
        }
        await setDoc(
            doc(db,...vehiclePath(vehicleId)),
            {
                urgenti,
                imminenti
            },
            {merge:true}
        );
        
        /* sort */
        if(manutList){
            manutList.sort((a,b)=>{
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
            default:
                renderGarage(appDiv);
            break;

            case "garage":
                renderGarage(appDiv);
            break;

            case "vehicleAdd":
                renderVehicleAdd(appDiv);
            break;
                
            case "home":
                renderHome(appDiv, km, manutList, stats, currentVehicle, costoAuto, autonomia);
            break;

            case "manut":
                renderManut(appDiv);
            break;

            case "manutAdd":
                renderManutAdd(appDiv);
            break;

            case "manutHistory":
                renderCronologiaManut(appDiv, registroList);
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

            case "stations":
                renderDistributori(appDiv, fuelList);
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
        const app = document.getElementById("app");
        if(!app) return;
        const splash = document.getElementById("splash");
        if(splash){
            const elapsed = Date.now() - splashStart;
            const delay = Math.max(1800 - elapsed, 0);
            
            setTimeout(()=>{
                splash.style.transform="scale(1.12)";
                splash.style.opacity="0";
        
                setTimeout(()=>{
                    splash.remove();
                    document.body.classList.remove("loading");
                },400);
            }, delay);
        }
    }
    updateDarkLabel();
    window.scrollTo(0,0);

    document.querySelectorAll(".menuItem")
        .forEach(el=>el.classList.remove("menuItemActive"));

    const active = document.getElementById("menu_"+tab);
    if(active){
        active.classList.add("menuItemActive");
    }
}

window.indietro=function(){
    if(tabPrecedente){
        setTab(tabPrecedente);
    }else{
        setTab("home");
    }
    render();
}

document.addEventListener("DOMContentLoaded", () => {
    updateDarkLabel();
    if(localStorage.getItem("darkMode")==="true"){
        document.body.classList.add("dark");
    }

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

            document.body.style.background="transparent";

            requestAnimationFrame(()=>{
                document.body.style.background="";
            });
        });
    }
});
window.render = render;
