const API_BASE = 'http://localhost:3000/api';

function showMessage(message, isError = false) {
    const messageEl = document.getElementById('message');
    if (!messageEl) { return; }
    messageEl.textContent = message;
    messageEl.style.color = isError ? 'red' : 'green';
    messageEl.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signupForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fullName = document.getElementById('su_fullName').value;
        const username = document.getElementById('su_username').value;
        const email = document.getElementById('su_email').value;
        const icNumber = document.getElementById('su_ic').value;
        const password = document.getElementById('su_password').value;
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, username, email, icNumber, password })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                const message = data && data.message ? data.message : 'Failed to sign up';
                showMessage(message, true);
                return;
            }
            showMessage('Account created! Redirecting to login...');
            setTimeout(() => { window.location.href = '../Login/login.html'; }, 1200);
        } catch (err) {
            console.error('Signup error', err);
            showMessage('Error creating account. Please try again.', true);
        }
    });
});

