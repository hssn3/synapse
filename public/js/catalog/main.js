/* راه‌اندازی کاتالوگ — ترتیب وابستگی‌ها فقط همین‌جاست. */
(function () {
  'use strict';

  window.CatalogDirectory.init();
  window.CatalogQuickfind.init();
  window.CatalogMeasures.init({ onIndexLoaded: window.CatalogQuickfind.rebuildIndex });
  window.CatalogChrome.init();
  window.CatalogMeasures.idleLoad();
  window.CatalogMotion.init();
})();
