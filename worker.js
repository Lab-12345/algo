export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || url.origin;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Proxy API calls directly to Cloudflare Tunnel connected to VPS
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      const backendBase = env.BACKEND_URL || 'https://actors-sensitivity-voluntary-spies.trycloudflare.com';
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.set('X-Forwarded-Proto', 'https');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(new Request(targetUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
          signal: controller.signal
        }));

        clearTimeout(timeoutId);

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', origin);
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        responseHeaders.delete('cross-origin-opener-policy');
        responseHeaders.delete('cross-origin-resource-policy');
        responseHeaders.delete('content-security-policy');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'TUNNEL_GATEWAY_ERROR',
            message: `Could not connect to VPS backend tunnel at ${backendBase}: ${err.message}`
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true'
            }
          }
        );
      }
    }

    // Serve static SPA assets from client/dist
    return env.ASSETS.fetch(request);
  }
};
