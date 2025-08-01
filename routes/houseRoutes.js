// Handle GET request to fetch all houses
// routes/houseRoutes.js

const express = require('express');
const router = express.Router();
const House = require('../models/house');

// Handle GET request to fetch all houses
router.get('/houses', async (req, res) => {
    try {
        const houses = await House.find();
        res.json(houses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

