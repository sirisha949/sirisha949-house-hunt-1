const express = require('express');
const router = express.Router();
const HouseModel = require('../models/house');

router.get('/owner-houses', async (req, res) => {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const houses = await HouseModel.find({ owner: ownerId });
    res.json(houses);
  } catch (err) {
    console.error('Error fetching owner\'s houses:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
