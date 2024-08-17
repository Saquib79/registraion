const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = "mongodb+srv://mdsaquibansari7979:saquib7979@registration-form-db.q8cry.mongodb.net/registration-form-db";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB Atlas');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Define Schema
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    mobile: Number,
    email: String,
    street: String,
    city: String,
    state: String,
    country: String,
    loginId: String,
    password: String,
});

// Define Model
const User = mongoose.model('User', userSchema);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', (userData) => {
        socket.join('live_users');
        socket.userData = userData;
        io.to('live_users').emit('userList', getActiveUsers());
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        io.to('live_users').emit('userList', getActiveUsers());
    });
});

function getActiveUsers() {
    const activeUsers = [];
    const sockets = io.sockets.adapter.rooms.get('live_users');
    if (sockets) {
        for (const socketId of sockets) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket.userData) {
                activeUsers.push({
                    email: socket.userData.email,
                    name: socket.userData.name,
                    socketId: socket.id
                });
            }
        }
    }
    return activeUsers;
}

// Route to serve the registration form
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    console.log('Serving index.html from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send(err);
        } else {
            console.log('File sent:', filePath);
        }
    });
});

// Route for form submission
app.post('/submit_registration', async (req, res) => {
    const newUser = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        mobile: req.body.mobile,
        email: req.body.email,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        loginId: req.body['login-id'],
        password: req.body.password,
    });

    console.log('Attempting to save new user:', newUser);

    try {
        await newUser.save();
        console.log('User registered successfully');
        
        // Emit event to join the user to the room
        io.emit('newUser', {
            email: newUser.email,
            name: `${newUser.firstName} ${newUser.lastName}`,
        });
        
        res.status(200).send('User registered successfully!');
    } catch (err) {
        console.error('Error registering new user:', err);
        res.status(500).send('Error registering new user.');
    }
});

// Route to get user details
app.get('/user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (user) {
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Error fetching user data');
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});