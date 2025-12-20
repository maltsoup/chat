const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- SERVER ROUTES ---

// 1. Get all servers
app.get('/servers', async (req, res) => {
  const { data, error } = await supabase.from('servers').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

// 2. Create a new server
app.post('/servers', async (req, res) => {
  const { name } = req.body; // owner_id is handled by auth.uid() in Supabase
  const { data, error } = await supabase.from('servers').insert([{ name }]).select();
  if (error) return res.status(400).json(error);
  res.json(data);
});

// --- MESSAGE ROUTES ---

// 3. Get messages (Updated to support server filtering later)
app.get('/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(400).json(error);
  res.json(data);
});

// 4. Send a message
app.post('/messages', async (req, res) => {
  const { username, content } = req.body;
  const { data, error } = await supabase
    .from('messages')
    .insert([{ username, content }]);
  if (error) return res.status(400).json(error);
  res.json(data);
});

// Health check for UptimeRobot
app.get('/ping', (req, res) => res.send('Awake'));

app.listen(process.env.PORT || 10000, () => {
  console.log("API is live and multi-server ready!");
});
