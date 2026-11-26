import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8FoVxL4907KcKyiabnzFnsgVopXnlNpY",
    authDomain: "://firebaseapp.com",
    projectId: "casino-familiar",
    storageBucket: "casino-familiar.firebasestorage.app",
    messagingSenderId: "27006831566",
    appId: "1:27006831566:web:bb57b3a613b85bca26799f",
    measurementId: "G-LM50PW0KLD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let usuarioActual = "", saldoActual = 0, jugandoMinas = false, gananciaMinas = 0, bombas = [];

document.getElementById("btn-entrar").onclick = async function() {
    const nombre = document.getElementById("nombre").value.trim();
    if (!nombre) { alert("Escribe un nombre"); return; }
    usuarioActual = nombre;
    const userRef = doc(db, "jugadores", usuarioActual);
    
    onSnapshot(userRef, async function(docSnap) {
        if (!docSnap.exists()) {
            await setDoc(userRef, { nombre: usuarioActual, fichas: 1000 });
        } else {
            saldoActual = docSnap.data().fichas;
            document.getElementById("txt-saldo").innerText = saldoActual.toLocaleString();
        }
    });

    onSnapshot(collection(db, "jugadores"), function(snapshot) {
        let jugadores = [];
        snapshot.forEach(function(d) { jugadores.push(d.data()); });
        jugadores.sort(function(a, b) { return b.fichas - a.fichas; });

        let htmlRank = "";
        let htmlCajero = "";
        for (let i = 0; i < jugadores.length; i++) {
            let j = jugadores[i];
            htmlRank += '<div class="ranking-item"><span><b>#' + (i + 1) + '</b> ' + j.nombre + '</span><span style="color:var(--green); font-weight:bold;">🪙 ' + j.fichas.toLocaleString() + '</span></div>';
            htmlCajero += '<div class="cajero-row"><div><b>' + j.nombre + '</b><br><span style="color:var(--green)">🪙 ' + j.fichas + '</span></div><div class="cajero-btns"><button class="verde" onclick="modificarFichas(\'' + j.nombre + '\', 1000)">+1k</button><button class="verde" onclick="modificarFichas(\'' + j.nombre + '\', 5000)">+5k</button><button class="rojo" onclick="modificarFichas(\'' + j.nombre + '\', -1000)">-1k</button></div></div>';
        }
        document.getElementById("lista-ranking").innerHTML = htmlRank;
        document.getElementById("lista-cajero").innerHTML = htmlCajero;
    });

    document.getElementById("txt-user").innerText = usuarioActual;
    document.getElementById("login").classList.add("oculto");
    document.getElementById("sala").classList.remove("oculto");
    crearTableroMinas();
};

window.modificarFichas = async function(nombreJugador, cantidad) {
    await updateDoc(doc(db, "jugadores", nombreJugador), { fichas: increment(cantidad) });
};

async function cambiarSaldoPropio(delta) {
    await updateDoc(doc(db, "jugadores", usuarioActual), { fichas: increment(delta) });
}

const vistas = ["slots", "minas", "dados", "rank"];
vistas.forEach(function(v) {
    document.getElementById("t-" + v).onclick = function() {
        if (jugandoMinas) { alert("Termina tu partida de Minas primero"); return; }
        vistas.forEach(function(x) {
            document.getElementById("v-" + x).classList.add("oculto");
            document.getElementById("t-" + x).classList.add("gris");
        });
        document.getElementById("v-" + v).classList.remove("oculto");
        this.classList.remove("gris");
    };
});

document.getElementById("btn-cajero").onclick = function() {
    if (prompt("Clave de Cajero (1234):") === "1234") {
        document.getElementById("box-cajero").classList.toggle("oculto");
    }
};


const simbolos = ["🍒", "🍋", "🍇", "🔔", "💎"];
document.getElementById("btn-girar").onclick = async function() {
    const ap = parseInt(document.getElementById("apuesta-slot").value);
    if (isNaN(ap) || ap <= 0 || ap > saldoActual) { alert("Fichas insuficientes"); return; }
    const btn = document.getElementById("btn-girar");
    btn.disabled = true;
    await cambiarSaldoPropio(-ap);

    let vueltas = 0;
    const anim = setInterval(async function() {
        const s1 = simbolos[Math.floor(Math.random() * simbolos.length)];
        const s2 = simbolos[Math.floor(Math.random() * simbolos.length)];
        const s3 = simbolos[Math.floor(Math.random() * simbolos.length)];
        document.getElementById("r1").innerText = s1;
        document.getElementById("r2").innerText = s2;
        document.getElementById("r3").innerText = s3;
        vueltas++;

        if (vueltas >= 12) {
            clearInterval(anim);
            btn.disabled = false;
            const msg = document.getElementById("slot-msg");
            if (s1 === "💎" && s2 === "💎" && s3 === "💎") {
                await cambiarSaldoPropio(ap * 10);
                msg.style.color = "var(--accent)"; msg.innerText = "💎 ¡JACKPOT x10! Ganaste 🪙 " + (ap * 10);
            } else if (s1 === s2 && s2 === s3) {
                await cambiarSaldoPropio(ap * 5);
                msg.style.color = "var(--green)"; msg.innerText = "🎉 ¡TRIPLE x5! Ganaste 🪙 " + (ap * 5);
            } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                await cambiarSaldoPropio(ap * 2);
                msg.style.color = "var(--green)"; msg.innerText = "✨ ¡PAR x2! Ganaste 🪙 " + (ap * 2);
            } else {
                msg.style.color = "var(--red)"; msg.innerText = "❌ Sin premio, sigue intentando";
            }
        }
    }, 80);
};

function crearTableroMinas() {
    const t = document.getElementById("tablero");
    t.innerHTML = "";
    for (let i = 0; i < 16; i++) {
        const d = document.createElement("div");
        d.className = "celda"; d.innerText = "❓";
        d.onclick = async function() {
            if (!jugandoMinas || this.innerText !== "❓") return;
            if (bombas.indexOf(i) !== -1) {
                this.innerText = "💣"; this.style.background = "#7f1d1d";
                jugandoMinas = false; alert("💥 ¡BOOM! Tocaste una bomba"); finMinas();
            } else {
                this.innerText = "💎"; this.style.background = "#14532d";
                gananciaMinas = Math.floor(gananciaMinas * 1.25);
                document.getElementById("txt-ganancia").innerText = gananciaMinas;
            }
        };
        t.appendChild(d);
    }
}

document.getElementById("btn-jugar-minas").onclick = async function() {
    const ap = parseInt(document.getElementById("apuesta-minas").value);
    if (isNaN(ap) || ap <= 0 || ap > saldoActual) { alert("Fichas insuficientes"); return; }
    await cambiarSaldoPropio(-ap);
    gananciaMinas = ap; jugandoMinas = true; bombas = [];
    while (bombas.length < 3) { let r = Math.floor(Math.random() * 16); if (bombas.indexOf(r) === -1) bombas.push(r); }
    document.getElementById("txt-ganancia").innerText = gananciaMinas;
    this.classList.add("oculto"); document.getElementById("btn-retirar").classList.remove("oculto");
    crearTableroMinas();
};

document.getElementById("btn-retirar").onclick = async function() {
    if (!jugandoMinas) return;
    await cambiarSaldoPropio(gananciaMinas); alert("🎉 ¡Retiraste 🪙 " + gananciaMinas + "!"); finMinas();
};

function finMinas() {
    jugandoMinas = false;
    document.getElementById("btn-jugar-minas").classList.remove("oculto");
    document.getElementById("btn-retirar").classList.add("oculto");
}

async function tirarDado(tipo) {
    const ap = parseInt(document.getElementById("apuesta-dados").value);
    if (isNaN(ap) || ap <= 0 || ap > saldoActual) { alert("Fichas insuficientes"); return; }
    await cambiarSaldoPropio(-ap);
    const num = Math.floor(Math.random() * 100) + 1;
    document.getElementById("dado-num").innerText = "🎲 " + num;
    const msg = document.getElementById("dado-msg");
    if ((tipo === "menor" && num < 50) || (tipo === "mayor" && num > 50)) {
        await cambiarSaldoPropio(ap * 2); msg.style.color = "var(--green)"; msg.innerText = "🎉 ¡Ganaste 🪙 " + (ap * 2) + "!";
    } else { msg.style.color = "var(--red)"; msg.innerText = "❌ Perdiste"; }
}
document.getElementById("btn-menor").onclick = function() { tirarDado("menor"); };
document.getElementById("btn-mayor").onclick = function() { tirarDado("mayor"); };
