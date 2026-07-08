const fs = require('fs');
const file = 'components/StudentDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const notifLogic = `
  // Push Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser does not support desktop notifications');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Push notification permission denied.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Monitor for newly opened sessions
  const prevSessionsRef = React.useRef<AttendanceSession[]>([]);
  useEffect(() => {
    if (!currentUser || prevSessionsRef.current.length === 0) {
      prevSessionsRef.current = sessions;
      return;
    }

    const activeSessions = sessions.filter(s => s.status === 'active' && s.classGroup === currentUser.classGroup);
    const newActiveSessions = activeSessions.filter(activeSess => {
      const prevSess = prevSessionsRef.current.find(p => p.id === activeSess.id);
      return !prevSess || prevSess.status !== 'active';
    });

    if (newActiveSessions.length > 0) {
      newActiveSessions.forEach(sess => {
        const msg = \`Lecturer has opened check-in for \${sess.courseCode} (\${sess.courseName})!\`;
        toast.info('New Attendance Session Opened', {
          description: msg,
          icon: <Bell className="text-blue-500 w-5 h-5" />,
          duration: 10000,
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Course E-Attendance', {
            body: msg,
          });
        }
      });
    }

    prevSessionsRef.current = sessions;
  }, [sessions, currentUser]);
`;

content = content.replace('  // Course Enrollment & QR Scanner States', notifLogic + '\n  // Course Enrollment & QR Scanner States');
fs.writeFileSync(file, content);
