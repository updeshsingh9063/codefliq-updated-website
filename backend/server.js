require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const Contact = require('./models/Contact');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
let mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    // Remove deprecated options that cause crashes in newer MongoDB drivers
    mongoUri = mongoUri.replace(/useNewUrlParser=true&?/gi, '')
                       .replace(/useUnifiedTopology=true&?/gi, '')
                       .replace(/[?&]$/, ''); // Remove trailing ? or & if any
}

mongoose.connect(mongoUri).then(() => {
    console.log("Connected to MongoDB successfully!");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// Basic route for testing
app.get('/', (req, res) => {
    res.send("Codefliq Backend API is running.");
});

// POST /api/contacts - Save a new contact form submission
app.post('/api/contacts', async (req, res) => {
    try {
        const { name, email, phone, details, services } = req.body;
        
        // Basic validation
        if (!name || !email || !phone || !details) {
            return res.status(400).json({ error: 'Please provide all required fields.' });
        }

        const newContact = new Contact({
            name,
            email,
            phone,
            details,
            services
        });

        await newContact.save();
        res.status(201).json({ message: 'Contact saved successfully!' });
    } catch (error) {
        console.error("Error saving contact:", error);
        res.status(500).json({ error: 'Server error while saving contact.' });
    }
});

// POST /api/admin/login - Authenticate the admin
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;

    const ADMIN_EMAIL = 'updeshsingh9063@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Create token
        const token = jwt.sign(
            { email: ADMIN_EMAIL, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.json({ token, message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// GET /api/admin/contacts - Fetch all contacts (Protected)
app.get('/api/admin/contacts', authenticateJWT, async (req, res) => {
    try {
        // Sort by newest first
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ error: 'Server error while fetching contacts.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
