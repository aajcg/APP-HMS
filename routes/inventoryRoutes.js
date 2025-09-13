const express = require('express');
const router = express.Router();
const Inventory = require('../models/inventory');
const { authenticate: auth } = require('../middleware/middleware');


// Add medicine to inventory (Pharmacist/Admin only)
router.post('/add', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const medicine = new Inventory(req.body);
        await medicine.save();
        res.status(201).json(medicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all medicines
router.get('/', auth, async (req, res) => {
    try {
        const medicines = await Inventory.find({ isActive: true })
            .sort({ medicineName: 1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update medicine
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const medicine = await Inventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(medicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete medicine (soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const medicine = await Inventory.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get low stock medicines
router.get('/low-stock', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const lowStock = await Inventory.find({
            quantity: { $lte: 10 },
            isActive: true
        });
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search medicines
router.get('/search', auth, async (req, res) => {
    try {
        const { query } = req.query;
        const medicines = await Inventory.find({
            $or: [
                { medicineName: { $regex: query, $options: 'i' } },
                { genericName: { $regex: query, $options: 'i' } }
            ],
            isActive: true
        });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;