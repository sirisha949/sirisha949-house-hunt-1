const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    locationLink: { type: String },
    price: { type: Number, required: true },
    houseType: { type: String, required: true },
    phone: { 
        type: String, 
        required: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: { type: String, required: true }, // Added email field
    imagePath: String,
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }
});

const House = mongoose.model('House', houseSchema);

module.exports = House;



