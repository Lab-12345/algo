export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Proxy API calls directly to VPS backend on Lightsail
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      const backendBase = env.BACKEND_URL || 'http://13.232.230.172:5000';
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      const headers = new Headers(request.headers);
      headers.set('Host', '13.232.230.172:5000');
      headers.set('X-Forwarded-Proto', 'https');

      try {
        const response = await fetch(new Request(targetUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow'
        }));

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Backend Gateway Error',
            message: `Could not connect to VPS backend at ${backendBase}: ${err.message}`
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
    }

    // Serve static SPA assets from client/dist
    return env.ASSETS.fetch(request);
  }
};
