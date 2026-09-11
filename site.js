"use strict";
/* The original DEADLINE ticker, midnight clock, day ruler, and nav scramble.
   Presentation only: this clock does not set any benchmark task's time budget. */
(() => {
  const track = document.getElementById("ticker-track");
  if (track) {
    const phrases = ["Every model meets its deadline", '<b class="ticker-task-count">27</b> public coding tasks',
      "Every task has a token deadline", "No judge model", "Hidden tests", "Scores out of 100",
      "Submit before midnight", '<span class="ticker-languages">Python, JavaScript, and SQL</span>'];
    const half = phrases.map(p => `<span>${p}</span>`).join("");
    track.innerHTML = half + half;
  }

  const navClock = document.getElementById("nav-clock");
  const fc = document.getElementById("fc-cells");
  if (fc) fc.innerHTML = '<span class="cell"></span><span class="cell"></span><span class="sep">:</span>' +
    '<span class="cell"></span><span class="cell"></span><span class="sep">:</span>' +
    '<span class="cell"></span><span class="cell"></span>';
  const cells = fc ? fc.querySelectorAll(".cell") : [];
  const fill = document.getElementById("dl-fill");
  const marker = document.getElementById("dl-now");
  const clock = document.getElementById("dl-clock");
  const left = document.getElementById("dl-left");
  const flag = document.querySelector(".dl-flag");

  function tick() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const seconds = Math.floor((midnight - now) / 1000);
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    if (navClock) navClock.textContent = `T\u2212${h}:${m}:${s}`;
    const digits = h + m + s;
    cells.forEach((cell, i) => { if (cell.textContent !== digits[i]) cell.textContent = digits[i]; });
    if (fc) fc.setAttribute("aria-label", `Time to local midnight: ${h} hours, ${m} minutes, ${s} seconds`);
    // The ruler marks local wall-clock hours, including on daylight-saving days.
    const pct = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 864;
    if (fill) fill.style.width = pct.toFixed(2) + "%";
    if (marker) marker.style.left = pct.toFixed(2) + "%";
    if (clock) {
      clock.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      clock.style.visibility = pct > 86 || pct < 16 ? "hidden" : "visible";
    }
    if (flag) flag.style.opacity = pct > 78 ? "0" : "1";
    if (left) left.textContent = `${h}:${m} LEFT`;
  }
  tick();
  setInterval(tick, 1000);

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const glyphs = "#%@$0123456789XKWM";
  document.querySelectorAll(".nav-links a span").forEach(el => {
    const original = el.textContent;
    let interval = null;
    el.parentElement.addEventListener("mouseenter", () => {
      clearInterval(interval);
      let settled = 0;
      interval = setInterval(() => {
        el.textContent = original.split("").map((ch, i) => ch === " " ? " " :
          i < settled ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]).join("");
        if (++settled > original.length) {
          clearInterval(interval);
          interval = null;
          el.textContent = original;
        }
      }, 26);
    });
    el.parentElement.addEventListener("mouseleave", () => {
      clearInterval(interval);
      interval = null;
      el.textContent = original;
    });
  });
})();
