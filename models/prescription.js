const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medications: [{
        medicine: {
            type: String,
            required: true
        },
        dosage: {
            type: String,
            required: true
        },
        frequency: {
            type: String,
            required: true
        },
        duration: {
            type: String,
            required: true
        }
    }],
    instructions: {
        type: String,
        default: ''
    },
    datePrescribed: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    filledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    dateFilled: {
        type: Date
    }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);