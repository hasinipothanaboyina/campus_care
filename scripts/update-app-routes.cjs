const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'src', 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

if (!code.includes('ParentLinkStatusPage')) {
  code = code.replace(
    "import { ParentDashboard } from './pages/parent/ParentDashboard';",
    "import { ParentDashboard } from './pages/parent/ParentDashboard';\r\nimport { ParentLinkStatusPage } from './pages/parent/ParentLinkStatusPage';"
  );

  const target = `<Route
              path="/parent"
              element={
                <ProtectedRoute allowedRole="PARENT">
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />`;

  const replacement = `<Route
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

  code = code.replace(target, replacement);
  fs.writeFileSync(appPath, code, 'utf8');
  console.log('Successfully updated App.tsx with /parent/link-status route');
} else {
  console.log('App.tsx already contains ParentLinkStatusPage');
}
