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
    HR: { type: Number, required: true },
    pressure: { type: Number, required: true },
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
        const HR = 0;
        const pressure = 0;
        const newUser = new User({ name, email, password: hashedPassword, HR, pressure });
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

app.post('/updateHR', async (req, res) => {
    try {
        const { email, HR } = req.body;

        if (!email || HR === undefined) {
            return res.status(400).json({ message: 'Email and HR value are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.HR = HR;
        await user.save();

        res.status(200).json({ message: 'HR updated successfully', HR: user.HR });
    } catch (err) {
        res.status(500).json({ message: 'Error updating HR', error: err.message });
    }
});
app.post('/updatePressure', async (req, res) => {
    try {
        const { email, pressure } = req.body;
        console.log(email, pressure);
        if (!email || pressure === undefined) {
            return res.status(400).json({ message: 'Email and pressure value are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.pressure = pressure;
        await user.save();

        res.status(200).json({ message: 'Max contraction updated successfully', pressure: user.pressure });
    } catch (err) {
        res.status(500).json({ message: 'Error updating max contraction', error: err.message });
    }
});

// New ExerciseRecording Schema
const ExerciseRecordingSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    exerciseName: { type: String, required: true },
    channel: { type: String, required: true },
    // Array of objects, e.g. { time: <timestamp>, hr: <value> }
    hrDuringRecording: { type: Array, default: [] },
    // Array of objects, e.g. { time: <timestamp>, hr: <value> }
    hrPostRecording: { type: Array, default: [] },
    // Accelerometer data can be stored as an array (each entry structure based on your front-end format)
    accelerometerData: { type: Array, default: [] },
    recordedAt: { type: Date, default: Date.now }
});

const ExerciseRecording = mongoose.model('ExerciseRecording', ExerciseRecordingSchema);

// Express route to save recording data from the front end
app.post('/saveRecording', async (req, res) => {
    try {
        const {
            userEmail,
            exerciseName,
            channel,
            hrDuringRecording,
            hrPostRecording,
            accelerometerData
        } = req.body;

        // Validate required fields
        if (!userEmail || !exerciseName || !channel) {
            return res.status(400).json({
                message: 'Missing required fields: userEmail, exerciseName, or channel.'
            });
        }

        const newRecording = new ExerciseRecording({
            userEmail,
            exerciseName,
            channel,
            hrDuringRecording,
            hrPostRecording,
            accelerometerData
        });

        await newRecording.save();
        res.status(201).json({ message: 'Recording saved successfully.' });
    } catch (err) {
        console.error('Error saving recording:', err);
        res.status(500).json({ message: 'Error saving recording', error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

