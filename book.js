const API_BASE = '/api';

let selectedDoctor = null;
let selectedSlot = null;
let currentUser = null;

function showAlert(message, type = 'success') {
  const resultsDiv = document.getElementById('results');
  resultsDiv.className = `alert alert-${type}`;
  resultsDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
  resultsDiv.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

async function loadSession() {
  const response = await fetch(`${API_BASE}/auth/session`);
  if (!response.ok) {
    window.location.href = '/';
    return null;
  }

  const session = await response.json();
  if (session.role !== 'user') {
    window.location.href = '/admin.html';
    return null;
  }

  currentUser = session;
  document.getElementById('patientEmail').value = session.email;
  document.getElementById('patientName').value = session.name || '';
  document.getElementById('patientPhone').value = session.phone || '';
  document.getElementById('sessionEmail').textContent = `Signed in as ${session.email}`;
  return session;
}

async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  window.location.href = '/';
}

async function loadDoctors() {
  try {
    const response = await fetch(`${API_BASE}/doctors`);
    const doctors = await response.json();
    const doctorsList = document.getElementById('doctorsList');

    doctorsList.innerHTML = doctors.map((doctor) => `
      <div class="col-12">
        <div class="doctor-card" data-id="${doctor._id}" data-name="${doctor.name}" data-specialty="${doctor.specialty}">
          <div class="d-flex align-items-center justify-content-between gap-3">
            <div>
              <h6 class="mb-1 fw-semibold">${doctor.name}</h6>
              <div class="text-muted small">${doctor.specialty}</div>
            </div>
            <span class="badge rounded-pill">${doctor.specialty}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showAlert(`Error loading doctors: ${error.message}`, 'danger');
  }
}

async function loadSlots(doctorId) {
  try {
    const response = await fetch(`${API_BASE}/doctors/${doctorId}/availability`);
    const slots = await response.json();
    const slotsList = document.getElementById('slotsList');

    if (!slots.length) {
      slotsList.innerHTML = `
        <div class="alert alert-warning mb-0">
          <i class="fas fa-calendar-times"></i> No available slots for this doctor right now.
        </div>
      `;
      return;
    }

    slotsList.innerHTML = `
      <div class="row g-2">
        ${slots.map((slot) => `
          <div class="col-12 col-md-6">
            <button class="slot-btn" type="button" data-date="${slot.date}" data-time="${slot.time}">
              <div class="fw-semibold">${new Date(slot.date).toLocaleDateString()}</div>
              <div class="small">${slot.time}</div>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    showAlert(`Error loading slots: ${error.message}`, 'danger');
  }
}

function updateSelectedAppointment() {
  if (!selectedDoctor || !selectedSlot) {
    return;
  }

  document.getElementById('selectedDoctor').textContent = `${selectedDoctor.name} (${selectedDoctor.specialty})`;
  document.getElementById('selectedDateTime').textContent = `${new Date(selectedSlot.date).toLocaleDateString()} at ${selectedSlot.time}`;
  document.getElementById('selectedSlot').style.display = 'block';
  document.getElementById('bookBtn').disabled = false;
}

function resetBookingSelection() {
  selectedDoctor = null;
  selectedSlot = null;
  document.getElementById('selectedSlot').style.display = 'none';
  document.getElementById('bookBtn').disabled = true;
  document.querySelectorAll('.doctor-card').forEach((card) => card.classList.remove('selected'));
  document.getElementById('slotsList').innerHTML = 'Select a doctor to view available slots.';
}

function statusClass(status) {
  if (status === 'completed') return 'status-completed';
  if (status === 'cancelled') return 'status-cancelled';
  return 'status-booked';
}

async function loadMyAppointments() {
  const list = document.getElementById('appointmentStatusList');
  list.innerHTML = `
    <div class="col-12">
      <div class="alert alert-light mb-0">Loading your appointments...</div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/appointments/my/list`);
    const appointments = await response.json();

    if (!response.ok) {
      throw new Error(appointments.message || 'Unable to load appointments');
    }

    if (!appointments.length) {
      list.innerHTML = `
        <div class="col-12">
          <div class="alert alert-light mb-0">No appointments found for your account yet.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = appointments.map((appointment) => `
      <div class="col-lg-6">
        <div class="status-card h-100">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h6 class="mb-1 fw-semibold">${appointment.doctor.name}</h6>
              <div class="status-meta">${appointment.doctor.specialty}</div>
            </div>
            <span class="status-pill ${statusClass(appointment.status)}">${appointment.status}</span>
          </div>
          <div class="status-meta mb-2">
            <i class="fas fa-calendar-day"></i> ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}
          </div>
          <div class="status-meta mb-2">
            <strong>Reason:</strong> ${appointment.reason || 'N/A'}
          </div>
          <div class="status-meta mb-2">
            <strong>Problem:</strong> ${appointment.problem || 'N/A'}
          </div>
          <div class="status-meta">
            <strong>Medicine:</strong> ${appointment.medicine || 'Not assigned yet'}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger mb-0">Error loading appointment status: ${error.message}</div>
      </div>
    `;
  }
}

async function submitAppointment(event) {
  event.preventDefault();

  if (!selectedDoctor || !selectedSlot || !currentUser) {
    showAlert('Please select a doctor and a slot before booking.', 'warning');
    return;
  }

  showLoading();

  try {
    const patientName = document.getElementById('patientName').value.trim();
    const patientPhone = document.getElementById('patientPhone').value.trim();
    const reason = document.getElementById('reason').value.trim();
    const problem = document.getElementById('problem').value.trim();

    const response = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: selectedDoctor.id,
        patientEmail: currentUser.email,
        patientName,
        patientPhone,
        date: selectedSlot.date,
        time: selectedSlot.time,
        reason,
        problem
      })
    });

    const result = await response.json();

    if (!response.ok) {
      showAlert(`Error: ${result.message}`, 'danger');
      return;
    }

    showAlert('Appointment booked successfully. You can track its status in the section below.', 'success');
    currentUser = { ...currentUser, name: patientName, phone: patientPhone };
    document.getElementById('bookAppointmentForm').reset();
    document.getElementById('patientEmail').value = currentUser.email;
    document.getElementById('patientName').value = currentUser.name || '';
    document.getElementById('patientPhone').value = currentUser.phone || '';
    resetBookingSelection();
    await loadDoctors();
    await loadMyAppointments();
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'danger');
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showLoading();

  try {
    const session = await loadSession();
    if (!session) {
      return;
    }

    await Promise.all([loadDoctors(), loadMyAppointments()]);

    document.getElementById('bookAppointmentForm').addEventListener('submit', submitAppointment);
    document.getElementById('logoutButton').addEventListener('click', logout);
    document.getElementById('refreshStatuses').addEventListener('click', loadMyAppointments);

    document.getElementById('doctorsList').addEventListener('click', async (event) => {
      const card = event.target.closest('.doctor-card');
      if (!card) {
        return;
      }

      document.querySelectorAll('.doctor-card').forEach((item) => item.classList.remove('selected'));
      card.classList.add('selected');

      selectedDoctor = {
        id: card.dataset.id,
        name: card.dataset.name,
        specialty: card.dataset.specialty
      };

      selectedSlot = null;
      document.getElementById('selectedSlot').style.display = 'none';
      document.getElementById('bookBtn').disabled = true;
      await loadSlots(selectedDoctor.id);
    });

    document.getElementById('slotsList').addEventListener('click', (event) => {
      const button = event.target.closest('.slot-btn');
      if (!button) {
        return;
      }

      document.querySelectorAll('.slot-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');

      selectedSlot = {
        date: button.dataset.date,
        time: button.dataset.time
      };

      updateSelectedAppointment();
    });
  } finally {
    hideLoading();
  }
});
