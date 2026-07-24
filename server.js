require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('./database');
const { authenticateToken, authorizeRoles } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fsd_role_based_auth_secret_key_987654321';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTHENTICATION ROUTES ---

// Registration Route
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Validate username length and characters
  if (username.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // Validate role
  const normalizedRole = (role || 'user').toLowerCase();
  const validRoles = ['user', 'moderator', 'admin'];
  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role selection' });
  }

  try {
    // Check if user already exists
    const existingUser = Database.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to Database
    const newUser = Database.createUser(username, hashedPassword, normalizedRole);

    return res.status(201).json({
      message: 'Registration successful',
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Find user
    const user = Database.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in production over HTTPS
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

// Verify session route
app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

// --- PROTECTED ROLE DASHBOARD ROUTES ---

// User Dashboard Data (Accessible to User, Moderator, Admin)
app.get('/api/dashboard/user', authenticateToken, authorizeRoles('user', 'moderator', 'admin'), (req, res) => {
  res.json({
    role: req.user.role,
    title: 'User Portal',
    content: 'Welcome to the general User Area. Here you can update your settings, view public announcements, and interact with basic workspace resources.',
    actions: [
      { id: 'view_profile', name: 'Edit Profile Settings' },
      { id: 'view_tasks', name: 'My Tasks List' }
    ]
  });
});

// Moderator Dashboard Data (Accessible to Moderator, Admin)
app.get('/api/dashboard/moderator', authenticateToken, authorizeRoles('moderator', 'admin'), (req, res) => {
  res.json({
    role: req.user.role,
    title: 'Moderator Dashboard',
    content: 'Welcome to the Moderator Control Panel. You have access to content moderation, report queues, and community oversight tools.',
    actions: [
      { id: 'flagged_posts', name: 'Review Flagged Content (3 items pending)' },
      { id: 'user_warnings', name: 'Issue User Warning' }
    ]
  });
});

// Admin Dashboard Data (Accessible ONLY to Admin)
app.get('/api/dashboard/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  // Let's load the user list to show inside Admin Dashboard (without passwords)
  const fs = require('fs');
  let usersList = [];
  try {
    const rawData = fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf-8');
    usersList = JSON.parse(rawData).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));
  } catch (err) {
    console.error(err);
  }

  res.json({
    role: req.user.role,
    title: 'Admin Control Center',
    content: 'CRITICAL ACCESS ONLY: Full administrative access. You can oversee system operations, view audit logs, and manage user accounts.',
    users: usersList,
    systemStatus: {
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
      dbStatus: 'Online'
    }
  });
});

// For any client-side routes, serve index.html (fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Role-Based Auth System listening on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
