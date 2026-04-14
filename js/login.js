import { register, login } from "./auth.js";

export function renderLogin(){
    document.body.classList.remove("loading");

    const splash = document.getElementById("splash");
    if(splash) splash.remove();
    
    const app = document.getElementById("app")

    app.innerHTML = `
        <div class="loginWrapper">
            <div class="loginCard">

                <div class="loginLogo">
                    <img src="./img/logo.png" alt="Logo">
                </div>
                <div class="loginTitle">Garage Manager</div>

                <div class="loginField">
                    <input id="email" class="formInput" placeholder="Email">
                </div>

                <div class="loginField">
                    <input id="password" type="password" class="formInput" placeholder="Password">
                </div>

                <button class="formButton" onclick="doLogin()">
                    Accedi
                </button>

                <div class="loginDivider">oppure</div>

                <button class="secondaryBtn" onclick="doRegister()">
                    Crea account
                </button>
            </div>
        </div>
    `
}

window.doLogin = async function(){
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    try{
        await login(email,pass)
    }catch(e){
        let msg = "Errore login"

        if(e.code === "auth/user-not-found"){
            msg = "Utente non registrato"
        }

        if(e.code === "auth/wrong-password"){
            msg = "Password errata"
        }

        if(e.code === "auth/invalid-email"){
            msg = "Email non valida"
        }

        alert(msg)
    }
}

window.doRegister = async function(){
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    try{
        await register(email,pass);
        location.reload();
    }catch(e){
        alert(e.message);
    }
}