const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. PROFILES & USERNAMES ---
app.get('/profile/:userId', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.userId).single();
  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase.from('profiles').insert([{ 
      id: req.params.userId, 
      username: 'User_' + Math.floor(Math.random()*1000) 
    }]).select();
    return res.json(newUser[0]);
  }
  res.json(data);
});

app.post('/update-username', async (req, res) => {
  const { userId, username } = req.body;
  await supabase.from('profiles').update({ username }).eq('id', userId);
  res.json({ status: 'updated' });
});

// --- 2. SERVERS & CHANNELS ---
app.get('/my-servers/:userId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('servers(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(m => m.servers) : []);
});

app.post('/servers', async (req, res) => {
  const { name, owner_id } = req.body;
  const { data } = await supabase.from('servers').insert([{ name, owner_id }]).select();
  const server = data[0];
  await supabase.from('server_members').insert([{ server_id: server.id, user_id: owner_id }]);
  await supabase.from('channels').insert([{ name: 'general', server_id: server.id }]);
  res.json(server);
});

app.get('/channels/:serverId', async (req, res) => {
  const { data } = await supabase.from('channels').select('*').eq('server_id', req.params.serverId);
  res.json(data);
});

// --- 3. FRIENDS & DMs ---
app.get('/search-user/:username', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('id, username').eq('username', req.params.username).single();
  if (error) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

app.post('/friend-request', async (req, res) => {
  const { user_id, friend_id } = req.body;
  await supabase.from('friends').insert([{ user_id, friend_id }]);
  res.json({ status: 'sent' });
});

app.get('/my-friends/:userId', async (req, res) => {
  const { data } = await supabase.from('friends').select('friend_id, profiles!friends_friend_id_fkey(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(f => f.profiles) : []);
});

app.post('/get-dm-room', async (req, res) => {
  const { user_id, friend_id } = req.body;
  const [u1, u2] = [user_id, friend_id].sort();
  let { data: room } = await supabase.from('dm_rooms').select('*').eq('user_one', u1).eq('user_two', u2).single();
  if (!room) {
    const { data: newRoom } = await supabase.from('dm_rooms').insert([{ user_one: u1, user_two: u2 }]).select();
    room = newRoom[0];
  }
  res.json(room);
});

// --- 4. MESSAGES ---
app.get('/messages/:id', async (req, res) => {
  const isDM = req.query.type === 'dm';
  const query = supabase.from('messages').select('*').order('created_at', { ascending: true });
  isDM ? query.eq('dm_room_id', req.params.id) : query.eq('channel_id', req.params.id);
  const { data } = await query;
  res.json(data || []);
});

app.post('/messages', async (req, res) => {
  const { username, content, channel_id, dm_room_id } = req.body;
  await supabase.from('messages').insert([{ username, content, channel_id, dm_room_id }]);
  res.json({ status: 'ok' });
});

app.get('/ping', (req, res) => res.send('Online'));
app.listen(PORT);
