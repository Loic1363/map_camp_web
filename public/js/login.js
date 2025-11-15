const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

attachPasswordToggle('loginPassword', 'toggleLoginPassword');
attachPasswordToggle('registerPassword', 'toggleRegisterPassword');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
            loginError.textContent = data.error || 'Erreur de connexion';
            return;
        }

        // Sauver le token et aller vers la carte
        localStorage.setItem('authToken', data.token);
        window.location.href = '/index.html';
    } catch (err) {
        loginError.textContent = 'Erreur réseau';
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    try {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
            registerError.textContent = data.error || 'Erreur inscription';
            return;
        }

        // Après inscription, bascule sur onglet login
        tabLogin.click();
    } catch (err) {
        registerError.textContent = 'Erreur réseau';
    }
});

function attachPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;

    button.addEventListener('click', () => {
        const isHidden = input.getAttribute('type') === 'password';
        input.setAttribute('type', isHidden ? 'text' : 'password');
        button.textContent = isHidden ? 'Hide' : 'Show';
    });
}
