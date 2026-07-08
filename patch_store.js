const fs = require('fs');
const file = 'lib/store.tsx';
let content = fs.readFileSync(file, 'utf8');

const syncLogic = `
  // Sync state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'e_attendance_sessions' && e.newValue) {
        setSessions(JSON.parse(e.newValue));
      } else if (e.key === 'e_attendance_records' && e.newValue) {
        setRecords(JSON.parse(e.newValue));
      } else if (e.key === 'e_attendance_alerts' && e.newValue) {
        setAlerts(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
`;

content = content.replace('// Automatically log users out after 15 minutes', syncLogic + '\n  // Automatically log users out after 15 minutes');
fs.writeFileSync(file, content);
