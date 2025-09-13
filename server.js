const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static('uploads'));
app.use(express.static('public')); // Serve static files

mongoose.connect('mongodb://127.0.0.1:27017/hospitaldb')
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));

const PORT = 5000;
const JWT_SECRET = "your_jwt_secret_key";

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    role: String // 'doctor', 'nurse', 'patient', 'pharmacist'
});

const User = mongoose.model('User', userSchema);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'pending' } // pending, approved, denied, completed
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Record Schema
const recordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now },
    fileUrl: { type: String }  // URL/path of uploaded file
});

const Record = mongoose.model('Record', recordSchema);

// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send("Access denied. No token provided.");

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(400).send("Invalid token.");
    }
};

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register
app.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).send("All fields are required.");
        }

        if (!['doctor', 'patient', 'nurse', 'pharmacist'].includes(role)) {
            return res.status(400).send("Invalid role.");
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).send("Username already exists.");
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = new User({ username, password: hashedPassword, role });
        await user.save();

        res.status(201).send("User registered successfully.");
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).send("Server error during registration.");
    }
});

// Login
app.post('/login', async (req, res) => {
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

// Get user functionality based on role
app.get('/dashboard', authenticate, (req, res) => {
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

// Create an appointment (only patient)
app.post('/appointments', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'patient') return res.status(403).send("Only patients can create appointments.");

        const { doctorId, date, reason } = req.body;
        const appointment = new Appointment({
            patientId: req.user.id,
            doctorId,
            date,
            reason
        });

        await appointment.save();
        res.status(201).send("Appointment request submitted successfully. It will be reviewed by a nurse.");
    } catch (error) {
        console.error("Appointment creation error:", error);
        res.status(500).send("Server error during appointment creation.");
    }
});

// Get all appointments for the logged-in user
app.get('/appointments', authenticate, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'patient') {
            query = { patientId: req.user.id };
        } else if (req.user.role === 'doctor') {
            query = { doctorId: req.user.id };
        } else if (req.user.role === 'nurse') {
            // Nurses can see all appointments
            query = {};
        } else {
            return res.status(403).send("Access denied.");
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'username')
            .populate('doctorId', 'username');
        res.send(appointments);
    } catch (error) {
        console.error("Get appointments error:", error);
        res.status(500).send("Server error while fetching appointments.");
    }
});

// Update appointment status to approved (nurse only)
app.put('/appointments/:id/approve', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).send("Only nurses can approve appointments.");
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).send("Appointment not found.");
        }

        appointment.status = 'approved';
        await appointment.save();

        res.send("Appointment approved successfully.");
    } catch (error) {
        console.error("Approve appointment error:", error);
        res.status(500).send("Server error during appointment approval.");
    }
});

// Update appointment status to denied (nurse only)
app.put('/appointments/:id/deny', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).send("Only nurses can deny appointments.");
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).send("Appointment not found.");
        }

        appointment.status = 'denied';
        await appointment.save();

        res.send("Appointment denied successfully.");
    } catch (error) {
        console.error("Deny appointment error:", error);
        res.status(500).send("Server error during appointment denial.");
    }
});

// Update appointment status to completed (doctor only)
app.put('/appointments/:id/complete', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).send("Only doctors can complete appointments.");
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).send("Appointment not found.");
        }

        appointment.status = 'completed';
        await appointment.save();

        res.send("Appointment marked as completed.");
    } catch (error) {
        console.error("Complete appointment error:", error);
        res.status(500).send("Server error during appointment completion.");
    }
});

// Delete an appointment (only patient)
app.delete('/appointments/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'patient') return res.status(403).send("Only patients can delete appointments.");

        const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user.id });
        if (!appointment) return res.status(404).send("Appointment not found.");

        await Appointment.deleteOne({ _id: req.params.id });
        res.send("Appointment deleted.");
    } catch (error) {
        console.error("Delete appointment error:", error);
        res.status(500).send("Server error while deleting appointment.");
    }
});

// Set storage engine
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({ storage: storage });

// Upload record (doctor only)
app.post('/records', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).send("Only doctors can upload records.");
        }

        const { patientId, description, date } = req.body;

        const record = new Record({
            patientId,
            doctorId: req.user.id,
            description,
            date: date || Date.now(),
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null
        });

        await record.save();
        res.status(201).send("Record uploaded successfully.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error.");
    }
});

// View records
app.get('/records', authenticate, async (req, res) => {
    try {
        let records;
        if (req.user.role === 'doctor') {
            records = await Record.find({ doctorId: req.user.id })
                .populate('patientId', 'username')
                .populate('doctorId', 'username');
        } else if (req.user.role === 'patient') {
            records = await Record.find({ patientId: req.user.id })
                .populate('patientId', 'username')
                .populate('doctorId', 'username');
        } else {
            return res.status(403).send("Unauthorized access.");
        }

        res.json(records);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error.");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});