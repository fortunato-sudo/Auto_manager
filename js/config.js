window.saveKm=async function(){
    let km=document.getElementById("km").value;
    await setDoc(doc(db,"config","auto"),{
        km_attuali:Number(km)
    });
    cacheConfig = Number(km);
    render();
}