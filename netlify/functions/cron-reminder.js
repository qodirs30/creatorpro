const { schedule } = require('@netlify/functions');
const webpush = require('web-push');
const fetch = globalThis.fetch;

const handler = async (event, context) => {
  console.log('Cron Reminder function started...');

  const dbSecret = process.env.FIREBASE_DB_SECRET;
  const dbUrl = `https://qodirs-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users.json${dbSecret ? `?auth=${dbSecret}` : ''}`;

  // Set VAPID keys
  webpush.setVapidDetails(
    'mailto:qodirs30@gmail.com',
    'BM9MIyqrEyZE14pDk4Jw3kicLqKhJARFkWjyDFlatpqdjU9zDcXzJEM4qaD86FsjXI7E9l3ltGlri_CtmBEaDiU',
    'V0vuGsbO_YWsdAF4N7NOgluVllygOVVPy5XscvNg-UI'
  );

  // Helper mendapatkan tanggal hari ini format YYYY-MM-DD di Waktu Indonesia Barat (WIB, UTC+7)
  const getIndonesianDateString = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const idTime = new Date(utc + (3600000 * 7));
    const year = idTime.getFullYear();
    const month = String(idTime.getMonth() + 1).padStart(2, '0');
    const day = String(idTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getIndonesianDateString();
  console.log(`Checking reminders for date: ${todayStr}`);

  try {
    const res = await fetch(dbUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch Firebase database: ${res.statusText}`);
    }
    const users = await res.json();
    if (!users) {
      console.log('Firebase users node is empty.');
      return { statusCode: 200, body: 'No users found.' };
    }

    let notificationsSent = 0;

    for (const [uid, userData] of Object.entries(users)) {
      // Cek apakah user memiliki subscription
      const subscriptionsObj = userData.pushSubscriptions;
      if (!subscriptionsObj) continue;

      const subscriptions = Object.values(subscriptionsObj);
      if (subscriptions.length === 0) continue;

      const companionName = userData.memexCompanion?.name || 'Suki';
      const companionAvatar = userData.memexCompanion?.avatar || '🦊';

      // ─── 1. Cek Tugas (Tasks) Hari Ini ───────────────────────────────────
      const tasks = (userData.memexCards || []).filter(c => c.type === 'task');
      const todayTasks = tasks.filter(t => t.data?.dueDate === todayStr);

      // ─── 2. Cek Kebiasaan (Habits) Belum Selesai ──────────────────────────
      const habits = userData.habits || [];
      const uncompletedHabits = habits.filter(h => h.isMandatory && !h.completedToday);

      // Rancang pesan pengingat
      let message = '';
      if (todayTasks.length > 0) {
        const taskTitles = todayTasks.map(t => `"${t.title}"`).join(', ');
        message = `Oi! Hari ini lo ada tugas penting: ${taskTitles}. Buruan selesaiin, jangan ditunda!`;
      } else if (uncompletedHabits.length > 0) {
        const habitTitles = uncompletedHabits.map(h => `"${h.title}"`).join(', ');
        message = `Ada kebiasaan wajib lo yang belum dicentang nih: ${habitTitles}. Segera lakukan sekarang biar streak lo gak putus!`;
      }

      // Kirim notifikasi jika ada pesan
      if (message) {
        const payload = JSON.stringify({
          title: `${companionAvatar} ${companionName}`,
          body: message,
          icon: 'https://qodirsganteng.my.id/logo.svg',
          badge: 'https://qodirsganteng.my.id/favicon.svg',
          url: 'https://qodirsganteng.my.id/memex'
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            notificationsSent++;
          } catch (pushErr) {
            console.error(`Failed to send push notification to user ${uid}:`, pushErr.message);
            // Jika subscription sudah kedaluwarsa/tidak valid, bisa dihapus dari database (opsional)
          }
        }
      }
    }

    console.log(`Cron Reminder finished. Sent ${notificationsSent} notifications.`);
    return { statusCode: 200, body: `Sent ${notificationsSent} notifications.` };
  } catch (err) {
    console.error('Cron Reminder error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// Dijadwalkan berjalan otomatis setiap jam 09:00 WIB (02:00 UTC) dan 18:00 WIB (11:00 UTC)
exports.handler = schedule('0 2,11 * * *', handler);
