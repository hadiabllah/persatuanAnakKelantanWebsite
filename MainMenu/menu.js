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

            // Show Add User button for admin only
            const isAdmin = data.user.role === 'admin';
            const btn = document.getElementById('btnAddUser');
            if (btn) { btn.style.display = isAdmin ? 'inline-block' : 'none'; }
            // Also hide the form for non-admins if visible
            if (!isAdmin) { closeAddUser(); }
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

// Add new user via API
async function addUser() {
    try {
        // Use inline form instead of prompts
        const form = document.getElementById('addUserForm');
        if (!form) { return; }
        const formData = new FormData(form);
        const payload = {
            username: formData.get('username'),
            email: formData.get('email'),
            icNumber: formData.get('icNumber'),
            fullName: formData.get('fullName'),
            password: formData.get('password')
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(`User ${data.user.username} created successfully.`);
            form.reset();
            closeAddUser();
        } else {
            const message = data && data.message ? data.message : 'Failed to create user';
            showMessage(message, true);
        }
    } catch (error) {
        console.error('Add user error:', error);
        showMessage('Error creating user. Please try again.', true);
    }
}

function openAddUser() {
    const section = document.getElementById('addUserSection');
    if (section) { section.style.display = 'block'; }
}

function closeAddUser() {
    const section = document.getElementById('addUserSection');
    if (section) { section.style.display = 'none'; }
}

// Submit handler for add user form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addUser();
        });
    }
});