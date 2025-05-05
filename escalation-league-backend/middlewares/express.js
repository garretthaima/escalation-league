const express = require('express');
const path = require('path');

const app = express();

// Serve static files from the WSL home directory
const profilePicturesPath = path.join('/home', process.env.USER, 'images/profile-pictures');
app.use('/images/profile-pictures', express.static(profilePicturesPath));

// Example route to test the server
app.get('/', (req, res) => {
    res.send('Static file server is running!');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Serving profile pictures from ${profilePicturesPath}`);
});