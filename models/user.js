const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'nurse', 'pharmacist', 'admin'],
        required: true
    },
    dateOfBirth: {
        type: Date
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    specialty: {
        type: String,
        required: function() {
            return this.role === 'doctor';
        }
    },
    licenseNumber: {
        type: String,
        required: function() {
            return this.role === 'doctor' || this.role === 'pharmacist';
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);