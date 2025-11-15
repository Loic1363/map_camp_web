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

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    API.login(email, password)
        .then((data) => {
            API.setToken(data.token);
            window.location.href = '/index.html';
        })
        .catch((err) => {
            loginError.textContent = err.message || 'Erreur de connexion';
        });
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    registerError.textContent = '';

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    API.register(email, password)
        .then(() => {
            alert('Account created! You can now login.');
            tabLogin.click();
        })
        .catch((err) => {
            registerError.textContent = err.message || 'Erreur inscription';
        });
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
