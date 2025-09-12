
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Function to get agents
export async function getAgents() {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) throw error;
  return data;
}

// Similar functions for sessions and tasks
export async function getSessions() {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) throw error;
  return data;
}

export async function getTasks() {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) throw error;
  return data;
}
