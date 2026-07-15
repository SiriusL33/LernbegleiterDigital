/*
 * WBT Companion - Auth Handler (Login & Registrierung)
 */

let isLoginMode = true; // Wir starten immer im Login-Modus
let csrfToken = null;

const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-mode-btn');
const errorMsg = document.getElementById('error-msg');

// 1. Modus umschalten (Anmelden <-> Registrieren)
toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    errorMsg.classList.add('hidden'); // Fehler beim Wechseln verstecken
    
    if (isLoginMode) {
        formTitle.innerText = "Mitarbeiter Login";
        submitBtn.innerHTML = "Sicher Anmelden ➜";
        toggleBtn.innerHTML = 'Noch kein Konto? <span class="text-blue-600">Hier registrieren</span>';
    } else {
        formTitle.innerText = "Neues Konto erstellen";
        submitBtn.innerHTML = "Konto anlegen & Starten ➜";
        toggleBtn.innerHTML = 'Bereits registriert? <span class="text-blue-600">Zum Login</span>';
    }
});

// 2. Formular abschicken
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value;
    
    // Lade-Animation
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Verarbeite...";
    submitBtn.classList.add('opacity-70', 'cursor-wait');
    errorMsg.classList.add('hidden');

    // Wir entscheiden dynamisch, welche API wir ansprechen
    const apiUrl = isLoginMode ? '/api/login' : '/api/register';

    try {
        csrfToken = csrfToken || await getCsrfToken();

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();

        if (response.ok) {
            submitBtn.innerHTML = "✓ Erfolgreich";
            submitBtn.classList.replace('bg-blue-600', 'bg-green-500');
            
            setTimeout(() => {
                window.location.replace('/pages/explore.html');
            }, 600);
        } else {
            errorMsg.innerText = data.error || "Ein Fehler ist aufgetreten.";
            errorMsg.classList.remove('hidden');
            resetButton();
        }
    } catch (err) {
        errorMsg.innerText = "Server nicht erreichbar.";
        errorMsg.classList.remove('hidden');
        resetButton();
    }

    function resetButton() {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.classList.remove('opacity-70', 'cursor-wait');
    }
});

async function getCsrfToken() {
    const response = await fetch('/api/csrf-token', { method: 'GET' });
    if (!response.ok) {
        throw new Error('CSRF-Token konnte nicht geladen werden.');
    }

    const data = await response.json();
    return data.csrfToken;
}
