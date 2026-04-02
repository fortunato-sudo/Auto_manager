import { db, collection, addDoc } from "./firebase.js";
import { setTab } from "./state.js";

export function renderVehicleAdd(appDiv){
    appDiv.innerHTML=`
        <div class="headerBar">
            <button onclick="nav('garage')">←</button>
            Nuovo veicolo
        </div>

        <div class="group">
            <div class="row">
                <div>Tipologia</div>
                <select id="tipoVeicolo">
                    <option value="auto">Autoveicolo</option>
                    <option value="moto">Motoveicolo</option>
                    <option value="van">Furgone</option>
                </select>
            </div>

            <div class="row">
                <div>Nome veicolo</div>
                <input id="nomeVeicolo">
            </div>

            <div class="row">
                <div>Targa</div>
                <input id="targaVeicolo">
            </div>

            <button onclick="salvaVeicolo()">
                Salva
            </button>
        </div>
    `;
}

window.salvaVeicolo=async function(){
    let nome=document.getElementById("nomeVeicolo").value;
    let tipo=document.getElementById("tipoVeicolo").value;
    let targa=document.getElementById("targaVeicolo").value;

    await addDoc(collection(db,"vehicles"),{
        nome:nome,
        tipo:tipo,
        targa:targa,
        km_attuali:0
    });
    setTab("garage");
    render();
}