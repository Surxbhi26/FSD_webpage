document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  
  // Navigation Info
  const navUserInfo = document.getElementById('nav-user-info');
  const navUsername = document.getElementById('nav-username');
  const navRoleBadge = document.getElementById('nav-role-badge');
  const btnLogout = document.getElementById('btn-logout');

  // Form Tabs
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginContainer = document.getElementById('login-container');
  const registerContainer = document.getElementById('register-container');

  // Forms
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  // Password visibility Toggles
  const toggleLoginPass = document.getElementById('toggle-login-pass');
  const toggleRegisterPass = document.getElementById('toggle-register-pass');
  const loginPassInput = document.getElementById('login-password');
  const registerPassInput = document.getElementById('register-password');

  // Sidebar navigation
  const navItems = document.querySelectorAll('.nav-item');
  const sidebarNavModerator = document.getElementById('sidebar-nav-moderator');
  const sidebarNavAdmin = document.getElementById('sidebar-nav-admin');
  const navBadgeMod = document.getElementById('nav-badge-mod');
  const navBadgeAdmin = document.getElementById('nav-badge-admin');

  // Dynamic portal content elements
  const portalActiveView = document.getElementById('portal-active-view');
  const accessDeniedView = document.getElementById('access-denied-view');
  const portalTitle = document.getElementById('portal-title');
  const portalSubtitle = document.getElementById('portal-subtitle');
  const portalIcon = document.getElementById('portal-icon');
  const portalDescription = document.getElementById('portal-description');
  const portalStatusText = document.getElementById('portal-status-text');

  // Access Denied components
  const deniedRequiredRoles = document.getElementById('denied-required-roles');
  const deniedUserRole = document.getElementById('denied-user-role');
  const accessDeniedMessage = document.getElementById('access-denied-message');

  // Inner Views
  const viewUserDetails = document.getElementById('view-user-details');
  const viewModeratorDetails = document.getElementById('view-moderator-details');
  const viewAdminDetails = document.getElementById('view-admin-details');

  // Dynamic content containers
  const userActionsContainer = document.getElementById('user-actions');
  const adminUsersTableBody = document.getElementById('admin-users-table-body');
  const adminDbStatus = document.getElementById('admin-db-status');
  const adminUptime = document.getElementById('admin-uptime');

  // --- State Variables ---
  let currentUser = null;
  let activePortal = 'user';
  let uptimeInterval = null;

  // --- Initial Session Verification ---
  checkSession();

  // --- Event Listeners ---

  // Form Tab Switching
  tabLogin.addEventListener('click', () => switchAuthTab('login'));
  tabRegister.addEventListener('click', () => switchAuthTab('register'));

  // Password Visibility Toggle
  setupPasswordToggle(toggleLoginPass, loginPassInput);
  setupPasswordToggle(toggleRegisterPass, registerPassInput);

  // Form Submissions
  formLogin.addEventListener('submit', handleLogin);
  formRegister.addEventListener('submit', handleRegister);

  // Logout Button
  btnLogout.addEventListener('click', handleLogout);

  // Sidebar Portals Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetPortal = item.getAttribute('data-portal');
      if (targetPortal) {
        switchPortal(targetPortal);
      }
    });
  });

  // --- Helper Functions ---

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Trigger transition Reflow
    setTimeout(() => toast.classList.add('show'), 50);

    // Auto remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Switch between Sign In and Sign Up tabs
  function switchAuthTab(tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginContainer.classList.remove('hidden');
      registerContainer.classList.add('hidden');
      formRegister.reset();
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerContainer.classList.remove('hidden');
      loginContainer.classList.add('hidden');
      formLogin.reset();
    }
  }

  // Setup Password Visibility Toggle
  function setupPasswordToggle(toggleEl, inputEl) {
    toggleEl.addEventListener('click', () => {
      if (inputEl.type === 'password') {
        inputEl.type = 'text';
        toggleEl.classList.replace('fa-eye-slash', 'fa-eye');
      } else {
        inputEl.type = 'password';
        toggleEl.classList.replace('fa-eye', 'fa-eye-slash');
      }
    });
  }

  // Session Checker (Runs on load)
  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        setupUIForAuthenticatedUser();
      } else {
        // Not authenticated
        setupUIForGuest();
      }
    } catch (err) {
      console.error('Session check failure:', err);
      setupUIForGuest();
    }
  }

  // Setup UI to state: Logged In
  function setupUIForAuthenticatedUser() {
    if (!currentUser) return;

    // Show navbar credentials
    navUsername.textContent = currentUser.username;
    navRoleBadge.textContent = currentUser.role;
    navRoleBadge.className = `role-badge role-${currentUser.role.toLowerCase()}`;
    navUserInfo.classList.remove('hidden');

    // Configure sidebar locks based on roles
    const role = currentUser.role.toLowerCase();
    
    // Moderator sidebar lock
    if (role === 'moderator' || role === 'admin') {
      navBadgeMod.className = 'nav-badge badge-blue';
      navBadgeMod.innerHTML = 'Secure';
    } else {
      navBadgeMod.className = 'nav-badge badge-blue';
      navBadgeMod.innerHTML = '<i class="fa-solid fa-lock"></i>';
    }

    // Admin sidebar lock
    if (role === 'admin') {
      navBadgeAdmin.className = 'nav-badge badge-red';
      navBadgeAdmin.innerHTML = 'Secure';
    } else {
      navBadgeAdmin.className = 'nav-badge badge-red';
      navBadgeAdmin.innerHTML = '<i class="fa-solid fa-lock"></i>';
    }

    // Swap Views
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    // Select default portal
    switchPortal('user');
  }

  // Setup UI to state: Logged Out
  function setupUIForGuest() {
    currentUser = null;
    navUserInfo.classList.add('hidden');
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    
    // Clear forms
    formLogin.reset();
    formRegister.reset();
    switchAuthTab('login');
    
    // Reset active portal classes
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('[data-portal="user"]').classList.add('active');
    
    if (uptimeInterval) {
      clearInterval(uptimeInterval);
      uptimeInterval = null;
    }
  }

  // Handle Login submission
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = loginPassInput.value;

    if (!username || !password) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        currentUser = data.user;
        setupUIForAuthenticatedUser();
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Network error during login', 'error');
      console.error(err);
    }
  }

  // Handle Registration submission
  async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = registerPassInput.value;
    const roleEl = document.querySelector('input[name="role"]:checked');
    const role = roleEl ? roleEl.value : 'user';

    if (!username || !password) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Registration successful! Please Sign In.', 'success');
        switchAuthTab('login');
        // Pre-fill the login username
        document.getElementById('login-username').value = username;
        loginPassInput.focus();
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Network error during registration', 'error');
      console.error(err);
    }
  }

  // Handle Logout
  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        showToast('Successfully logged out', 'success');
        setupUIForGuest();
      } else {
        showToast('Logout request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      // Hard logout client side just in case
      setupUIForGuest();
    }
  }

  // Switch Portal views in Dashboard
  async function switchPortal(portalName) {
    activePortal = portalName;

    // Reset navigation active status
    navItems.forEach(item => {
      if (item.getAttribute('data-portal') === portalName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Clear uptime tick if running
    if (uptimeInterval) {
      clearInterval(uptimeInterval);
      uptimeInterval = null;
    }

    // Configure Portal Header UI state
    let headerIconClass = 'fa-circle-nodes';
    let subTitle = 'Global user area & resource board';
    let requiredRoles = ['user', 'moderator', 'admin'];

    if (portalName === 'moderator') {
      headerIconClass = 'fa-shield';
      subTitle = 'Review pending alerts and workspace moderation';
      requiredRoles = ['moderator', 'admin'];
    } else if (portalName === 'admin') {
      headerIconClass = 'fa-terminal';
      subTitle = 'Core system parameters & database logs';
      requiredRoles = ['admin'];
    }

    portalTitle.textContent = `${portalName.charAt(0).toUpperCase() + portalName.slice(1)} Portal`;
    portalSubtitle.textContent = subTitle;
    portalIcon.innerHTML = `<i class="fa-solid ${headerIconClass}"></i>`;
    portalStatusText.textContent = `Accessing: ${portalName.toUpperCase()}`;

    // Hide all internal portal detail views initially
    viewUserDetails.classList.add('hidden');
    viewModeratorDetails.classList.add('hidden');
    viewAdminDetails.classList.add('hidden');

    try {
      // Make Server request to fetch portal specific data
      const res = await fetch(`/api/dashboard/${portalName}`);
      
      if (res.status === 200) {
        // Access Granted!
        const data = await res.json();
        
        accessDeniedView.classList.add('hidden');
        portalActiveView.classList.remove('hidden');
        
        portalDescription.textContent = data.content;

        // Render specific views
        if (portalName === 'user') {
          viewUserDetails.classList.remove('hidden');
          renderUserPortal(data);
        } else if (portalName === 'moderator') {
          viewModeratorDetails.classList.remove('hidden');
        } else if (portalName === 'admin') {
          viewAdminDetails.classList.remove('hidden');
          renderAdminPortal(data);
        }

      } else if (res.status === 403) {
        // Access Forbidden! (RBAC in action)
        portalActiveView.classList.add('hidden');
        accessDeniedView.classList.remove('hidden');
        
        deniedRequiredRoles.textContent = requiredRoles.join(', ');
        deniedUserRole.textContent = currentUser.role;
        accessDeniedMessage.textContent = `The portal '${portalName}' is restricted. Your profile has role level '${currentUser.role}', which does not possess sufficient clearance permissions.`;
        
        showToast('Access Denied: Insufficient authorization level', 'error');

      } else if (res.status === 401) {
        // Session expired / invalid
        showToast('Session expired. Please log in again.', 'error');
        setupUIForGuest();
      }

    } catch (err) {
      showToast('Failed to fetch portal resource data', 'error');
      console.error(err);
    }
  }

  // User portal specific renderer
  function renderUserPortal(data) {
    userActionsContainer.innerHTML = '';
    data.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'btn-action';
      btn.innerHTML = `${action.name}`;
      btn.addEventListener('click', () => {
        showToast(`Triggered: ${action.name} (Simulation)`, 'success');
      });
      userActionsContainer.appendChild(btn);
    });
  }

  // Admin portal specific renderer
  function renderAdminPortal(data) {
    adminDbStatus.textContent = data.systemStatus.dbStatus;
    adminDbStatus.className = 'stat-value text-glow-green';
    
    // Server Uptime Counter tick
    let serverUptime = Math.floor(data.systemStatus.uptime);
    updateUptimeString(serverUptime);

    uptimeInterval = setInterval(() => {
      serverUptime += 1;
      updateUptimeString(serverUptime);
    }, 1000);

    // Populate Users Database Table
    adminUsersTableBody.innerHTML = '';
    
    if (data.users && data.users.length > 0) {
      data.users.forEach(user => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(user.createdAt).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short'
        });

        let badgeClass = 'role-user';
        if (user.role === 'admin') badgeClass = 'role-admin';
        if (user.role === 'moderator') badgeClass = 'role-moderator';

        tr.innerHTML = `
          <td>#${user.id}</td>
          <td><strong>${escapeHTML(user.username)}</strong></td>
          <td><span class="role-badge ${badgeClass}">${user.role}</span></td>
          <td>${formattedDate}</td>
        `;
        adminUsersTableBody.appendChild(tr);
      });
    } else {
      adminUsersTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    }
  }

  // Format and update uptime display
  function updateUptimeString(sec) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    
    let str = '';
    if (hours > 0) str += `${hours}h `;
    if (minutes > 0 || hours > 0) str += `${minutes}m `;
    str += `${seconds}s`;
    
    adminUptime.textContent = str;
  }

  // Prevent simple XSS vectors
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

});
