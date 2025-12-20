const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. PROFILES (Updated for PFP) ---
app.get('/profile/:userId', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.userId).single();
  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase.from('profiles').insert([{ 
      id: req.params.userId, 
      username: 'User' + Math.floor(1000 + Math.random() * 9000),
      avatar_url: '' 
    }]).select();
    return res.json(newUser[0]);
  }
  res.json(data);
});

app.post('/update-profile', async (req, res) => {
  const { userId, username, avatar_url } = req.body;
  await supabase.from('profiles').update({ username, avatar_url }).eq('id', userId);
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

app.post('/join-server', async (req, res) => {
  const { server_id, user_id } = req.body;
  const { data: existing } = await supabase.from('server_members').select('*').eq('server_id', server_id).eq('user_id', user_id).single();
  if (existing) return res.status(400).json({ error: "Already a member" });
  await supabase.from('server_members').insert([{ server_id, user_id }]);
  res.json({ status: 'joined' });
});

app.delete('/servers/:serverId', async (req, res) => {
  const { userId } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', req.params.serverId).single();
  if (server && server.owner_id === userId) {
    await supabase.from('channels').delete().eq('server_id', req.params.serverId);
    await supabase.from('server_members').delete().eq('server_id', req.params.serverId);
    await supabase.from('servers').delete().eq('id', req.params.serverId);
    res.json({ status: 'deleted' });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

app.get('/channels/:serverId', async (req, res) => {
  const { data } = await supabase.from('channels').select('*').eq('server_id', req.params.serverId);
  res.json(data);
});

app.post('/channels', async (req, res) => {
  const { name, server_id } = req.body;
  const { data } = await supabase.from('channels').insert([{ name, server_id }]).select();
  res.json(data[0]);
});

app.get('/server-members/:serverId', async (req, res) => {
  const { data } = await supabase.from('server_members').select('profiles:user_id(id, username, avatar_url)').eq('server_id', req.params.serverId);
  res.json(data ? data.map(m => m.profiles) : []);
});

app.post('/kick-member', async (req, res) => {
  const { server_id, target_id, requester_id } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', server_id).single();
  if (server && server.owner_id === requester_id) {
    await supabase.from('server_members').delete().eq('server_id', server_id).eq('user_id', target_id);
    return res.json({ status: 'kicked' });
  }
  res.status(403).json({ error: "Unauthorized" });
});

// --- 3. MESSAGES ---
app.get('/messages/:id', async (req, res) => {
  const isDM = req.query.type === 'dm';
  let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
  isDM ? q = q.eq('dm_room_id', req.params.id) : q = q.eq('channel_id', req.params.id);
  const { data } = await q;
  res.json(data || []);
});

app.post('/messages', async (req, res) => {
  const { username, content, channel_id, dm_room_id, avatar_url } = req.body;
  await supabase.from('messages').insert([{ username, content, channel_id, dm_room_id, avatar_url }]);
  res.json({ status: 'ok' });
});

app.delete('/messages/:msgId', async (req, res) => {
  const { userId, serverId } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).single();
  if (server && server.owner_id === userId) {
    await supabase.from('messages').delete().eq('id', req.params.msgId);
    res.json({ status: 'deleted' });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

app.listen(PORT, () => console.log(`Full Backend Live on ${PORT}`));
