const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const OwnerModel = require('./models/owner');
const HouseModel = require('./models/houses'); 
const RequestModel = require('./models/request');
const session = require('express-session');
const crypto = require('crypto');
const { exec } = require('child_process');


mongoose.connect('mongodb://localhost:27017/houserental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


const app = express();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));


app.get('/houses', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'houses.html'));
});


app.post('/post-house', upload.single('image'), async (req, res) => {
  const { title, description, location, locationLink, price, houseType, phone, email } = req.body;
  const imagePath = req.file.filename;

  try {
    const ownerId = req.session.userId;
    const newHouse = new HouseModel({ title, description, location, locationLink, price, houseType, phone, email, imagePath, ownerId });
    await newHouse.save();
    res.send('House posted successfully');
  } catch (err) {
    console.error('Error posting house:', err);
    res.status(500).send('Error posting house');
  }
});


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


app.get('/api/owner-requests', async (req, res) => {
  const ownerId = req.session.userId;
  try {
    const requests = await RequestModel.find({ ownerId }).populate('houseId');
    console.log('Fetched requests:', requests); // Log to debug
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: err.message });
  }
});




app.get('/owner-requests', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'requested.html'));
});


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


app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const owner = await OwnerModel.findOne({ email });
        if (!owner) {
            return res.status(404).json({ message: 'Email not found' });
        }

        
        const resetToken = crypto.randomBytes(32).toString('hex');
        owner.resetToken = resetToken;
        owner.resetTokenExpiry = Date.now() + 3600000; 
        await owner.save();

        
        res.json({ success: true, token: resetToken });
    } catch (err) {
        console.error('Error generating reset token:', err);
        res.status(500).json({ message: 'Error generating reset token' });
    }
});


app.post('/reset-password', async (req, res) => {
  const { newPassword, token } = req.body;
  try {
      const owner = await OwnerModel.findOne({
          resetToken: token,
          resetTokenExpiry: { $gt: Date.now() }
      });

      if (!owner) {
          return res.status(400).json({ message: 'Invalid or expired token' });
      }

      owner.password = newPassword;
      owner.resetToken = undefined;
      owner.resetTokenExpiry = undefined;
      await owner.save();

      res.json({ message: 'Password reset successful', success: true });
  } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).json({ message: 'Error resetting password' });
  }
});


app.delete('/api/owner-houses/:id', async (req, res) => {
  const houseId = req.params.id;
  try {
    await HouseModel.findByIdAndDelete(houseId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting house:', err);
    res.status(500).json({ error: 'Error deleting house' });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  exec(`start http://localhost:${PORT}/p.html`);
});

