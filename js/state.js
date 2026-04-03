export let dbCache={
    fuel:null,
    manut:null,
    config:null,
    registro:null
};

export let tab="garage";
export let dettaglioManut=null;
export let dettaglioId=null;
export let tabPrecedente = null;
export let fuelEditId = null;
export let fuelChart = null;
export let rendering = false;
export let registroEditId = null;
export let cacheFuel=null;
export let cacheManut=null;
export let cacheConfig=null;
export let cacheRegistro=null;

export let vehicleId = "qashqai";

/* setter */

export function setFuelChart(v){
    fuelChart = v;
}

export function setCacheFuel(v){
    cacheFuel = v;
}

export function setFuelEditId(id){
    fuelEditId = id;
}

export function setRegistroEditId(id){
    registroEditId = id;
}

export function setCacheManut(v){
    cacheManut = v;
}

export function setCacheConfig(v){
    cacheConfig = v;
}

export function setCacheRegistro(v){
	cacheRegistro = v;
}

export function setTab(t, from=null){
    if(from){
        tabPrecedente = from;
    }else{
        tabPrecedente = tab;
    }
    tab = t;
}

export function setTabPrecedente(v){
    tabPrecedente = v;
}

export function setDettaglioManut(v){
    dettaglioManut = v;
}

export function setDettaglioId(v){
    dettaglioId = v;
}

export function setRendering(v){
    rendering = v;
}

export function setVehicleId(v){
	vehicleId = v;
}
