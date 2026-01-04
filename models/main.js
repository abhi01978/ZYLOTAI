const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    ownerId: { type: String, default: 'admin' },
    businessName: String,
    address: String,
    contactNumber: String,
    services: String,
    customInstructions: String,
    properties: [{
        title: String,
        price: String,
        location: String,
        size: String,
        images: [String]  // Cloudinary URLs
    }]
});

module.exports = mongoose.model('Business', BusinessSchema);