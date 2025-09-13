const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authenticate } = require('../middleware/middleware');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Register
// In your authRoutes.js file, update the register endpoint:
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, name, email, phone, address, specialty, licenseNumber } = req.body;

        // Check if all required fields are present
        if (!username || !password || !role || !email) {
            return res.status(400).json({ message: 'Username, password, role, and email are required.' });
        }

        // Validate role
        if (!['doctor', 'patient', 'nurse', 'pharmacist', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        // Check if user already exists by username or email
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this username or email.' });
        }

        // Handle conditional required fields
        if (role === 'doctor' && !specialty) {
            return res.status(400).json({ message: 'Specialty is required for doctors.' });
        }

        if ((role === 'doctor' || role === 'pharmacist') && !licenseNumber) {
            return res.status(400).json({ message: 'License number is required for this role.' });
        }

        // Create new user with default values for missing fields
        const userData = {
            username,
            password,
            role,
            email,
            name: name || username, // Use username as name if not provided
            phone: phone || '',
            address: address || '',
            specialty: specialty || '',
            licenseNumber: licenseNumber || ''
        };

        const user = new User(userData);
        await user.save();

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Registration error:', error);
        
        // More specific error messages
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors });
        }
        
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
        
        res.json({ token, role: user.role });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// Get user dashboard
router.get('/dashboard', authenticate, (req, res) => {
    const role = req.user.role;

    let functionalities = [];
    if (role === 'doctor') {
        functionalities = ["View Appointments", "View Patient History", "Upload Medical Records"];
    } else if (role === 'nurse') {
        functionalities = ["Approve Appointments", "Assist in Care", "View Patient Reports"];
    } else if (role === 'patient') {
        functionalities = ["Book Appointment", "View Medical History", "View Appointments"];
    } else if (role === 'pharmacist') {
        functionalities = ["Manage Medicine Inventory", "Process Prescriptions"];
    }

    res.send({
        role,
        functionalities
    });
});

// Add this route to get all doctors
router.get('/doctors', authenticate, async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' });
        res.send(doctors);
    } catch (error) {
        console.error("Get doctors error:", error);
        res.status(500).send("Server error while fetching doctors.");
    }
});

// Register pharmacist - FIXED: Added the missing handler function
router.post('/register/pharmacist', async (req, res) => {
    try {
        const { name, email, password, phone, address, licenseNumber } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({
            name,
            email,
            password,
            role: 'pharmacist',
            phone,
            address,
            licenseNumber
        });

        await user.save();
        
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;