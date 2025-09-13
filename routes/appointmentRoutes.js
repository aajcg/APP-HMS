const express = require('express');
const Appointment = require('../models/appointment');
const { authenticate } = require('../middleware/middleware');
const router = express.Router();

// Get all appointments for the logged-in user
router.get('/', authenticate, async (req, res) => {
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

// Create an appointment (only patient)
router.post('/', authenticate, async (req, res) => {
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

// Update appointment status to approved (nurse only)
router.put('/:id/approve', authenticate, async (req, res) => {
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
router.put('/:id/deny', authenticate, async (req, res) => {
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
router.put('/:id/complete', authenticate, async (req, res) => {
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
router.delete('/:id', authenticate, async (req, res) => {
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

router.post('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'patient') return res.status(403).send("Only patients can create appointments.");

        const { doctorId, date, reason } = req.body;
        
        // Add validation
        if (!doctorId || !date || !reason) {
            return res.status(400).send("Missing required fields: doctorId, date, or reason");
        }

        // Validate date format
        if (isNaN(new Date(date).getTime())) {
            return res.status(400).send("Invalid date format");
        }

        const appointment = new Appointment({
            patientId: req.user.id,
            doctorId,
            date: new Date(date),
            reason
        });

        await appointment.save();
        res.status(201).send("Appointment request submitted successfully. It will be reviewed by a nurse.");
    } catch (error) {
        console.error("Appointment creation error:", error);
        // More specific error message
        if (error.name === 'ValidationError') {
            return res.status(400).send(`Validation error: ${error.message}`);
        }
        if (error.name === 'CastError') {
            return res.status(400).send("Invalid doctorId format");
        }
        res.status(500).send("Server error during appointment creation.");
    }
});

module.exports = router;