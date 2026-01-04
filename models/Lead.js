const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    ownerId: { type: String, required: true }, // Kis owner ka lead hai
    phoneNumber: String,
    name: String,
    businessName: String,
    query: String,
    status: { type: String, default: 'New' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);