
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const wss = new WebSocketServer({ port: 3002 });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const redis = new Redis(process.env.REDIS_URL);

wss.on('connection', (ws) => {
  console.log('Client connected');
  const channel = supabase.channel('realtime:sessions');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
    ws.send(JSON.stringify(payload));
  }).subscribe();

  ws.on('close', () => {
    channel.unsubscribe();
  });
});
