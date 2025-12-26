// Drivalia Response Interceptor - injected into page context
// This is loaded as an external script to comply with CSP
(function() {
  // Store original fetch
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      const url = args[0]?.url || args[0];

      // Intercept quote save responses (URL contains the quote number)
      if (url && typeof url === 'string' && url.includes('/application/')) {
        response.clone().json().then(data => {
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: url
          }, '*');
          console.log('[Drivalia] Intercepted quote response:', url);
        }).catch(() => {});
      }

      return response;
    });
  };

  // Store original XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._drivaliaUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      // Intercept application/quote responses
      if (this._drivaliaUrl && this._drivaliaUrl.includes('/application/')) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: this._drivaliaUrl
          }, '*');
          console.log('[Drivalia] Intercepted XHR quote response');
        } catch (e) {}
      }
    });
    return originalSend.apply(this, arguments);
  };

  console.log('[Drivalia] Response interceptor installed');
})();
