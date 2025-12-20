const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- PROFILES ---
app.get('/profile/:userId', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.userId).single();
  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase.from('profiles').insert([{ id: req.params.userId, username: 'User' + Math.floor(1000 + Math.random() * 9000) }]).select();
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
app.post('/servers', async (req, res) => {
  const { name, owner_id } = req.body;
  const { data } = await supabase.from('servers').insert([{ name, owner_id }]).select();
  const server = data[0];
  await supabase.from('server_members').insert([{ server_id: server.id, user_id: owner_id }]);
  await supabase.from('channels').insert([{ name: 'general', server_id: server.id }]);
  res.json(server);
});

app.get('/my-servers/:userId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('servers(*)').eq('user_id', req.params.userId);
  res.json(data ? data.map(m => m.servers) : []);
});

app.get('/channels/:serverId', async (req, res) => {
  const { data } = await supabase.from('channels').select('*').eq('server_id', req.params.serverId);
  res.json(data);
});

app.get('/server-members/:serverId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('profiles:user_id(id, username)').eq('server_id', req.params.serverId);
  res.json(data ? data.map(m => m.profiles) : []);
});

app.post('/join-server', async (req, res) => {
  const { server_id, user_id } = req.body;
  await supabase.from('server_members').insert([{ server_id, user_id }]);
  res.json({ status: 'joined' });
});

// --- FRIENDS & DMs ---
app.get('/my-friends/:userId', async (req, res) => {
  const { data } = await supabase.from('friends').select('profiles:friend_id(id, username)').eq('user_id', req.params.userId);
  res.json(data ? data.map(f => f.profiles) : []);
});

app.post('/get-dm-room', async (req, res) => {
  const { user_id, friend_id } = req.body;
  const [u1, u2] = [user_id, friend_id].sort();
  let { data: room } = await supabase.from('dm_rooms').select('*').eq('user_one', u1).eq('user_two', u2).single();
  if (!room) {
    const { data: nr } = await supabase.from('dm_rooms').insert([{ user_one: u1, user_two: u2 }]).select();
    room = nr[0];
  }
  res.json(room);
});

// --- MESSAGES ---
app.get('/messages/:id', async (req, res) => {
  const isDM = req.query.type === 'dm';
  let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
  isDM ? q = q.eq('dm_room_id', req.params.id) : q = q.eq('channel_id', req.params.id);
  const { data } = await q;
  res.json(data || []);
});

app.post('/messages', async (req, res) => {
  const { username, content, channel_id, dm_room_id } = req.body;
  const payload = { username, content };
  if (channel_id) payload.channel_id = channel_id;
  if (dm_room_id) payload.dm_room_id = dm_room_id;
  await supabase.from('messages').insert([payload]);
  res.json({ status: 'ok' });
});

app.listen(PORT);
