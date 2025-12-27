// Drivalia Response Interceptor & Angular Helper - runs in MAIN world (page context)
// This script has access to window.angular and can interact with AngularJS
(function() {
  console.log('[Drivalia MAIN] Interceptor script loaded in MAIN world');
  console.log('[Drivalia MAIN] window.angular available:', !!window.angular);
  // Helper to check if URL should be intercepted
  function shouldIntercept(url) {
    if (!url || typeof url !== 'string') return false;
    // Intercept both /calculate/ (for pricing data) and /application/ (for saved quotes)
    const shouldCapture = url.includes('/calculate/') || url.includes('/application/') || url.includes('/calculate');
    if (url.includes('api') || url.includes('calculate') || url.includes('application')) {
      console.log('[Drivalia MAIN] URL check:', url.substring(0, 100), '-> intercept:', shouldCapture);
    }
    return shouldCapture;
  }

  // Listen for commands from content script to interact with Angular
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'DRIVALIA_ANGULAR_COMMAND') {
      const { command, selector, value } = event.data;
      console.log('[Drivalia MAIN] Received command:', command, selector, value);

      if (command === 'setSelectValue') {
        const element = document.querySelector(selector);
        console.log('[Drivalia MAIN] setSelectValue - element found:', !!element, 'angular available:', !!window.angular);
        if (element && window.angular) {
          try {
            const scope = window.angular.element(element).scope();
            if (scope) {
              scope.$apply(() => {
                // Set the value on the element
                element.value = value;

                // Also try to update the ng-model directly
                const ngModel = element.getAttribute('ng-model');
                if (ngModel) {
                  // Parse the ng-model path and set the value
                  const parts = ngModel.split('.');
                  let obj = scope;
                  for (let i = 0; i < parts.length - 1; i++) {
                    obj = obj[parts[i]];
                  }
                  obj[parts[parts.length - 1]] = value.replace('string:', '');
                }

                // Trigger ng-change if it exists
                const ngChange = element.getAttribute('ng-change');
                if (ngChange && typeof scope.$eval === 'function') {
                  scope.$eval(ngChange);
                }
              });
              console.log('[Drivalia MAIN] Angular value set successfully');
              window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: true }, '*');
            }
          } catch (e) {
            console.error('[Drivalia MAIN] Angular error:', e);
            window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: false, error: e.message }, '*');
          }
        } else {
          // Fallback: just set value and dispatch events
          if (element) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: true, fallback: true }, '*');
        }
      }

      if (command === 'setInputValue') {
        const element = document.querySelector(selector);
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));

          // Try Angular scope update
          if (window.angular) {
            try {
              const scope = window.angular.element(element).scope();
              if (scope) {
                scope.$apply();
              }
            } catch (e) {}
          }
          window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: true }, '*');
        } else {
          window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: false, error: 'Element not found' }, '*');
        }
      }

      if (command === 'clickElement') {
        const element = document.querySelector(selector);
        if (element) {
          element.click();
          window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: true }, '*');
        } else {
          window.postMessage({ type: 'DRIVALIA_ANGULAR_RESULT', success: false, error: 'Element not found' }, '*');
        }
      }
    }
  });

  // Store original fetch
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      const url = args[0]?.url || args[0];

      if (shouldIntercept(url)) {
        console.log('[Drivalia MAIN] Intercepting fetch response for:', url);
        response.clone().json().then(data => {
          console.log('[Drivalia MAIN] Posting fetch response, keys:', Object.keys(data || {}));
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: url
          }, '*');
          console.log('[Drivalia MAIN] Posted DRIVALIA_QUOTE_RESPONSE for:', url);
        }).catch((err) => {
          console.log('[Drivalia MAIN] Failed to parse fetch response:', err.message);
        });
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
        console.log('[Drivalia MAIN] Intercepting XHR response for:', this._drivaliaUrl);
        try {
          const data = JSON.parse(this.responseText);
          console.log('[Drivalia MAIN] Posting XHR response, keys:', Object.keys(data || {}));
          window.postMessage({
            type: 'DRIVALIA_QUOTE_RESPONSE',
            data: data,
            url: this._drivaliaUrl
          }, '*');
          console.log('[Drivalia MAIN] Posted DRIVALIA_QUOTE_RESPONSE for:', this._drivaliaUrl);
        } catch (e) {
          console.log('[Drivalia MAIN] Failed to parse XHR response:', e.message);
        }
      }
    });
    return originalSend.apply(this, arguments);
  };

  console.log('[Drivalia] Response interceptor installed (captures /calculate/ and /application/)');
})();
