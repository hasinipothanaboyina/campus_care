const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'pages', 'StudentProfilePage.tsx');
let content = fs.readFileSync(file, 'utf8');
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const search = `  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      studentId,
      department,
      year,
      section,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };`;

const replace = `  const [saved, setSaved] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile({
        fullName,
        studentId,
        department,
        year,
        section,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setUpdating(false);
    }
  };`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  // Also add disabled={updating} to button
  content = content.replace(
    'className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow flex items-center gap-2"',
    'disabled={updating} className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow flex items-center gap-2 disabled:opacity-50"'
  );
  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log('StudentProfilePage patched successfully');
} else {
  console.log('Target not found in StudentProfilePage');
}
