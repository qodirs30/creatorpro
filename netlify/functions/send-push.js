const webpush = require('web-push');

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON body' })
    };
  }

  const { subscription, title = 'kipli', message = 'Test notifikasi berhasil! 👍', icon = 'https://qodirsganteng.my.id/logo.svg' } = body;
  if (!subscription) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Subscription is required' })
    };
  }

  // Set VAPID keys
  webpush.setVapidDetails(
    'mailto:qodirs30@gmail.com',
    'BM9MIyqrEyZE14pDk4Jw3kicLqKhJARFkWjyDFlatpqdjU9zDcXzJEM4qaD86FsjXI7E9l3ltGlri_CtmBEaDiU',
    'V0vuGsbO_YWsdAF4N7NOgluVllygOVVPy5XscvNg-UI'
  );

  try {
    const payload = JSON.stringify({
      title,
      body: message,
      icon,
      badge: 'https://qodirsganteng.my.id/favicon.svg',
      url: 'https://qodirsganteng.my.id/memex'
    });

    await webpush.sendNotification(subscription, payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Push notification sent.' })
    };
  } catch (err) {
    console.error('Failed to send push:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Failed to send push notification', error: err.message })
    };
  }
};
