const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');


const app = express();
const port = 3000;
const JWT_SECRET = 'key'; // Use a secure secret in production!

app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = "mongodb+srv://ahamedsamirsarker:Itsameass18022003vidhlo@cluster0.qommg.mongodb.net/ScentAndPA?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
    id: { type: String, default: require('uuid').v4 },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed passwords
});

const User = mongoose.model('User', UserSchema);


// Exercise Schema
const ExerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },

});

const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Add New Exercise
app.post('/newExercise', async (req, res) => {
    try {
        const { name } = req.body;
        const existingExercise = await Exercise.findOne({ name });
        if (existingExercise) {
            return res.status(400).json({ message: 'Exercise already exists' });
        }
        const newExercise = new Exercise({ name });
        await newExercise.save();
        res.status(201).json({ message: 'Exercise added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding exercise', error: err });
    }
});
app.get('/getExercises', async (req, res) => {
    try {
        const exercises = await Exercise.find({}, 'name'); // Fetch only the 'name' field
        res.status(200).json(exercises); // Respond with an array of exercise objects
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving exercises', error: err.message });
    }
});


// Register User
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err });
    }
});

// Login User
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err });
    }
});

// Protected Route Example
app.get('/protected', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ message: 'Access granted', user: decoded });
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

