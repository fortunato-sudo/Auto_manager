import { db, collection, addDoc, auth } from "./firebase.js";
import { setTab, setVehicleId } from "./state.js";
import { headerBack } from "./ui.js";

export function renderVehicleAdd(appDiv){

    appDiv.innerHTML=`
        ${headerBack("Nuovo veicolo")}

        <div class="group">

            <div class="formGroup">
                <div class="formLabel">Tipologia</div>
                <select id="tipoVeicolo" class="formInput">
                    <option value="auto">🚗 Auto</option>
                    <option value="moto">🏍 Moto</option>
                    <option value="van">🚚 Furgone</option>
                </select>
            </div>

            <div class="formGroup">
                <div class="formLabel">Nome veicolo (facoltativo)</div>
                <input id="nomeVeicolo" class="formInput" placeholder="La Rossa">
            </div>

            <div class="formGroup">
                <div class="formLabel">Marca</div>
                <input id="marcaVeicolo" class="formInput" placeholder="Nissan">
            </div>

            <div class="formGroup">
                <div class="formLabel">Modello</div>
                <input id="modelloVeicolo" class="formInput" placeholder="Qashqai">
            </div>

            <div class="formGroup">
                <div class="formLabel">Anno</div>
                <input id="annoVeicolo" type="number" class="formInput" placeholder="2016">
            </div>

            <div class="formGroup">
                <div class="formLabel">Motorizzazione</div>
                <input id="motoreVeicolo" class="formInput" placeholder="1.5 dCi">
            </div>

            <div class="formGroup">
                <div class="formLabel">Litri serbatoio</div>
                <input id="serbatoioVeicolo" class="formInput" placeholder="55">
            </div>

            <div class="formGroup">
                <div class="formLabel">Targa</div>
                <input id="targaVeicolo" class="formInput" placeholder="AA123BB">
            </div>

            <button class="formButton" onclick="salvaVeicolo()">
                Salva veicolo
            </button>
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
    let serbatoio = Number(document.getElementById("serbatoioVeicolo").value);
    let targa = document.getElementById("targaVeicolo").value;

    const docRef = await addDoc(
        collection(db,"users",auth.currentUser.uid,"vehicles"),
        {
            nome,
            tipo,
            marca,
            modello,
            anno,
            motore,
            serbatoio:serbatoio,
            targa,
            km_attuali:0,
            pieni_senza_additivo:0,
            stato_additivo:"ok"
        }
    );
    setVehicleId(docRef.id);
    setTab("home");
    render();
}