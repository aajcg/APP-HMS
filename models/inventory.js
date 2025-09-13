const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    medicineName: {
        type: String,
        required: true,
        unique: true
    },
    genericName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true
    },
    pricePerUnit: {
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    reorderLevel: {
        type: Number,
        default: 10
    },
    batchNumber: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);