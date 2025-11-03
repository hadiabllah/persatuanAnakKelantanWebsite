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
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            const src = user.avatarUrl || user.photoUrl || '';
            if (src) { avatarEl.src = src; }
        }
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
            if (btn) { btn.style.display = 'none'; }
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
    // avatar preview
    const avatarInput = document.getElementById('set_avatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('previewImg');
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Wire up Users filters
    const roleSel = document.getElementById('filter_role');
    const occSel = document.getElementById('filter_occupation');
    const roleText = document.getElementById('filter_role_text');
    const occText = document.getElementById('filter_occupation_text');
    if (roleSel) roleSel.addEventListener('change', applyFiltersAndRender);
    if (occSel) occSel.addEventListener('change', applyFiltersAndRender);
    if (roleText) roleText.addEventListener('input', applyFiltersAndRender);
    if (occText) occText.addEventListener('input', applyFiltersAndRender);
    
    // Wire up delete confirmation modal
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteMeeting);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    
    // default QR URL
    const qrUrl = document.getElementById('qr_url');
    if (qrUrl && !qrUrl.value) { qrUrl.value = 'http://localhost:3000/signup'; }
    // Show home by default
    openHome();
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
    // Ensure Senarai Ahli is closed when opening Users management
    closeListMember();
    // Hide Add User form to avoid overlap
    closeAddUser();
    closePayment();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
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
    closePayment();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
    closeListMember();
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
    closePayment();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
    closeListMember();
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
    if (!currentUser || (currentUser.role !== 'Pentadbir' && currentUser.role !== 'admin')) {
        showMessage('Admin access required.', true);
        return;
    }
    // Hide other sections to avoid overlap
    closeUsers();
    closeAddUser();
    closeSettings();
    closePayment();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
    closeListMember();
    const section = document.getElementById('qrSection');
    if (section) { section.style.display = 'block'; }
}

function closeQR() {
    const section = document.getElementById('qrSection');
    if (section) { section.style.display = 'none'; }
}

function openPayment() {
    // Hide other sections
    closeListMember();
    closeUsers();
    closeAddUser();
    closeSettings();
    closeQR();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
    const section = document.getElementById('paymentSection');
    if (section) { section.style.display = 'block'; }
}

function closePayment() {
    const section = document.getElementById('paymentSection');
    if (section) { section.style.display = 'none'; }
}

function openHome() {
    closeListMember();
    closeUsers();
    closeAddUser();
    closeSettings();
    closeQR();
    closePayment();
    closeMeeting();
    closeMeetingManagement();
    const section = document.getElementById('homeSection');
    if (section) { section.style.display = 'block'; }
}

function closeHome() {
    const section = document.getElementById('homeSection');
    if (section) { section.style.display = 'none'; }
}

async function openMeeting() {
    closeListMember();
    closeUsers();
    closeAddUser();
    closeSettings();
    closeQR();
    closePayment();
    closeHome();
    closeMeetingManagement();
    const section = document.getElementById('meetingSection');
    if (section) { 
        section.classList.remove('hidden');
    }
    
    // Load upcoming meeting from database
    await loadUpcomingMeeting();
    
    // Load existing RSVP from localStorage, if any
    const rsvpStatus = localStorage.getItem('meeting_rsvp') || 'unknown';
    updateRSVPStatus(rsvpStatus);
}

async function loadUpcomingMeeting() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/meetings/upcoming`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success && data.meetings.length > 0) {
            const meeting = data.meetings[0]; // Get the next upcoming meeting
            
            // Update the meeting display
            const titleEl = document.getElementById('meet_title');
            const datetimeEl = document.getElementById('meet_datetime');
            const placeEl = document.getElementById('meet_place');
            const agendaEl = document.getElementById('meet_agenda');
            
            if (titleEl) titleEl.textContent = meeting.title;
            if (datetimeEl) datetimeEl.textContent = new Date(meeting.datetime).toLocaleString('en-MY');
            if (placeEl) placeEl.textContent = meeting.place;
            
            if (agendaEl && meeting.agenda) {
                agendaEl.innerHTML = '';
                meeting.agenda.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    agendaEl.appendChild(li);
                });
            }
            
            // Store meeting ID for RSVP
            localStorage.setItem('current_meeting_id', meeting._id);
        }
    } catch (error) {
        console.error('Load upcoming meeting error:', error);
        // Fallback to default meeting info
    }
}

function closeMeeting() {
    const section = document.getElementById('meetingSection');
    if (section) { section.classList.add('hidden'); }
}

async function setMeetingRSVP(status) {
    // status: 'attending' | 'not_attending'
    try {
        const meetingId = localStorage.getItem('current_meeting_id');
        if (!meetingId) {
            showMessage('No meeting found to RSVP to.', true);
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/meetings/${meetingId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
        localStorage.setItem('meeting_rsvp', status);
        updateRSVPStatus(status);
            showMessage(data.message);
        } else {
            const message = data && data.message ? data.message : 'Failed to update RSVP';
            showMessage(message, true);
        }
    } catch (error) {
        console.error('RSVP error:', error);
        showMessage('Error updating RSVP. Please try again.', true);
    }
}

function updateRSVPStatus(status) {
    const label = status === 'attending' ? 'Hadir' : status === 'not_attending' ? 'Tidak hadir' : 'Belum dijawab';
    const el = document.getElementById('rsvpStatus');
    if (el) { el.textContent = `RSVP: ${label}`; }
}

function openMeetingManagement() {
    closeListMember();
    closeUsers();
    closeAddUser();
    closeSettings();
    closeQR();
    closePayment();
    closeHome();
    closeMeeting();
    const section = document.getElementById('meetingMgmtSection');
    if (section) { 
        section.classList.remove('hidden');
    }
    
    // Load meetings list
    loadMeetingsList();
}

function toggleMeetingForm() {
    const formContainer = document.getElementById('meetingFormContainer');
    const toggleBtn = document.getElementById('toggleFormBtn');
    
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        toggleBtn.textContent = 'Tutup Form';
    } else {
        formContainer.classList.add('hidden');
        toggleBtn.textContent = 'Tambah Mesyuarat';
        // Reset form
        document.getElementById('meetingForm').reset();
    }
}

async function loadMeetingsList() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            const tbody = document.getElementById('meetingsTableBody');
            tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#dc3545;">Sila log masuk semula</td></tr>';
            return;
        }

        console.log('Loading meetings from:', `${API_BASE}/meetings/`);
        const response = await fetch(`${API_BASE}/meetings/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        const tbody = document.getElementById('meetingsTableBody');
        
        if (!response.ok || !data.success) {
            const errorMsg = data.message || 'Ralat memuatkan mesyuarat';
            console.error('API Error:', errorMsg);
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#dc3545;">${errorMsg}</td></tr>`;
            return;
        }
        
        if (!data.meetings || data.meetings.length === 0) {
            console.log('No meetings found in database');
            tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#666;">Tiada mesyuarat dijumpai</td></tr>';
            return;
        }
        
        console.log(`Found ${data.meetings.length} meetings`);
        tbody.innerHTML = '';
        data.meetings.forEach((meeting, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e9ecef';
            
            const statusBadge = getStatusBadge(meeting.status);
            const actions = getMeetingActions(meeting);
            
            tr.innerHTML = `
                <td style="padding:12px 8px;">${meeting.title}</td>
                <td style="padding:12px 8px;">${new Date(meeting.datetime).toLocaleString('en-MY')}</td>
                <td style="padding:12px 8px;">${meeting.place}</td>
                <td style="padding:12px 8px;">${statusBadge}</td>
                <td style="padding:12px 8px;">${actions}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Load meetings error:', error);
        const tbody = document.getElementById('meetingsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#dc3545;">Ralat memuatkan mesyuarat</td></tr>';
    }
}

function getStatusBadge(status) {
    const badges = {
        'upcoming': '<span style="background:#28a745; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">Akan Datang</span>',
        'ongoing': '<span style="background:#ffc107; color:black; padding:4px 8px; border-radius:4px; font-size:12px;">Sedang Berlangsung</span>',
        'completed': '<span style="background:#6c757d; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">Selesai</span>',
        'cancelled': '<span style="background:#dc3545; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">Dibatalkan</span>'
    };
    return badges[status] || '<span style="background:#6c757d; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">Tidak Diketahui</span>';
}

function getMeetingActions(meeting) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Handle both populated and non-populated createdBy field
    let creatorId = null;
    if (meeting.createdBy) {
        creatorId = typeof meeting.createdBy === 'object' ? meeting.createdBy._id : meeting.createdBy;
    }
    
    const isCreator = creatorId && creatorId === currentUser.id;
    const isAdmin = currentUser.role === 'Pentadbir';
    
    let actions = '';
    
    if (isCreator || isAdmin) {
        actions += `<button onclick="editMeeting('${meeting._id}')" style="background:#007bff; color:white; border:none; padding:4px 8px; border-radius:4px; margin-right:4px; cursor:pointer; font-size:12px;">Edit</button>`;
        actions += `<button onclick="deleteMeeting('${meeting._id}')" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">Padam</button>`;
    }
    
    return actions || '<span style="color:#666; font-size:12px;">Tiada tindakan</span>';
}

let pendingDeleteId = null;

function showDeleteConfirmation(meetingId) {
    pendingDeleteId = meetingId;
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('hidden');
}

function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.add('hidden');
    pendingDeleteId = null;
}

async function confirmDeleteMeeting() {
    if (!pendingDeleteId) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/meetings/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            loadMeetingsList(); // Reload the list
        } else {
            const message = data && data.message ? data.message : 'Gagal memadam mesyuarat';
            showMessage(message, true);
        }
    } catch (error) {
        console.error('Delete meeting error:', error);
        showMessage('Ralat memadam mesyuarat. Sila cuba lagi.', true);
    } finally {
        hideDeleteConfirmation();
    }
}

async function deleteMeeting(meetingId) {
    showDeleteConfirmation(meetingId);
}

function editMeeting(meetingId) {
    // For now, just show a message. You can implement edit functionality later
    showMessage('Fungsi edit akan ditambah kemudian.', true);
}

function closeMeetingManagement() {
    const section = document.getElementById('meetingMgmtSection');
    if (section) { section.classList.add('hidden'); }
}

// Handle create meeting form
document.addEventListener('DOMContentLoaded', function() {
    const mf = document.getElementById('meetingForm');
    if (mf) {
        mf.addEventListener('submit', function(e) {
            e.preventDefault();
            createMeeting();
        });
    }
});

// Senarai Ahli (List Members) based on /api/ahli
async function fetchAhli() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/ahli`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Gagal memuatkan senarai ahli';
            showMessage(message, true);
            renderAhli([]);
            return;
        }
        renderAhli(data.ahli || []);
    } catch (error) {
        console.error('Fetch ahli error:', error);
        showMessage('Ralat memuatkan senarai ahli.', true);
        renderAhli([]);
    }
}

function renderAhli(items) {
    const tbody = document.getElementById('ahliTableBody');
    if (!tbody) { return; }
    tbody.innerHTML = '';
    if (!items.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 10;
        td.style.padding = '12px';
        td.textContent = 'Tiada ahli.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    items.forEach((a, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f0f0f0';
        const cells = [
            idx + 1,
            a.idNo || '-',
            a.fullName || '-',
            a.icNumber || '-',
            a.phoneNumber || '-',
            a.email || '-',
            a.address || '-',
            a.gender || '-',
            a.job || '-'
        ];
        cells.forEach(val => {
            const td = document.createElement('td');
            td.style.padding = '8px';
            td.textContent = val;
            tr.appendChild(td);
        });
        const tdAction = document.createElement('td');
        tdAction.style.padding = '8px';
        const btn = document.createElement('button');
        btn.textContent = 'Padam';
        btn.className = 'logout-btn';
        btn.style.backgroundColor = '#dc3545';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.onclick = () => deleteAhli(a._id, a.idNo || a.fullName || a.email);
        tdAction.appendChild(btn);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
}

async function deleteAhli(id, label) {
    if (!id) return;
    const ok = confirm(`Padam ahli "${label}"? Tindakan ini tidak boleh diundur.`);
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/ahli/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Gagal memadam ahli';
            showMessage(message, true);
            return;
        }
        showMessage('Ahli berjaya dipadam.');
        fetchAhli();
    } catch (error) {
        console.error('Delete ahli error:', error);
        showMessage('Ralat memadam ahli.', true);
    }
}

function openListMember() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser || (currentUser.role !== 'Pentadbir' && currentUser.role !== 'admin')) {
        showMessage('Admin access required.', true);
        return;
    }
    closeUsers();
    closeAddUser();
    closeSettings();
    closeQR();
    closePayment();
    closeHome();
    closeMeeting();
    closeMeetingManagement();
    const section = document.getElementById('ahliSection');
    if (section) { section.style.display = 'block'; }
    // ensure form is hidden when opening list
    const form = document.getElementById('ahliFormContainer');
    const btn = document.getElementById('toggleAhliFormBtn');
    if (form && !form.classList.contains('hidden')) { form.classList.add('hidden'); }
    if (btn) { btn.textContent = 'Tambah Ahli'; }
    fetchAhli();
}

function closeListMember() {
    const section = document.getElementById('ahliSection');
    if (section) { section.style.display = 'none'; }
}

function toggleAhliForm() {
    const formContainer = document.getElementById('ahliFormContainer');
    const toggleBtn = document.getElementById('toggleAhliFormBtn');
    if (!formContainer || !toggleBtn) return;
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        toggleBtn.textContent = 'Tutup Form';
    } else {
        formContainer.classList.add('hidden');
        toggleBtn.textContent = 'Tambah Ahli';
        const f = document.getElementById('ahliForm');
        if (f) f.reset();
    }
}

// Handle ahli form submit
document.addEventListener('DOMContentLoaded', function() {
    const f = document.getElementById('ahliForm');
    if (f) {
        f.addEventListener('submit', function(e) {
            e.preventDefault();
            addAhli();
        });
    }
});

async function addAhli() {
    try {
        const form = document.getElementById('ahliForm');
        if (!form) return;
        const fd = new FormData(form);
        const payload = {
            idNo: (fd.get('idNo') || '').toString().trim(),
            fullName: (fd.get('fullName') || '').toString().trim(),
            icNumber: (fd.get('icNumber') || '').toString().trim(),
            phoneNumber: (fd.get('phoneNumber') || '').toString().trim(),
            email: (fd.get('email') || '').toString().trim(),
            address: (fd.get('address') || '').toString().trim(),
            gender: (fd.get('gender') || '').toString(),
            job: (fd.get('job') || '').toString()
        };

        if (!payload.idNo || !payload.fullName) {
            showMessage('Sila isi ID NO dan Nama Penuh.', true);
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/ahli`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Gagal menambah ahli';
            showMessage(message, true);
            return;
        }
        showMessage('Ahli berjaya ditambah.');
        form.reset();
        toggleAhliForm();
        fetchAhli();
    } catch (error) {
        console.error('Add ahli error:', error);
        showMessage('Ralat menambah ahli.', true);
    }
}

async function createMeeting() {
    const title = (document.getElementById('mf_title')?.value || '').trim();
    const datetime = (document.getElementById('mf_datetime')?.value || '').trim();
    const place = (document.getElementById('mf_place')?.value || '').trim();
    const agendaText = (document.getElementById('mf_agenda')?.value || '').trim();
    
    if (!title || !datetime || !place) { 
        showMessage('Please fill all required fields.', true); 
        return; 
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/meetings/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                datetime,
                place,
                agenda: agendaText
            })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            const message = data && data.message ? data.message : 'Failed to create meeting';
            showMessage(message, true);
            return;
        }

        showMessage('Meeting created successfully.');
        
        // Reset form and hide it
        document.getElementById('meetingForm').reset();
        toggleMeetingForm();
        
        // Reload meetings list
        loadMeetingsList();
        
    } catch (error) {
        console.error('Create meeting error:', error);
        showMessage('Error creating meeting. Please try again.', true);
    }
}

function updatePaymentBalance() {
    const total = parseFloat((document.getElementById('pay_total')?.value || '0')) || 0;
    const paid = parseFloat((document.getElementById('pay_paid')?.value || '0')) || 0;
    const balance = Math.max(0, (total - paid));
    const balEl = document.getElementById('pay_balance');
    if (balEl) { balEl.value = balance.toFixed(2); }
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
        const avatarFile = formData.get('avatar');
        
        const payload = {};
        if (fullName.length > 0) { payload.fullName = fullName; }
        if (password.length > 0) { payload.password = password; }
        
        // Handle avatar upload
        if (avatarFile && avatarFile.size > 0) {
            // Convert file to base64
            const avatarUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(avatarFile);
            });
            
            payload.avatarUrl = avatarUrl;
        }
        
        if (!payload.fullName && !payload.password && !payload.avatarUrl) {
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