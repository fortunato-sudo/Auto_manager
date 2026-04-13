import { register, login } from "./auth.js";

export function renderLogin(appDiv){

appDiv.innerHTML = `
<div class="loginBox">

<h2>DriveTrack</h2>

<input id="email" placeholder="Email">

<input id="password" type="password" placeholder="Password">

<button onclick="doLogin()">Login</button>

<button onclick="doRegister()">Registrati</button>

</div>
`;

const splash = document.getElementById("splash");

if(splash){
    splash.remove();
    document.body.classList.remove("loading");
}
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