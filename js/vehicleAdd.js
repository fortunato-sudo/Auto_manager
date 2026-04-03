import { db, collection, addDoc } from "./firebase.js";
import { setTab } from "./state.js";
import { headerBack } from "./ui.js";

export function renderVehicleAdd(appDiv){

    appDiv.innerHTML=`
        ${headerBack("Nuovo veicolo")}

        <div class="group">

            <div class="row">
                <div>Tipologia</div>
                <select id="tipoVeicolo">
                    <option value="auto">🚗 Auto</option>
                    <option value="moto">🏍 Moto</option>
                    <option value="van">🚚 Furgone</option>
                </select>
            </div>

            <div class="row">
                <div>Nome veicolo (facoltativo)</div>
                <input id="nomeVeicolo" placeholder="Es: La Rossa">
            </div>

            <div class="row">
                <div>Marca</div>
                <input id="marcaVeicolo" placeholder="Nissan">
            </div>

            <div class="row">
                <div>Modello</div>
                <input id="modelloVeicolo" placeholder="Qashqai">
            </div>

            <div class="row">
                <div>Anno</div>
                <input id="annoVeicolo" type="number" placeholder="2016">
            </div>

            <div class="row">
                <div>Motorizzazione</div>
                <input id="motoreVeicolo" placeholder="1.5 dCi 110cv">
            </div>

            <div class="row">
                <div>Targa</div>
                <input id="targaVeicolo" placeholder="AA123BB">
            </div>

            <div class="row center">
                <button onclick="salvaVeicolo()" class="mainBtn">
                    Salva
                </button>
            </div>
        </div>
    `;
}

window.salvaVeicolo = async function(){
    let nome = document.getElementById("nomeVeicolo").value;
    let tipo = document.getElementById("tipoVeicolo").value;
    let marca = document.getElementById("marcaVeicolo").value;
    let modello = document.getElementById("modelloVeicolo").value;
    let anno = document.getElementById("annoVeicolo").value;
    let motore = document.getElementById("motoreVeicolo").value;
    let targa = document.getElementById("targaVeicolo").value;

    await addDoc(collection(db,"vehicles"),{
        nome,
        tipo,
        marca,
        modello,
        anno,
        motore,
        targa,
        km_attuali:0,
        pieni_senza_additivo:0,
        stato_additivo:"ok"
    });
    setTab("garage");
    render();
}