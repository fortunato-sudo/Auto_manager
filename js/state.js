export let dbCache={
	fuel:null,
	manut:null,
	config:null,
	registro:null
};

export let tab="home";
export let dettaglioManut=null;
export let dettaglioId=null;
export let tabPrecedente = "home";
export let fuelEditId = null;
export let fuelChart = null;
export let rendering = false;

export let cacheFuel=null;
export let cacheManut=null;
export let cacheConfig=null;
export let cacheRegistro=null;

/* setter */

export function setCacheFuel(v){
    cacheFuel = v;
}

export function setCacheManut(v){
    cacheManut = v;
}

export function setCacheConfig(v){
    cacheConfig = v;
}

export function setTab(v){
    tab = v;
}