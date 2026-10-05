const url = "https://brpdzkzkgfpdviarsbvj.supabase.co/rest/v1/profiles";
const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjRkZjliZWE2LTc4MmMtNGE0Zi04Y2RjLTg3ZGNkNzE5MDczNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2JycGR6a3prZ2ZwZHZpYXJzYnZqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIxNTMyYjFiYS05NGVmLTQwNjAtOTlkOS1lMjA0MDNkZDk1NTQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkxMjIzNjY1LCJpYXQiOjE3OTEyMjAwNjUsImVtYWlsIjoiYWRtaW5Ac3JnZWMuZWR1IiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImFkbWluQHNyZ2VjLmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJQcmluY2lwYWwgQWRtaW4iLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInJvbGUiOiJBRE1JTiIsInN0dWRlbnRfaWQiOiIyNDQ4MUE2NzM4MyIsInN1YiI6IjE1MzJiMWJhLTk0ZWYtNDA2MC05OWQ5LWUyMDQwM2RkOTU1NCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzkxMjIwMDY1fV0sInNlc3Npb25faWQiOiI0NGIyNTMwYi1lMzE5LTQ1YzgtOTFhYS0xNjc4MzU1ODUxOGQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.fCThW-lDF1CYe0a8dHD3DcG5jVXybpfv828v7xLgCTyVHXggqy2D1WbEMBhK2tn7c1f-sOov1YuW2zEbzu7qqQ";
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycGR6a3prZ2ZwZHZpYXJzYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDM3NjEsImV4cCI6MjEwNjc3OTc2MX0.K3i364aSFiBUqGJdhfszzNanUdtsTH65Lq65UKmPnPo";

async function createProfile() {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': apikey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: "1532b1ba-94ef-4060-99d9-e20403dd9554", // from the JWT sub
      full_name: "Principal Admin",
      email: "admin@srgec.edu",
      role: "ADMIN",
      student_id: "24481A67383",
      department: "Administration",
      is_approved: true
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

createProfile();
