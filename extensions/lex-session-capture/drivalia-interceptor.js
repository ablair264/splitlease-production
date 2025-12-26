// Drivalia Response Interceptor - injected into page context
// This is loaded as an external script to comply with CSP
(function() {
  // Helper to check if URL should be intercepted
  function shouldIntercept(url) {
    if (!url || typeof url !== 'string') return false;
    // Intercept both /calculate/ (for pricing data) and /application/ (for saved quotes)
    return url.includes('/calculate/') || url.includes('/application/');
  }

  // Store original fetch
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      const url = args[0]?.url || args[0];

      if (shouldIntercept(url)) {
        response.clone().json().then(data => {
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: url
          }, '*');
          console.log('[Drivalia] Intercepted fetch response:', url);
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
      if (shouldIntercept(this._drivaliaUrl)) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: this._drivaliaUrl
          }, '*');
          console.log('[Drivalia] Intercepted XHR response:', this._drivaliaUrl);
        } catch (e) {}
      }
    });
    return originalSend.apply(this, arguments);
  };

  console.log('[Drivalia] Response interceptor installed (captures /calculate/ and /application/)');
})();
