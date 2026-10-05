const url = "https://brpdzkzkgfpdviarsbvj.supabase.co/rest/v1/profiles?select=*";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycGR6a3prZ2ZwZHZpYXJzYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDM3NjEsImV4cCI6MjEwNjc3OTc2MX0.K3i364aSFiBUqGJdhfszzNanUdtsTH65Lq65UKmPnPo";

async function getProfiles() {
  const response = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

getProfiles();
