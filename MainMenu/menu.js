const API_BASE = 'http://localhost:3000/api';

// Show message
function showMessage(message, isError = false) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.style.color = isError ? 'red' : 'green';
    messageEl.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
    messageEl.style.display = 'block';
}

// Logout function
function logout() {
    // Clear stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    showMessage('Logging out...', false);
    
    // Redirect to login page after 1 second
    setTimeout(() => {
        window.location.href = '../Login/login.html';
    }, 1000);
}

// Load user information
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.username) {
        document.getElementById('userName').textContent = user.fullName || user.username;
        document.getElementById('userRole').textContent = user.role || 'Member';
        document.getElementById('userEmail').textContent = user.email || 'No email';
    } else {
        // If no user data, redirect to login
        showMessage('No user data found. Redirecting to login...', true);
        setTimeout(() => {
            window.location.href = '../Login/login.html';
        }, 2000);
    }
}

// Verify token on page load
async function verifyToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showMessage('No authentication token found. Redirecting to login...', true);
        setTimeout(() => {
            window.location.href = '../Login/login.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            showMessage('Invalid token. Redirecting to login...', true);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
                window.location.href = '../Login/login.html';
            }, 2000);
        } else {
            // Update user info with fresh data from server
            localStorage.setItem('user', JSON.stringify(data.user));
            loadUserInfo();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showMessage('Authentication error. Redirecting to login...', true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
            window.location.href = '../Login/login.html';
        }, 2000);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    verifyToken();
});
