const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Setup Middleware
app.use(cors()); 
app.use(express.json());

// 2. Connect to Supabase
// These must be set in your Render Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 3. Health Check for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Awake');
});

// 4. API: Get messages (Now includes logic to show who sent what)
app.get('/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Fetch Error:", error);
    return res.status(400).json(error);
  }
  res.json(data);
});

/**
 * 5. API: Send a message
 * We expect the frontend to send the user's email 
 * after they successfully log in via Supabase Auth.
 */
app.post('/messages', async (req, res) => {
  const { username, content, avatar_url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([
      { 
        username: username || 'Guest', 
        content: content,
        avatar_url: avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png' 
      }
    ]);

  if (error) {
    console.error("Insert Error:", error);
    return res.status(400).json(error);
  }

  res.json({ status: 'Message Sent!', data });
});

// 6. Start the Server
app.listen(PORT, () => {
  console.log(`Discord API running on port ${PORT}`);
});
