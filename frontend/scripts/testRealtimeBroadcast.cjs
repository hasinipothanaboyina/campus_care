const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '', supabaseKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

async function testRealtime() {
  console.log('--- Connecting Student Client ---');
  const student = createClient(supabaseUrl, supabaseKey);
  await student.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });

  const admin = createClient(supabaseUrl, supabaseKey);
  await admin.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });

  let eventReceived = false;

  const channel = student
    .channel('test_realtime_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
      console.log('REALTIME EVENT RECEIVED BY STUDENT!', payload.eventType, payload.new?.id, payload.new?.status);
      eventReceived = true;
    })
    .subscribe(async (status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Updating test row via Admin client...');
        const { error } = await admin
          .from('submissions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', 'CC-2026-410');
        console.log('Update executed, error:', error);
      }
    });

  setTimeout(() => {
    console.log('Result after 5s: eventReceived =', eventReceived);
    student.removeChannel(channel);
    process.exit(0);
  }, 5000);
}

testRealtime().catch(console.error);
