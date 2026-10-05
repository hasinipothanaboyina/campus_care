const url = "https://brpdzkzkgfpdviarsbvj.supabase.co/auth/v1/user";
// Wait, to list users I need the Service Role key. I don't have it.
// I can just try to sign in with the admin credentials!
const loginUrl = "https://brpdzkzkgfpdviarsbvj.supabase.co/auth/v1/token?grant_type=password";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycGR6a3prZ2ZwZHZpYXJzYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDM3NjEsImV4cCI6MjEwNjc3OTc2MX0.K3i364aSFiBUqGJdhfszzNanUdtsTH65Lq65UKmPnPo";

async function checkLogin() {
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@srgec.edu',
      password: 'srgec@123'
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

checkLogin();
