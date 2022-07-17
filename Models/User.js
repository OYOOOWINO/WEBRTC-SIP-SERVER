const mongoose = require("mongoose")
const { Schema } = mongoose
const uuid = require("uuid")
const crypto = require('crypto')

const User = new Schema({
    username: {
        type: String,
        required: true,
        unique: false,
        min: 2
    },
    email: {
        type: String,
        required: true,
        unique: true,
        min: 4
    },
    password: {
        type: String,
        required: true,
        min: 6
    },
    profilePic: {
        type: String,
        default: ""
    },
    confirmed: {
        type: Boolean,
        required: true,
        default: false
    },
    token: {
        type: String,
        required: true,
        default: uuid.v1
    },

    confirmationCode: {
        type: String,
        expires: 600,
        default: uuid.v1
    },
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    contacts: {
        type: Array,
        required: false
    }
}, { timestamps: true })
User.methods.generatePasswordReset = function() {
    this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};

module.exports = mongoose.model('User', User)
