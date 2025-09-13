const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now },
    fileUrl: { type: String }  // URL/path of uploaded file
});

module.exports = mongoose.model('Record', recordSchema);
