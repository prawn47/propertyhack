const BEEHIIV_BASE_URL = 'https://api.beehiiv.com/v2';

async function getSubscriptionId(email) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  const res = await fetch(
    `${BEEHIIV_BASE_URL}/publications/${publicationId}/subscriptions?email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const subscriptions = data.data;
  if (!subscriptions || subscriptions.length === 0) return null;
  return subscriptions[0].id;
}

async function subscribe(email, options = {}) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (!apiKey || !publicationId) {
    console.warn('[beehiiv] BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not configured — skipping subscribe');
    return;
  }

  try {
    const body = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
    };
    if (options.firstName) {
      body.utm_medium = options.firstName;
    }
    if (options.country || options.region) {
      body.custom_fields = [];
      if (options.country) body.custom_fields.push({ name: 'country', value: options.country });
      if (options.region) body.custom_fields.push({ name: 'region', value: options.region });
    }

    const res = await fetch(
      `${BEEHIIV_BASE_URL}/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[beehiiv] subscribe failed (${res.status}): ${errBody}`);
    }
  } catch (err) {
    console.error('[beehiiv] subscribe error:', err.message);
  }
}

async function unsubscribe(email) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (!apiKey || !publicationId) {
    console.warn('[beehiiv] BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not configured — skipping unsubscribe');
    return;
  }

  try {
    const subscriptionId = await getSubscriptionId(email);
    if (!subscriptionId) {
      console.warn(`[beehiiv] no subscription found for ${email} — skipping unsubscribe`);
      return;
    }

    const res = await fetch(
      `${BEEHIIV_BASE_URL}/publications/${publicationId}/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'inactive' }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[beehiiv] unsubscribe failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error('[beehiiv] unsubscribe error:', err.message);
  }
}

async function getPostStats(postId) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (!apiKey || !publicationId) return null;

  try {
    const res = await fetch(
      `${BEEHIIV_BASE_URL}/publications/${publicationId}/posts/${postId}/stats`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    console.error('[beehiiv] getPostStats error:', err.message);
    return null;
  }
}

async function listPosts(page = 1, limit = 20) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (!apiKey || !publicationId) return [];

  try {
    const res = await fetch(
      `${BEEHIIV_BASE_URL}/publications/${publicationId}/posts?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('[beehiiv] listPosts error:', err.message);
    return [];
  }
}

module.exports = { subscribe, unsubscribe, getPostStats, listPosts };
