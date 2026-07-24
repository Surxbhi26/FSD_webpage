const BASE_URL = 'http://localhost:3005';

// Helper to store cookies
let authCookie = null;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Attach cookie if we have one
  if (authCookie) {
    options.headers = {
      ...options.headers,
      'Cookie': authCookie
    };
  }

  const response = await fetch(url, options);
  
  // Extract and save set-cookie header if present
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    if (setCookie.includes('token=;') || setCookie.includes('Expires=Thu, 01 Jan 1970')) {
      authCookie = null;
    } else {
      const match = setCookie.match(/token=[^;]+/);
      if (match) {
        authCookie = match[0];
      }
    }
  }

  // Parse response body
  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    body,
    ok: response.ok
  };
}

async function runTests() {
  console.log('==================================================');
  console.log('  STARTING ROLE-BASED AUTH API INTEGRATION TESTS');
  console.log('==================================================\n');

  try {
    // Clear user DB initially by deleting the JSON database to ensure clean test runs
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf-8');
      console.log('✔ Cleaned user database file.');
    }

    // 1. REGISTER USERS
    console.log('\n--- Test 1: User Registration ---');
    
    // Register Standard User
    const regUser = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice_user', password: 'password123', role: 'user' })
    });
    assert(regUser.status === 201, `User registration failed: ${JSON.stringify(regUser.body)}`);
    console.log('✔ Registered standard user: alice_user (Role: user)');

    // Register Moderator User
    const regMod = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bob_mod', password: 'password123', role: 'moderator' })
    });
    assert(regMod.status === 201, `Mod registration failed: ${JSON.stringify(regMod.body)}`);
    console.log('✔ Registered moderator: bob_mod (Role: moderator)');

    // Register Admin User
    const regAdmin = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'clara_admin', password: 'password123', role: 'admin' })
    });
    assert(regAdmin.status === 201, `Admin registration failed: ${JSON.stringify(regAdmin.body)}`);
    console.log('✔ Registered admin: clara_admin (Role: admin)');

    // Register invalid role
    const regInvalid = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'danger_guy', password: 'password123', role: 'superuser' })
    });
    assert(regInvalid.status === 400, 'Server accepted invalid role!');
    console.log('✔ Correctly rejected registration of invalid role: "superuser"');


    // 2. TEST AUTHENTICATION & ACCESS AS STANDARD USER (alice_user)
    console.log('\n--- Test 2: Standard User Session & Access Control ---');
    authCookie = null; // Clear cookie

    // Login
    const loginUser = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice_user', password: 'password123' })
    });
    assert(loginUser.status === 200, `Login failed: ${JSON.stringify(loginUser.body)}`);
    assert(authCookie !== null, 'Login did not return authorization cookie!');
    console.log('✔ Logged in as: alice_user');

    // Verify session
    const meUser = await request('/api/auth/me');
    assert(meUser.status === 200 && meUser.body.user.username === 'alice_user', 'Session verify failed');
    console.log('✔ Session verified: current identity is alice_user');

    // Access User Dashboard
    const userDashUser = await request('/api/dashboard/user');
    assert(userDashUser.status === 200, `User portal access failed: ${userDashUser.status}`);
    console.log('✔ Access Granted: alice_user -> User Dashboard (200 OK)');

    // Access Moderator Dashboard (Should be 403 Forbidden)
    const modDashUser = await request('/api/dashboard/moderator');
    assert(modDashUser.status === 403, `Access control failed! User accessed Moderator portal: ${modDashUser.status}`);
    console.log('✔ Access Denied (Correct): alice_user -> Moderator Dashboard (403 Forbidden)');

    // Access Admin Dashboard (Should be 403 Forbidden)
    const adminDashUser = await request('/api/dashboard/admin');
    assert(adminDashUser.status === 403, `Access control failed! User accessed Admin portal: ${adminDashUser.status}`);
    console.log('✔ Access Denied (Correct): alice_user -> Admin Dashboard (403 Forbidden)');


    // 3. TEST ACCESS AS MODERATOR (bob_mod)
    console.log('\n--- Test 3: Moderator Session & Access Control ---');
    authCookie = null; // Clear cookie

    // Login
    const loginMod = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bob_mod', password: 'password123' })
    });
    assert(loginMod.status === 200, `Login failed: ${JSON.stringify(loginMod.body)}`);
    console.log('✔ Logged in as: bob_mod');

    // Access User Dashboard
    const userDashMod = await request('/api/dashboard/user');
    assert(userDashMod.status === 200, `User portal access failed: ${userDashMod.status}`);
    console.log('✔ Access Granted: bob_mod -> User Dashboard (200 OK)');

    // Access Moderator Dashboard
    const modDashMod = await request('/api/dashboard/moderator');
    assert(modDashMod.status === 200, `Moderator portal access failed: ${modDashMod.status}`);
    console.log('✔ Access Granted: bob_mod -> Moderator Dashboard (200 OK)');

    // Access Admin Dashboard (Should be 403 Forbidden)
    const adminDashMod = await request('/api/dashboard/admin');
    assert(adminDashMod.status === 403, `Access control failed! Mod accessed Admin portal: ${adminDashMod.status}`);
    console.log('✔ Access Denied (Correct): bob_mod -> Admin Dashboard (403 Forbidden)');


    // 4. TEST ACCESS AS ADMIN (clara_admin)
    console.log('\n--- Test 4: Admin Session & Access Control ---');
    authCookie = null; // Clear cookie

    // Login
    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'clara_admin', password: 'password123' })
    });
    assert(loginAdmin.status === 200, `Login failed: ${JSON.stringify(loginAdmin.body)}`);
    console.log('✔ Logged in as: clara_admin');

    // Access User Dashboard
    const userDashAdmin = await request('/api/dashboard/user');
    assert(userDashAdmin.status === 200, `User portal access failed: ${userDashAdmin.status}`);
    console.log('✔ Access Granted: clara_admin -> User Dashboard (200 OK)');

    // Access Moderator Dashboard
    const modDashAdmin = await request('/api/dashboard/moderator');
    assert(modDashAdmin.status === 200, `Moderator portal access failed: ${modDashAdmin.status}`);
    console.log('✔ Access Granted: clara_admin -> Moderator Dashboard (200 OK)');

    // Access Admin Dashboard
    const adminDashAdmin = await request('/api/dashboard/admin');
    assert(adminDashAdmin.status === 200, `Admin portal access failed: ${adminDashAdmin.status}`);
    console.log('✔ Access Granted: clara_admin -> Admin Dashboard (200 OK)');
    
    // Check that admin is able to read registered user database details
    assert(Array.isArray(adminDashAdmin.body.users) && adminDashAdmin.body.users.length === 3, 'Admin dashboard did not return user database logs properly');
    console.log('✔ Admin correctly fetched User List. Found users count:', adminDashAdmin.body.users.length);


    // 5. TEST LOGOUT
    console.log('\n--- Test 5: Logout Flow ---');
    const logoutRes = await request('/api/auth/logout', { method: 'POST' });
    assert(logoutRes.status === 200, 'Logout request failed');
    console.log('✔ Sent logout request');

    // Check accessing dashboard after logout (Should be 401 Unauthorized)
    const userDashAfterLogout = await request('/api/dashboard/user');
    assert(userDashAfterLogout.status === 401, `Access control failed! Access was not blocked after logout: ${userDashAfterLogout.status}`);
    console.log('✔ Access Denied (Correct): Session cleared -> Dashboard Access Blocked (401 Unauthorized)');


    console.log('\n==================================================');
    console.log('  ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✔');
    console.log('==================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n✖ TEST SUITE FAILURE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

runTests();
