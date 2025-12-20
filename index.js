const express = require('express');
const app = express();

// Render uses a dynamic port, so this is required
const PORT = process.env.PORT || 10000; 

app.use(express.json());

// Main route
app.get('/', (req, res) => {
  res.send('Discord Clone API is Online!');
});

// Health check for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Awake');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
