const fs = require('fs');
const path = require('path');

const appFile = path.resolve(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(appFile, 'utf8');

// Normalize line endings to LF for replacement
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const search = `            {/* Parent Protected Routes */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRole="PARENT">
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />`;

const replace = `            {/* Parent Protected Routes */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRole="PARENT">
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/link-status"
              element={
                <ProtectedRoute allowedRole="PARENT">
                  <ParentLinkStatusPage />
                </ProtectedRoute>
              }
            />`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(appFile, content, 'utf8');
  console.log('App.tsx route updated successfully');
} else {
  console.log('Target block not found');
}
