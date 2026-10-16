// Runs before the stylesheet: picks the saved theme, else the system's, so the page never flashes the wrong one.
(function () {
  var saved = null;
  try { saved = localStorage.getItem('next-theme'); } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
