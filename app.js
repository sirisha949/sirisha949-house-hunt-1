const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const OwnerModel = require('./models/owner');
const RequestModel = require('./models/request'); 
const HouseModel = require('./models/houses'); // Import the HouseModel
const session = require('express-session');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/houserental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create an Express application
const app = express();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure sessions
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Serve houses.html
app.get('/houses', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'houses.html'));
});

// Handle POST request to /post-house
app.post('/post-house', upload.single('image'), async (req, res) => {
  const { title, description, location, locationLink, price, houseType, phone, email } = req.body;
  const imagePath = req.file ? req.file.filename : null;

  try {
    const ownerId = req.session.userId;
    const newHouse = new HouseModel({
      title,
      description,
      location,
      locationLink,
      price,
      houseType,
      phone,
      email,
      imagePath,
      ownerId
    });

    await newHouse.save();
    res.send('House posted successfully');
  } catch (err) {
    console.error('Error posting house:', err);
    res.status(500).send('Error posting house');
  }
});

// Handle GET request to fetch all houses data with filters
app.get('/api/houses', async (req, res) => {
  try {
    const { location, type, budget } = req.query;
    const query = {};

    if (location) query.location = new RegExp(location, 'i');
    if (type) query.houseType = type;
    if (budget) query.price = { $lte: Number(budget) };

    const houses = await HouseModel.find(query);
    res.json(houses);
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ error: err.message });
  }
});

// Handle POST request to /signup-owner
app.post('/signup-owner', async (req, res) => {
  const { fullname, email, username, password } = req.body;
  try {
    const existingUser = await OwnerModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).send('Username or email already exists');
    }

    const newOwner = new OwnerModel({ fullname, email, username, password });
    await newOwner.save();
    res.send('Owner registered successfully');
  } catch (err) {
    console.error('Error registering owner:', err);
    res.status(500).send('Error registering owner');
  }
});

// Handle POST request to /login-owner
app.post('/login-owner', async (req, res) => {
  const { username, password } = req.body;
  try {
    const owner = await OwnerModel.findOne({ username });
    if (!owner) {
      return res.status(401).send('Invalid username or password');
    }

    const isMatch = await owner.comparePassword(password);
    if (isMatch) {
      req.session.userId = owner._id;
      res.status(200).json({ message: 'Login successful', redirectUrl: '/display.html' });
    } else {
      res.status(401).send('Invalid username or password');
    }
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Error logging in');
  }
});

// Handle POST request to /request-house
app.post('/request-house', async (req, res) => {
  const { houseId, tenantName, tenantContact, contactMethod } = req.body;
  
  try {
    const house = await HouseModel.findById(houseId);
    if (!house) {
      return res.status(404).send('House not found');
    }

    const newRequest = new RequestModel({
      houseId,
      ownerId: house.ownerId,
      tenantName,
      tenantContact,
      contactMethod
    });

    await newRequest.save();
    res.send('Request submitted successfully');
  } catch (err) {
    console.error('Error submitting request:', err);
    res.status(500).send('Error submitting request');
  }
});

// Handle GET request to fetch requests for a specific owner
app.get('/api/owner-requests', async (req, res) => {
  const ownerId = req.session.userId;

  try {
    const requests = await RequestModel.find({ ownerId }).populate('houseId');
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve owner-requests.html
app.get('/owner-requests', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'requested.html'));
});

// Handle GET request to fetch houses for a specific owner
app.get('/api/owner-houses', async (req, res) => {
  const ownerId = req.session.userId;

  try {
    const houses = await HouseModel.find({ ownerId });
    res.json(houses);
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ error: err.message });
  }
});

// Handle DELETE request to delete a house
app.delete('/api/owner-houses/:id', async (req, res) => {
  const houseId = req.params.id;

  try {
    await HouseModel.findByIdAndDelete(houseId);
    res.status(200).send('House deleted successfully');
  } catch (err) {
    console.error('Error deleting house:', err);
    res.status(500).send('Error deleting house');
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});