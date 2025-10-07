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
            const isAdmin = data.user.role === 'Pentadbir' || data.user.role === 'admin';
            const btn = document.getElementById('btnAddUser');
            if (btn) { btn.style.display = isAdmin ? 'inline-block' : 'none'; }
            const btnMember = document.getElementById('btnMemberMgmt');
            if (btnMember) { btnMember.style.display = isAdmin ? 'inline-block' : 'none'; }
            const btnQR = document.getElementById('btnQR');
            if (btnQR) { btnQR.style.display = isAdmin ? 'inline-block' : 'none'; }
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
    // settings form submit
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProfile();
        });
    }
    // default QR URL
    const qrUrl = document.getElementById('qr_url');
    if (qrUrl && !qrUrl.value) { qrUrl.value = 'http://localhost:3000/signup'; }

    // filters
    const roleSel = document.getElementById('filter_role');
    const occSel = document.getElementById('filter_occupation');
    if (roleSel) roleSel.addEventListener('change', applyFiltersAndRender);
    if (occSel) occSel.addEventListener('change', applyFiltersAndRender);
    const roleText = document.getElementById('filter_role_text');
    const occText = document.getElementById('filter_occupation_text');
    if (roleText) roleText.addEventListener('input', applyFiltersAndRender);
    if (occText) occText.addEventListener('input', applyFiltersAndRender);
});

// Fetch and render users
let allUsers = [];
async function fetchUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Failed to fetch users';
            showMessage(message, true);
            return;
        }
        allUsers = data.users || [];
        applyFiltersAndRender();
    } catch (error) {
        console.error('Fetch users error:', error);
        showMessage('Error fetching users. Please try again.', true);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) { return; }
    tbody.innerHTML = '';
    if (!users.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8; // #, Username, Full Name, Email, IC Number, Occupation, Role, Actions
        td.style.padding = '12px';
        td.textContent = 'No users found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    users.forEach((u, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f0f0f0';
        const cells = [
            idx + 1,
            u.username || '-',
            u.fullName || '-',
            u.email || '-',
            u.icNumber || '-',
            u.occupation || '-',
            u.role || '-'
        ];
        cells.forEach(val => {
            const td = document.createElement('td');
            td.style.padding = '8px';
            td.textContent = val;
            tr.appendChild(td);
        });
        // actions
        const tdAction = document.createElement('td');
        tdAction.style.padding = '8px';
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.className = 'logout-btn';
        btn.style.backgroundColor = '#dc3545';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.onclick = () => deleteUser(u.id || u._id, u.username);
        tdAction.appendChild(btn);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
}

function applyFiltersAndRender() {
    const roleSel = document.getElementById('filter_role');
    const occSel = document.getElementById('filter_occupation');
    const roleText = document.getElementById('filter_role_text');
    const occText = document.getElementById('filter_occupation_text');
    const role = roleSel ? roleSel.value : '';
    const occ = occSel ? occSel.value : '';
    const roleQ = roleText ? roleText.value.trim().toLowerCase() : '';
    const occQ = occText ? occText.value.trim().toLowerCase() : '';
    let filtered = allUsers.slice();
    if (role) {
        filtered = filtered.filter(u => (u.role || '') === role);
    }
    if (occ) {
        filtered = filtered.filter(u => (u.occupation || '') === occ);
    }
    if (roleQ) {
        filtered = filtered.filter(u => (u.role || '').toLowerCase().includes(roleQ));
    }
    if (occQ) {
        filtered = filtered.filter(u => (u.occupation || '').toLowerCase().includes(occQ));
    }
    renderUsers(filtered);
}

function resetFilters() {
    const roleSel = document.getElementById('filter_role');
    const occSel = document.getElementById('filter_occupation');
    const roleText = document.getElementById('filter_role_text');
    const occText = document.getElementById('filter_occupation_text');
    if (roleSel) roleSel.value = '';
    if (occSel) occSel.value = '';
    if (roleText) roleText.value = '';
    if (occText) occText.value = '';
    applyFiltersAndRender();
}

function openUsers() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser || (currentUser.role !== 'Pentadbir' && currentUser.role !== 'admin')) {
        showMessage('Admin access required.', true);
        return;
    }
    // Hide Add User form to avoid overlap
    closeAddUser();
    closeSettings();
    closeQR();
    const section = document.getElementById('usersSection');
    if (section) { section.style.display = 'block'; }
    fetchUsers();
}

function closeUsers() {
    const section = document.getElementById('usersSection');
    if (section) { section.style.display = 'none'; }
}

async function deleteUser(userId, username) {
    if (!userId) { return; }
    const ok = confirm(`Delete user "${username}"? This cannot be undone.`);
    if (!ok) { return; }
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Failed to delete user';
            showMessage(message, true);
            return;
        }
        showMessage('User deleted successfully.');
        fetchUsers();
    } catch (error) {
        console.error('Delete user error:', error);
        showMessage('Error deleting user. Please try again.', true);
    }
}

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
            password: formData.get('password'),
            role: (formData.get('role') || 'Ahli'),
            occupation: (formData.get('occupation') || '')
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
    // Hide Users section to avoid overlap
    closeUsers();
    closeSettings();
    closeQR();
    const section = document.getElementById('addUserSection');
    if (section) { section.style.display = 'block'; }
}

function closeAddUser() {
    const section = document.getElementById('addUserSection');
    if (section) { section.style.display = 'none'; }
}

function openSettings() {
    // Hide other sections to avoid overlap
    closeUsers();
    closeAddUser();
    closeQR();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const nameInput = document.getElementById('set_fullName');
    if (nameInput) { nameInput.value = user.fullName || ''; }
    const passInput = document.getElementById('set_password');
    if (passInput) { passInput.value = ''; }
    const section = document.getElementById('settingsSection');
    if (section) { section.style.display = 'block'; }
}

function closeSettings() {
    const section = document.getElementById('settingsSection');
    if (section) { section.style.display = 'none'; }
}

function openQR() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('Admin access required.', true);
        return;
    }
    // Hide other sections to avoid overlap
    closeUsers();
    closeAddUser();
    closeSettings();
    const section = document.getElementById('qrSection');
    if (section) { section.style.display = 'block'; }
}

function closeQR() {
    const section = document.getElementById('qrSection');
    if (section) { section.style.display = 'none'; }
}

let currentQRCode;
function generateQR() {
    const urlInput = document.getElementById('qr_url');
    const url = (urlInput && urlInput.value) ? urlInput.value.trim() : '';
    if (!url) { showMessage('Please enter a URL', true); return; }
    const container = document.getElementById('qrCode');
    if (!container) { return; }
    container.innerHTML = '';
    // eslint-disable-next-line no-undef
    currentQRCode = new QRCode(container, {
        text: url,
        width: 256,
        height: 256,
        colorDark : '#000000',
        colorLight : '#ffffff',
        correctLevel : QRCode.CorrectLevel.H
    });
    const btn = document.getElementById('qrDownloadBtn');
    if (btn) { btn.style.display = 'inline-block'; }
}

function downloadQR() {
    const container = document.getElementById('qrCode');
    if (!container) { return; }
    // try canvas first
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'signup-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
    }
    // fallback to img
    const img = container.querySelector('img');
    if (img && img.src) {
        const link = document.createElement('a');
        link.download = 'signup-qr.png';
        link.href = img.src;
        link.click();
    }
}

async function updateProfile() {
    try {
        const form = document.getElementById('settingsForm');
        if (!form) { return; }
        const formData = new FormData(form);
        const fullName = (formData.get('fullName') || '').toString().trim();
        const password = (formData.get('password') || '').toString();
        const payload = {};
        if (fullName.length > 0) { payload.fullName = fullName; }
        if (password.length > 0) { payload.password = password; }
        if (!payload.fullName && !payload.password) {
            showMessage('Nothing to update.', true);
            return;
        }
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Failed to update profile';
            showMessage(message, true);
            return;
        }
        // update local user and UI
        localStorage.setItem('user', JSON.stringify(data.user));
        loadUserInfo();
        showMessage('Profile updated successfully.');
        closeSettings();
    } catch (error) {
        console.error('Update profile error:', error);
        showMessage('Error updating profile. Please try again.', true);
    }
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