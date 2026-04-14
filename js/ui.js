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

window.toggleMenu = function(){
    const menu = document.body.querySelector("#menuDrawer");
    const overlay = document.body.querySelector("#menuOverlay");

    if(!menu){
        console.warn("menuDrawer non trovato nel DOM");
        return;
    }

    const open = menu.classList.contains("menuOpen");
    if(open){
        menu.classList.remove("menuOpen");
        overlay?.classList.remove("menuOverlayOpen");
        document.body.classList.remove("menuOpen");
    }else{
        menu.classList.add("menuOpen");
        overlay?.classList.add("menuOverlayOpen");
        document.body.classList.add("menuOpen");
    }
}

window.toggleDark=function(){
    document.body.classList.toggle("dark");
    const active = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", active);
    updateDarkLabel();
}

function nav(t){
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
window.nav = nav;

let startX = 0
let currentX = 0
let dragging = false
document.addEventListener("touchstart", e=>{
    if(e.touches[0].clientX < 25){
        dragging = true
        startX = e.touches[0].clientX
    }
})

document.addEventListener("touchmove", e=>{
    if(!dragging) return

    const menu = document.getElementById("menuDrawer")

    currentX = e.touches[0].clientX
    let diff = currentX - startX
    if(diff < 0) diff = 0
    if(diff > 260) diff = 260

    menu.style.transform = `translateX(${diff-260}px)`
})

document.addEventListener("touchend", ()=>{
    if(!dragging) return

    const menu = document.getElementById("menuDrawer")
    const overlay = document.getElementById("menuOverlay")

    let diff = currentX - startX
    if(diff > 120){
        menu.classList.add("menuOpen")
        overlay.classList.add("menuOverlayOpen")
        document.body.classList.add("menuOpen")
    }else{
        menu.classList.remove("menuOpen")
        overlay.classList.remove("menuOverlayOpen")
        document.body.classList.remove("menuOpen")
    }
    menu.style.transform = ""
    dragging = false
})