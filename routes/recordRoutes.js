const express = require('express');
const multer = require('multer');
const path = require('path');
const Record = require('../models/record');
const { authenticate } = require('../middleware/middleware');
const router = express.Router();

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
router.post('/', authenticate, upload.single('file'), async (req, res) => {
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
router.get('/', authenticate, async (req, res) => {
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

module.exports = router;