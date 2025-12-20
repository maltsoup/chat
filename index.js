const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. PROFILES (Full Personalization) ---
app.get('/profile/:userId', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.userId).single();
  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase.from('profiles').insert([{ 
      id: req.params.userId, 
      username: 'User' + Math.floor(1000 + Math.random() * 9000),
      avatar_url: '',
      banner_url: '',
      status: 'online',
      status_text: '',
      custom_theme: 'linear-gradient(180deg, #5865f2 0%, #313338 100%)'
    }]).select();
    return res.json(newUser[0]);
  }
  res.json(data);
});

app.post('/update-profile', async (req, res) => {
  const { userId, username, avatar_url, banner_url, status, status_text, custom_theme } = req.body;
  await supabase.from('profiles').update({ username, avatar_url, banner_url, status, status_text, custom_theme }).eq('id', userId);
  res.json({ status: 'success' });
});

// --- 2. SERVERS & CHANNELS ---
app.post('/servers', async (req, res) => {
  const { name, owner_id } = req.body;
  const { data, error } = await supabase.from('servers').insert([{ name, owner_id }]).select();
  if (error) return res.status(400).json(error);
  const server = data[0];
  await supabase.from('server_members').insert([{ server_id: server.id, user_id: owner_id }]);
  await supabase.from('channels').insert([{ name: 'general', server_id: server.id }]);
  res.json(server);
});

app.get('/my-servers/:userId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('servers(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(m => m.servers).filter(s => s !== null) : []);
});

app.get('/channels/:serverId', async (req, res) => {
  const { data } = await supabase.from('channels').select('*').eq('server_id', req.params.serverId);
  res.json(data);
});

app.get('/server-members/:serverId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('profiles:user_id(*)').eq('server_id', req.params.serverId);
  res.json(data ? data.map(m => m.profiles) : []);
});

// --- 3. FRIENDS ---
app.get('/friends/:userId', async (req, res) => {
  const { data } = await supabase.from('friends').select('profiles:friend_id(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(m => m.profiles) : []);
});

app.post('/add-friend', async (req, res) => {
  const { userId, friendId } = req.body;
  await supabase.from('friends').upsert([{ user_id: userId, friend_id: friendId }, { user_id: friendId, friend_id: userId }]);
  res.json({ status: 'added' });
});

// --- 4. MESSAGES (Force Type Checking) ---
app.get('/messages/:id', async (req, res) => {
  const isDM = req.query.type === 'dm';
  let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
  
  if (isDM) {
    q = q.eq('dm_room_id', req.params.id);
  } else {
    // Force integer check for channel IDs
    const chanId = parseInt(req.params.id);
    if (isNaN(chanId)) return res.json([]);
    q = q.eq('channel_id', chanId);
  }
  
  const { data } = await q;
  res.json(data || []);
});

app.post('/messages', async (req, res) => {
  const { username, content, channel_id, dm_room_id, avatar_url } = req.body;
  const payload = { username, content, avatar_url };
  if (dm_room_id) payload.dm_room_id = dm_room_id;
  else payload.channel_id = channel_id;
  
  await supabase.from('messages').insert([payload]);
  res.json({ status: 'ok' });
});

app.listen(PORT, () => console.log("Backend Fully Operational"));
