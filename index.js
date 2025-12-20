const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- AUTH & PROFILES ---
// Fetches or creates a user profile for custom usernames
app.get('/profile/:userId', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.userId).single();
  
  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase.from('profiles')
      .insert([{ id: req.params.userId, username: 'User_' + Math.floor(Math.random()*1000) }])
      .select();
    return res.json(newUser[0]);
  }
  res.json(data);
});

app.post('/update-username', async (req, res) => {
  const { userId, username } = req.body;
  await supabase.from('profiles').update({ username }).eq('id', userId);
  res.json({ status: 'success' });
});

// --- SERVERS & CHANNELS ---
app.get('/my-servers/:userId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('servers(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(m => m.servers) : []);
});

app.post('/servers', async (req, res) => {
  const { name, owner_id } = req.body;
  const { data } = await supabase.from('servers').insert([{ name, owner_id }]).select();
  const server = data[0];
  // Auto-join and create #general
  await supabase.from('server_members').insert([{ server_id: server.id, user_id: owner_id }]);
  await supabase.from('channels').insert([{ name: 'general', server_id: server.id }]);
  res.json(server);
});

app.get('/channels/:serverId', async (req, res) => {
  const { data } = await supabase.from('channels').select('*').eq('server_id', req.params.serverId);
  res.json(data);
});

// --- MESSAGES (CHANNEL SPECIFIC) ---
app.get('/messages/:channelId', async (req, res) => {
  const { data } = await supabase.from('messages')
    .select('*')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: true }); // Messages show in order
  res.json(data);
});

app.post('/messages', async (req, res) => {
  const { username, content, channel_id } = req.body;
  await supabase.from('messages').insert([{ username, content, channel_id }]);
  res.json({ status: 'sent' });
});

app.get('/ping', (req, res) => res.send('Online'));
app.listen(PORT);
