const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Middleware
app.use(cors());
app.use(express.json());

// 2. Supabase Connection
// Ensure these are set in Render Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- SERVER ROUTES ---

// Get only servers the specific user has joined
app.get('/my-servers/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('server_members')
    .select('server_id, servers (*)')
    .eq('user_id', req.params.userId);

  if (error) return res.status(400).json(error);
  // Flatten the data to return an array of server objects
  const servers = data.map(item => item.servers);
  res.json(servers);
});

// Create a new server and automatically add the creator as a member
app.post('/servers', async (req, res) => {
  const { name, owner_id } = req.body;

  // 1. Insert the server
  const { data: serverData, error: serverError } = await supabase
    .from('servers')
    .insert([{ name, owner_id }])
    .select();

  if (serverError) return res.status(400).json(serverError);

  const newServer = serverData[0];

  // 2. Automatically add creator to server_members
  await supabase
    .from('server_members')
    .insert([{ server_id: newServer.id, user_id: owner_id }]);

  // 3. Automatically create a #general channel
  await supabase
    .from('channels')
    .insert([{ name: 'general', server_id: newServer.id }]);

  res.json(newServer);
});

// --- CHANNEL ROUTES ---

// Get all channels for a specific server
app.get('/channels/:serverId', async (req, res) => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('server_id', req.params.serverId);

  if (error) return res.status(400).json(error);
  res.json(data);
});

// Create a new channel
app.post('/channels', async (req, res) => {
  const { name, server_id } = req.body;
  const { data, error } = await supabase
    .from('channels')
    .insert([{ name, server_id }])
    .select();

  if (error) return res.status(400).json(error);
  res.json(data[0]);
});

// --- MESSAGE ROUTES ---

// Get messages for a specific channel
app.get('/messages/:channelId', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json(error);
  res.json(data);
});

// Post a message to a specific channel
app.post('/messages', async (req, res) => {
  const { username, content, channel_id, avatar_url } = req.body;
  const { data, error } = await supabase
    .from('messages')
    .insert([{ 
        username, 
        content, 
        channel_id, 
        avatar_url: avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png' 
    }]);

  if (error) return res.status(400).json(error);
  res.json({ status: 'sent', data });
});

// --- SYSTEM ROUTES ---

app.get('/ping', (req, res) => res.status(200).send('API Awake'));

app.listen(PORT, () => {
  console.log(`Full-Stack Discord API running on port ${PORT}`);
});
