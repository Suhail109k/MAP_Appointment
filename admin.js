const API_BASE = '/api';

async function loadSession() {
  const response = await fetch(`${API_BASE}/auth/session`);
  if (!response.ok) {
    window.location.href = '/';
    return null;
  }

  const session = await response.json();
  if (session.role !== 'admin') {
    window.location.href = '/book.html';
    return null;
  }

  const info = document.getElementById('adminSessionInfo');
  if (info) {
    info.textContent = `Signed in as admin: ${session.email}`;
  }

  return session;
}

async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  window.location.href = '/';
}

function showAlert(message, type = 'success') {
  const resultsDiv = document.getElementById('results');
  resultsDiv.className = `alert alert-${type} animate-fade-in`;
  resultsDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
  resultsDiv.style.display = 'block';
  setTimeout(() => {
    resultsDiv.style.display = 'none';
  }, 5000);
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 100;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 20);
}

function animateProgress(element, percentage) {
  element.style.width = '0%';
  setTimeout(() => {
    element.style.width = `${percentage}%`;
  }, 500);
}

async function loadStats() {
  try {
    const [doctorsRes, patientsRes, appointmentsRes] = await Promise.all([
      fetch(`${API_BASE}/doctors`),
      fetch(`${API_BASE}/patients`),
      fetch(`${API_BASE}/appointments`)
    ]);

    const doctors = await doctorsRes.json();
    const patients = await patientsRes.json();
    const appointments = await appointmentsRes.json();

    const doctorsCount = doctors.length;
    const patientsCount = patients.length;
    const appointmentsCount = appointments.length;
    const pendingCount = appointments.filter((app) => app.status === 'booked').length;

    animateCounter(document.getElementById('doctorsCount'), doctorsCount);
    animateCounter(document.getElementById('patientsCount'), patientsCount);
    animateCounter(document.getElementById('appointmentsCount'), appointmentsCount);
    animateCounter(document.getElementById('pendingCount'), pendingCount);

    animateProgress(document.getElementById('doctorsProgress'), Math.min((doctorsCount / 20) * 100, 100));
    animateProgress(document.getElementById('patientsProgress'), Math.min((patientsCount / 50) * 100, 100));
    animateProgress(document.getElementById('appointmentsProgress'), Math.min((appointmentsCount / 100) * 100, 100));
    animateProgress(document.getElementById('pendingProgress'), Math.min((pendingCount / appointmentsCount) * 100 || 0, 100));
  } catch (error) {
    console.error('Error loading stats:', error);
    showAlert('Error loading statistics', 'danger');
  }
}

async function loadAppointments() {
  const tableBody = document.getElementById('appointmentsTable');
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-4">
        <div class="loading-spinner mx-auto"></div>
        <p class="mt-2 text-muted">Loading appointments...</p>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(`${API_BASE}/appointments`);
    const appointments = await response.json();

    setTimeout(() => {
      tableBody.innerHTML = appointments.map((app, index) => `
        <tr style="animation: fadeIn 0.5s ease-out ${index * 0.1}s both;">
          <td>
            <strong>${app.patient.name}</strong><br>
            <small class="text-muted">${app.patient.email}</small>
          </td>
          <td>
            <strong>${app.doctor.name}</strong><br>
            <small class="text-muted">${app.doctor.specialty}</small>
          </td>
          <td>
            ${new Date(app.date).toDateString()}<br>
            <small class="text-muted">${app.time}</small>
          </td>
          <td><small>${app.reason || 'N/A'}</small></td>
          <td><small>${app.problem || 'N/A'}</small></td>
          <td><small>${app.medicine || 'N/A'}</small></td>
          <td>
            <span class="badge bg-${app.status === 'booked' ? 'primary' : app.status === 'completed' ? 'success' : 'danger'}">
              ${app.status}
            </span>
          </td>
          <td>
            ${
              app.status === 'booked'
                ? `
                  <button class="btn btn-success btn-sm me-1" type="button" data-action="update-status" data-id="${app._id}" data-status="completed">
                    <i class="fas fa-check"></i> Complete
                  </button>
                  <button class="btn btn-danger btn-sm" type="button" data-action="update-status" data-id="${app._id}" data-status="cancelled">
                    <i class="fas fa-times"></i> Cancel
                  </button>
                `
                : '<span class="text-muted">No actions</span>'
            }
          </td>
        </tr>
      `).join('');
    }, 1000);
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <p class="mt-2">Error loading appointments</p>
        </td>
      </tr>
    `;
    showAlert(`Error loading appointments: ${error.message}`, 'danger');
  }
}

async function updateStatus(button, appointmentId, status) {
  let medicine;
  if (status === 'completed') {
    medicine = window.prompt('Enter the medicine given to the patient:');

    if (medicine === null) {
      return;
    }

    medicine = medicine.trim();

    if (!medicine) {
      showAlert('Medicine is required to complete the appointment.', 'danger');
      return;
    }
  }

  const originalContent = button.innerHTML;
  button.innerHTML = '<div class="loading-spinner"></div>';
  button.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(status === 'completed' ? { medicine } : {})
      })
    });

    setTimeout(async () => {
      if (response.ok) {
        showAlert(
          status === 'completed'
            ? `Appointment completed successfully. Medicine given: ${medicine}.`
            : `Appointment ${status} successfully!`,
          'success'
        );
        loadAppointments();
        loadStats();
      } else {
        const result = await response.json();
        showAlert(`Error: ${result.message}`, 'danger');
      }

      button.innerHTML = originalContent;
      button.disabled = false;
    }, 1000);
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'danger');
    button.innerHTML = originalContent;
    button.disabled = false;
  }
}

async function loadPatients() {
  const patientsList = document.getElementById('patientsList');
  patientsList.innerHTML = `
    <div class="text-center py-3">
      <div class="loading-spinner mx-auto"></div>
      <p class="mt-2 text-muted">Loading patients...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/patients`);
    const patients = await response.json();

    setTimeout(() => {
      patientsList.innerHTML = patients.slice(0, 5).map((patient, index) => `
        <div class="list-group-item animate-fade-in" style="animation-delay: ${index * 0.1}s;">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${patient.name}</strong><br>
              <small class="text-muted">${patient.email} | ${patient.phone}</small>
            </div>
            <i class="fas fa-user text-primary"></i>
          </div>
        </div>
      `).join('');
    }, 800);
  } catch (error) {
    patientsList.innerHTML = `
      <div class="text-center py-3 text-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <p class="mt-2">Error loading patients</p>
      </div>
    `;
    console.error('Error loading patients:', error);
  }
}

async function loadDoctors() {
  const doctorsList = document.getElementById('doctorsList');
  doctorsList.innerHTML = `
    <div class="text-center py-3">
      <div class="loading-spinner mx-auto"></div>
      <p class="mt-2 text-muted">Loading doctors...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/doctors`);
    const doctors = await response.json();

    setTimeout(() => {
      doctorsList.innerHTML = doctors.map((doctor, index) => `
        <div class="list-group-item animate-fade-in" style="animation-delay: ${index * 0.1}s;">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${doctor.name}</strong><br>
              <small class="text-muted">${doctor.specialty}</small>
            </div>
            <i class="fas fa-user-md text-primary"></i>
          </div>
        </div>
      `).join('');
    }, 800);
  } catch (error) {
    doctorsList.innerHTML = `
      <div class="text-center py-3 text-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <p class="mt-2">Error loading doctors</p>
      </div>
    `;
    console.error('Error loading doctors:', error);
  }
}

function handleScroll() {
  document.querySelectorAll('.animate-fade-in, .animate-slide-up, .animate-bounce-in').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const refreshButton = document.getElementById('refreshAppointments');
  const refreshText = document.getElementById('refreshText');
  const appointmentsTable = document.getElementById('appointmentsTable');
  const logoutButton = document.getElementById('logoutButton');

  loadSession().then((session) => {
    if (!session) {
      return;
    }

    setTimeout(loadStats, 200);
    setTimeout(loadAppointments, 400);
    setTimeout(loadPatients, 600);
    setTimeout(loadDoctors, 800);
  });

  refreshButton.addEventListener('click', () => {
    const originalText = refreshText.textContent;
    refreshText.innerHTML = '<div class="loading-spinner" style="width: 14px; height: 14px;"></div>';

    setTimeout(() => {
      loadAppointments();
      loadStats();
      refreshText.textContent = originalText;
    }, 500);
  });

  appointmentsTable.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="update-status"]');
    if (!button) {
      return;
    }

    updateStatus(button, button.dataset.id, button.dataset.status);
  });

  logoutButton.addEventListener('click', logout);
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('load', handleScroll);
});
