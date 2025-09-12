// Supabase Environment Configuration
// Replace these with your actual Supabase project credentials

export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
};

// Instructions:
// 1. Go to https://supabase.com/dashboard
// 2. Create a new project or use existing one
// 3. Copy the Project URL and anon key from Project Settings > API
// 4. Replace the placeholder values above
// 5. Set environment variables:
//    export VITE_SUPABASE_URL=https://your-project-id.supabase.co
//    export VITE_SUPABASE_ANON_KEY=your-anon-key-here
// 6. Or create a .env file with these variables
// 7. Run: node init-database.js to initialize the database

console.log('🔧 Supabase Configuration:');
console.log('URL:', SUPABASE_CONFIG.url);
console.log('Key configured:', SUPABASE_CONFIG.anonKey !== 'your-anon-key-here');

export default SUPABASE_CONFIG;
