import { tab, tabPrecedente, setTab, setTabPrecedente } from "./state.js";

export function headerMenu(titolo){
    return `
        <div class="headerBar">
            <button class="menuButton" onclick="toggleMenu()">☰</button>
            <div class="appTitle">${titolo}</div>
        </div>
    `;
}

export function headerBack(titolo){
    return `
        <div class="headerBar">
            <button class="headerBack" onclick="indietro()">←</button>
            <div class="appTitle">${titolo}</div>
        </div>
    `;
}

export function updateDarkLabel(){
    const label = document.getElementById("darkLabel");
    const switchEl = document.getElementById("darkSwitch");
    const dark = document.body.classList.contains("dark");

    if(label){
        label.textContent = "🌙 Dark mode";
    }

    if(switchEl){
        if(dark){
            switchEl.classList.add("switchActive");
        }else{
            switchEl.classList.remove("switchActive");
        }
    }
}

window.toggleMenu=function(){
    const menu=document.getElementById("menuDrawer");
    const overlay=document.getElementById("menuOverlay");
    menu.classList.toggle("menuOpen");
    overlay.classList.toggle("menuOverlayOpen");
    document.body.classList.toggle("menuOpen");
    updateDarkLabel();

    /* FIX status bar iOS */
    setTimeout(()=>{
        document.body.style.background="transparent";
        requestAnimationFrame(()=>{
            document.body.style.background="";
        });
    },50);
}

window.toggleDark=function(){
    document.body.classList.toggle("dark");
    const active = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", active);
    updateDarkLabel();
}

window.nav=function(t){
    if(t !== tab){
        setTabPrecedente(tab);
    }
    setTab(t);

    const menu = document.getElementById("menuDrawer");
    const overlay = document.getElementById("menuOverlay");
    if(menu) menu.classList.remove("menuOpen");
    if(overlay) overlay.classList.remove("menuOverlayOpen");

    document.body.classList.remove("menuOpen");

    render();
}
