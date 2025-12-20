const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Setup Middleware
app.use(cors()); // This fixes the 404/CORS error
app.use(express.json());

// 2. Connect to Supabase using Render Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 3. Keep-Alive Route for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Awake');
});

// 4. Default Route
app.get('/', (req, res) => {
  res.send('Discord Clone API is Online!');
});

// 5. API: Get all messages
app.get('/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json(error);
  res.json(data);
});

// 6. API: Send a new message
app.post('/messages', async (req, res) => {
  const { username, content } = req.body;
  
  const { data, error } = await supabase
    .from('messages')
    .insert([{ username, content }]);

  if (error) {
    console.error("Supabase Error:", error);
    return res.status(400).json(error);
  }
  res.json({ status: 'Message Sent!', data });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
