const express = require('express');
const router = express.Router();
const Prescription = require('../models/prescription');
const { authenticate: auth } = require('../middleware/middleware');


// Create prescription (Doctor only)
router.post('/create', auth, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        const prescription = new Prescription({
            ...req.body,
            doctorId: req.user.id
        });

        await prescription.save();
        res.status(201).json(prescription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get prescriptions for patient
router.get('/patient/:patientId', auth, async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ patientId: req.params.patientId })
            .populate('doctorId', 'name specialty')
            .populate('filledBy', 'name')
            .sort({ datePrescribed: -1 });

        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get prescriptions by doctor
router.get('/doctor/my-prescriptions', auth, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const prescriptions = await Prescription.find({ doctorId: req.user.id })
            .populate('patientId', 'name email')
            .sort({ datePrescribed: -1 });

        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update prescription status (Pharmacist)
router.patch('/:id/fill', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist') {
            return res.status(403).json({ message: 'Access denied. Pharmacists only.' });
        }

        const prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            {
                status: 'completed',
                filledBy: req.user.id,
                dateFilled: new Date()
            },
            { new: true }
        );

        res.json(prescription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all prescriptions for pharmacist
router.get('/pharmacist/pending', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const prescriptions = await Prescription.find({ status: 'active' })
            .populate('patientId', 'name email')
            .populate('doctorId', 'name specialty')
            .sort({ datePrescribed: -1 });

        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;