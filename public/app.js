const API_BASE = 'http://localhost:5000';
let currentUser = null;
let authToken = null;

// Auth functions
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = { role: data.role, username };
            showDashboard();
            showMessage('loginMessage', 'Login successful!', 'success');
        } else {
            showMessage('loginMessage', data.error, 'error');
        }
    } catch (error) {
        showMessage('loginMessage', 'Network error', 'error');
    }
}

async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const name = document.getElementById('regName').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const specialty = document.getElementById('regSpecialty').value;
    const licenseNumber = role === 'doctor' ? 
        document.getElementById('regLicense').value : 
        document.getElementById('regLicensePharm').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                email, 
                name, 
                password, 
                role, 
                specialty, 
                licenseNumber 
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('registerMessage', data.message, 'success');
            setTimeout(showLogin, 2000);
        } else {
            showMessage('registerMessage', data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('registerMessage', 'Network error', 'error');
    }
}

function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    const userInfo = document.getElementById('userInfo');
    userInfo.textContent = `Logged in as: ${currentUser.username} (${currentUser.role})`;
    userInfo.classList.remove('hidden');
    
    setupDashboard();
    loadAppointments();
}

function setupDashboard() {
    // Show/hide sections based on role
    if (currentUser.role === 'patient') {
        document.getElementById('createAppointment').classList.remove('hidden');
        loadDoctors();
    }
    
    if (currentUser.role === 'doctor') {
        document.getElementById('uploadRecord').classList.remove('hidden');
        loadPatients();
    }
    
    if (currentUser.role === 'pharmacist') {
        document.getElementById('inventoryTab').style.display = 'block';
        document.getElementById('prescriptionsTab').style.display = 'block';
    }
}

async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE}/auth/doctors`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const doctors = await response.json();
            const select = document.getElementById('doctorId');
            select.innerHTML = '<option value="">Select Doctor</option>';
            doctors.forEach(doctor => {
                select.innerHTML += `<option value="${doctor._id}">${doctor.username}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadPatients() {
    // This would need a patients endpoint in your backend
    // For now, just placeholder
    const select = document.getElementById('recordPatientId');
    select.innerHTML = '<option value="">Select Patient</option>';
}

async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const appointments = await response.json();
            displayAppointments(appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = '<p>No appointments found.</p>';
        return;
    }
    
    let html = '';
    appointments.forEach(appointment => {
        html += `
            <div class="list-item">
                <div class="flex justify-between items-center">
                    <div>
                        <strong>Date:</strong> ${new Date(appointment.date).toLocaleString()}<br>
                        <strong>Doctor:</strong> ${appointment.doctorId?.username || 'N/A'}<br>
                        <strong>Patient:</strong> ${appointment.patientId?.username || 'N/A'}<br>
                        <strong>Reason:</strong> ${appointment.reason}
                    </div>
                    <span class="status status-${appointment.status}">${appointment.status}</span>
                </div>
                ${getAppointmentActions(appointment)}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getAppointmentActions(appointment) {
    if (currentUser.role === 'nurse' && appointment.status === 'pending') {
        return `
            <div class="mt-10">
                <button onclick="updateAppointmentStatus('${appointment._id}', 'approved')">Approve</button>
                <button onclick="updateAppointmentStatus('${appointment._id}', 'denied')">Deny</button>
            </div>
        `;
    }
    
    if (currentUser.role === 'doctor' && appointment.status === 'approved') {
        return `
            <div class="mt-10">
                <button onclick="updateAppointmentStatus('${appointment._id}', 'completed')">Mark Complete</button>
            </div>
        `;
    }
    
    return '';
}

async function updateAppointmentStatus(id, status) {
    const endpoint = status === 'approved' ? 'approve' : status === 'denied' ? 'deny' : 'complete';
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}/${endpoint}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadAppointments();
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
    }
}

async function createAppointment(event) {
    event.preventDefault();
    
    const doctorId = document.getElementById('doctorId').value;
    const date = document.getElementById('appointmentDate').value;
    const reason = document.getElementById('appointmentReason').value;
    
    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ doctorId, date, reason })
        });
        
        if (response.ok) {
            document.getElementById('appointmentForm').reset();
            loadAppointments();
            alert('Appointment requested successfully!');
        } else {
            const errorText = await response.text();
            alert('Error: ' + errorText);
        }
    } catch (error) {
        alert('Network error');
    }
}

// Tab navigation
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab and set active class
    document.getElementById(`${tabName}Content`).classList.remove('hidden');
    event.target.classList.add('active');
    
    // Load content for the tab if needed
    if (tabName === 'inventory') {
        loadInventory();
    } else if (tabName === 'prescriptions') {
        loadPrescriptions();
    }
}

async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/inventory`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const inventory = await response.json();
            displayInventory(inventory);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function displayInventory(inventory) {
    const container = document.getElementById('inventoryList');
    
    if (inventory.length === 0) {
        container.innerHTML = '<p>No inventory items found.</p>';
        return;
    }
    
    let html = '';
    inventory.forEach(item => {
        html += `
            <div class="list-item">
                <div class="flex justify-between items-center">
                    <div>
                        <strong>Name:</strong> ${item.name}<br>
                        <strong>Quantity:</strong> ${item.quantity}<br>
                        <strong>Price:</strong> $${item.price}
                    </div>
                    <span class="status ${item.quantity < 10 ? 'status-denied' : 'status-approved'}">
                        ${item.quantity < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadPrescriptions() {
    try {
        const response = await fetch(`${API_BASE}/prescriptions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const prescriptions = await response.json();
            displayPrescriptions(prescriptions);
        }
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

function displayPrescriptions(prescriptions) {
    const container = document.getElementById('prescriptionsList');
    
    if (prescriptions.length === 0) {
        container.innerHTML = '<p>No prescriptions found.</p>';
        return;
    }
    
    let html = '';
    prescriptions.forEach(prescription => {
        html += `
            <div class="list-item">
                <div>
                    <strong>Patient:</strong> ${prescription.patientId?.username || 'N/A'}<br>
                    <strong>Doctor:</strong> ${prescription.doctorId?.username || 'N/A'}<br>
                    <strong>Medication:</strong> ${prescription.medication}<br>
                    <strong>Dosage:</strong> ${prescription.dosage}<br>
                    <strong>Instructions:</strong> ${prescription.instructions}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// UI helper functions
function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('registerSection').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove('hidden');
    
    // Clear message after 5 seconds
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

function logout() {
    currentUser = null;
    authToken = null;
    
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('registerForm').addEventListener('submit', register);
    document.getElementById('appointmentForm').addEventListener('submit', createAppointment);
});
// In your app.js file, add this function
function toggleRoleFields() {
    const role = document.getElementById('regRole').value;
    const doctorFields = document.getElementById('doctorFields');
    const pharmacistFields = document.getElementById('pharmacistFields');
    
    doctorFields.classList.add('hidden');
    pharmacistFields.classList.add('hidden');
    
    if (role === 'doctor') {
        doctorFields.classList.remove('hidden');
    } else if (role === 'pharmacist') {
        pharmacistFields.classList.remove('hidden');
    }
}
async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    // Validate password length
    if (password.length < 6) {
        showMessage('registerMessage', 'Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (response.ok) {
            showMessage('registerMessage', 'Registration successful! Please login.', 'success');
            setTimeout(showLogin, 2000);
        } else {
            const errorText = await response.text();
            showMessage('registerMessage', errorText, 'error');
        }
    } catch (error) {
        showMessage('registerMessage', 'Network error', 'error');
    }
}