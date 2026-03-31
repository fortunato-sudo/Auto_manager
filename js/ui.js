import { tab, tabPrecedente, setTab, setTabPrecedente } from "./state.js";

export function headerMenu(titolo){
    return `
        <div class="headerBar">
            <button class="menuButton" onclick="toggleMenu()">☰</button>
            <div class="appTitle">${titolo}</div>
            <button class="darkToggle headerDark" onclick="toggleDark()">🌙</button>
        </div>
    `;
}

export function headerBack(titolo){
    return `
        <div class="headerBar">
            <button class="headerBack" onclick="indietro()">←</button>
            <div class="appTitle">${titolo}</div>
            <button class="darkToggle headerDark" onclick="toggleDark()">🌙</button>
        </div>
    `;
}

window.toggleMenu=function(){
    const menu=document.getElementById("menuDrawer");
    const overlay=document.getElementById("menuOverlay");
    menu.classList.toggle("menuOpen");
    overlay.classList.toggle("menuOverlayOpen");
    document.body.classList.toggle("menuOpen");

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
    const dark=document.body.classList.contains("dark");
    localStorage.setItem("darkMode",dark);
}

window.nav=function(t){
    if(t !== tab){
        setTabPrecedente(tab);
    }
    setTab(t);
   
    const menu = document.getElementById("menuDrawer");
    const overlay = document.getElementById("menuOverlay");
    if(menu){
        menu.classList.remove("menuOpen");
    }

    if(overlay){
        overlay.classList.remove("menuOverlayOpen");
    }
    document.body.classList.remove("menuOpen");
    render();
}
