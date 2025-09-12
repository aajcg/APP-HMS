const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    reason: String
});

module.exports = mongoose.model('Appointment', appointmentSchema);
