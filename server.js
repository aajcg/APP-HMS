const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes'); // New
const inventoryRoutes = require('./routes/inventoryRoutes'); // New


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

// Use routes
app.use('/auth', authRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/records', recordRoutes);
app.use('/prescriptions', prescriptionRoutes); // New
app.use('/inventory', inventoryRoutes); // New


// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});