const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    role: String // 'doctor', 'nurse', 'patient', 'pharmacist'
});

module.exports = mongoose.model('User', userSchema);