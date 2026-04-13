import { register, login } from "./auth.js";

export function renderLogin(){

    const app = document.getElementById("app");

    if(!app){
        console.error("Elemento #app non trovato");
        return;
    }

    app.innerHTML = `
        <div class="loginScreen">
            <h2>Login</h2>

            <input id="email" placeholder="Email">

            <input id="password" type="password" placeholder="Password">

            <button onclick="doLogin()">Login</button>
        </div>
    `;
}

window.doLogin = async function(){

const email = document.getElementById("email").value;
const pass = document.getElementById("password").value;

try{
await login(email,pass);
location.reload();
}catch(e){
alert(e.message);
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