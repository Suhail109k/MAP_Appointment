let selectedRole = 'user';
let authMode = 'login';

function showAlert(message, type = 'danger') {
  const resultsDiv = document.getElementById('results');
  resultsDiv.className = `results-box alert alert-${type}`;
  resultsDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
  resultsDiv.style.display = 'block';
}

async function readResponsePayload(response) {
  const text = await response.text();

  try {
    return { data: JSON.parse(text), rawText: text };
  } catch (_error) {
    return { data: null, rawText: text };
  }
}

function toggleVisibility(elementId, visible) {
  document.getElementById(elementId).classList.toggle('hidden', !visible);
}

function setAuthMode(mode) {
  authMode = mode;

  document.querySelectorAll('.auth-mode-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  const isRegister = mode === 'register' && selectedRole === 'user';
  toggleVisibility('nameGroup', isRegister);
  toggleVisibility('phoneGroup', isRegister);

  document.getElementById('name').required = isRegister;
  document.getElementById('phone').required = false;

  const title = document.querySelector('.login-panel h1');
  const subtitle = document.getElementById('authSubtitle');
  const submitButton = document.getElementById('signInButton');
  const form = document.getElementById('loginForm');

  if (mode === 'register' && selectedRole === 'user') {
    title.textContent = 'Create your patient account';
    subtitle.textContent = 'Register once, then come back anytime and sign in with the same email and password.';
    submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    form.action = '/api/register';
  } else {
    title.textContent = 'Sign in';
    subtitle.textContent = 'Choose your role, then continue with email and password.';
    submitButton.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Continue Securely';
    form.action = '/api/login';
  }
}

function setRole(role) {
  selectedRole = role;

  document.querySelectorAll('.role-option').forEach((button) => {
    button.classList.toggle('active', button.dataset.role === role);
  });

  document.querySelector('[data-mode="register"]').disabled = role === 'admin';
  if (role === 'admin' && authMode === 'register') {
    setAuthMode('login');
  } else {
    setAuthMode(authMode);
  }

  const hint = document.getElementById('roleHint');
  if (role === 'admin') {
    hint.innerHTML = 'Admin access uses the fixed hospital admin credentials and cannot be self-registered.';
  } else if (authMode === 'register') {
    hint.innerHTML = 'Your patient account details will be stored in the database so you can return and sign in again later.';
  } else {
    hint.innerHTML = 'Returning patients can sign in here. New patients can switch to Create Account first.';
  }
}

async function submitLogin(event) {
  event.preventDefault();

  const button = document.getElementById('signInButton');
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();

  button.disabled = true;
  button.innerHTML = authMode === 'register'
    ? '<i class="fas fa-spinner fa-spin"></i> Creating account...'
    : '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const endpoint = authMode === 'register' && selectedRole === 'user'
      ? '/api/register'
      : '/api/login';

    const payload = authMode === 'register' && selectedRole === 'user'
      ? { name, email, phone, password }
      : { role: selectedRole, email, password };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const { data: result, rawText } = await readResponsePayload(response);

    if (!response.ok) {
      showAlert(
        result?.message || `Unable to continue right now. Server response: ${rawText.slice(0, 120)}`,
        'danger'
      );
      return;
    }

    if (!result) {
      showAlert('The server returned an invalid response. Please restart the server and try again.', 'danger');
      return;
    }

    showAlert(
      authMode === 'register' && selectedRole === 'user'
        ? 'Account created successfully. Redirecting to your patient portal...'
        : 'Sign in successful. Redirecting...',
      'success'
    );
    window.location.href = result.redirectTo;
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'danger');
  } finally {
    button.disabled = false;
    setAuthMode(authMode);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', submitLogin);

  document.getElementById('roleOptions').addEventListener('click', (event) => {
    const button = event.target.closest('.role-option');
    if (!button) {
      return;
    }

    setRole(button.dataset.role);
  });

  document.getElementById('authModeSwitch').addEventListener('click', (event) => {
    const button = event.target.closest('.auth-mode-btn');
    if (!button || button.disabled) {
      return;
    }

    setAuthMode(button.dataset.mode);
    setRole(selectedRole);
  });

  setRole('user');
  setAuthMode('login');
});
