const API_BASE = 'http://localhost:3000/api';

// Show message
function showMessage(elementId, message, isError = false) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.style.color = isError ? 'red' : 'green';
    messageEl.style.display = 'block';
}

// Login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store token in localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    showMessage('message', 'Login successful! Redirecting...', false);
                    
                    // Redirect to menu after 1 second
                    setTimeout(() => {
                        window.location.href = '../MainMenu/Menu.html';
                    }, 1000);
                } else {
                    showMessage('message', data.message, true);
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('message', 'Login failed. Please try again.', true);
            }
        });
    }

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token and redirect if valid
        fetch(`${API_BASE}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '../MainMenu/Menu.html';
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        });
    }
});
