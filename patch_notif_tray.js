const fs = require('fs');
const file = 'components/StudentDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const notifTrayBanner = `
                    <span className="text-xs font-extrabold text-slate-700 uppercase">Notifikasi & Amaran ({myAlerts.length})</span>
                    {unreadAlerts.length > 0 && (
                      <button 
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded"
                        onClick={() => {
                          const updated = alerts.map(a => 
                            (a.studentId === currentUser?.id && a.status === 'sent') 
                              ? { ...a, status: 'read' as const } : a
                          );
                          setAlerts(updated);
                        }}
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                  
                  {notificationPermission !== 'granted' && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-3">
                      <p className="text-[11px] text-slate-600 mb-2">Enable desktop push notifications to get instantly alerted when a lecturer opens a class session.</p>
                      <button 
                        onClick={requestNotificationPermission}
                        className="w-full text-[10px] bg-blue-600 text-white font-bold py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        Enable Push Notifications
                      </button>
                    </div>
                  )}
`;

content = content.replace(/<span className="text-xs font-extrabold text-slate-700 uppercase">Notifikasi & Amaran \(\{myAlerts\.length\}\)<\/span>([\s\S]*?)<\/div>/, notifTrayBanner);
fs.writeFileSync(file, content);
