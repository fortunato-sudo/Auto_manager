export function formatKm(km){
    if(km === null || km === undefined) return "-";
    return Number(km).toLocaleString("it-IT");
}

export function formatNumero(num, decimali){
    if(num===null || num===undefined) return "";
    return Number(num)
    .toFixed(decimali)
    .replace(".",",");
}

export function formatDate(d){
    if(!d) return "-";
    let date = new Date(d);
    if(isNaN(date)) return "-";

    return date.toLocaleDateString("it-IT",{
        day:"numeric",
        month:"short",
        year:"numeric"
    }) + " " +
    date.toLocaleTimeString("it-IT",{
        hour:"2-digit",
        minute:"2-digit"
    });
}

export function formatDateOnly(d){
    if(!d) return "-";
    let date = new Date(d);
    if(isNaN(date)) return "-";
    return date.toLocaleDateString("it-IT",{
        day:"numeric",
        month:"short",
        year:"numeric"
    });
}

export function getConsumoClasse(consumo){
    if(consumo >= 18) return "consumoOttimo";
    if(consumo >= 15) return "consumoBuono";
    if(consumo >= 12) return "consumoMedio";
    return "consumoBasso";
}

export function parseNumero(val){
    if(!val) return null;
    return parseFloat(
        val.replace(",",".")
    );
}
