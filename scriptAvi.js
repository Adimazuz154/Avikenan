(function() {
  let io;
  let wheelHandler = null;
  let autoScrollTimer = null;
  let currentThumbId = null;

  // map gallery href → thumbnail ID
  const thumbMap = {
    "./christianity":      "bronze-cat",
    "./whispers-of-color": "painting-cat",
    "./sulky-mon":         "monumental-cat",
    "./photography4":      "photography-cat",
    "./conceptual7":       "conceptual-cat",
    "./christianity-jew":  "jewelry-cat"
  };

  // map gallery href → heading text
  const hrefMap = {
    "./christianity":      "bronze",
    "./whispers-of-color": "Painted",
    "./sulky-mon":         "Monumental",
    "./photography4":      "Photography",
    "./conceptual7":       "Conceptual",
    "./christianity-jew":  "Jewelry"
  };

  /* ——— wheel-override when cursor over gallery ——— */
  function initWheel() {
    const allowOnPages = ['/', '/press'];
    if (wheelHandler) {
      window.removeEventListener('wheel', wheelHandler, { passive: false });
      wheelHandler = null;
    }
    if (!allowOnPages.includes(window.location.pathname)) return;
    const gallery = document.querySelector("#gallery");
    if (!gallery) return;

    wheelHandler = function(e) {
      if (e.deltaY === 0) return;
      const r = gallery.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      gallery.scrollTop += e.deltaY;
      e.preventDefault();
    };
    window.addEventListener('wheel', wheelHandler, { passive: false });
  }

  /* ——— auto-scroll ticker ——— */
  function startAutoScroll() {
    const gallery = document.querySelector("#gallery");
    if (!gallery || autoScrollTimer) return;
    const pixelsPerFrame = 1;   // px per tick
    const frameDuration  = 20;  // ms between ticks
    autoScrollTimer = setInterval(() => {
      gallery.scrollTop += pixelsPerFrame;
      if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight) {
        gallery.scrollTop = 0;
      }
    }, frameDuration);
  }
  function stopAutoScroll() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }

  /* ——— extracted init for auto-scroll + overflow setup ——— */
  function initAutoScroll() {
    const gallery = document.querySelector("#gallery");
    if (!gallery) return;

    // stop any existing ticker
    stopAutoScroll();

    // determine orientation
    const isHorizontal = gallery.scrollWidth > gallery.clientWidth;
    if (isHorizontal) {
      gallery.style.overflowY = "hidden";
      gallery.style.overflowX = "auto";
      return;
    }
    gallery.style.overflowX = "hidden";
    gallery.style.overflowY = "auto";

    // re-bind hover handlers
    gallery.removeEventListener("mouseenter", stopAutoScroll);
    gallery.removeEventListener("mouseleave", startAutoScroll);
    gallery.addEventListener("mouseenter", stopAutoScroll);
    gallery.addEventListener("mouseleave", startAutoScroll);

    // start ticker
    startAutoScroll();
  }

  /* ——— intersection-observer + title/thumbnail swap ——— */
  function initObserver() {
    initWheel();
    if (io) io.disconnect();

    const items = document.querySelectorAll("#gallery a");
    if (!items.length) return;

    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el   = entry.target;
        const href = el.getAttribute("href");

        // 1) gallery-scale toggle
        el.classList.toggle("in-center", entry.isIntersecting);

        if (entry.isIntersecting && hrefMap[href]) {
          // 2) update main-title text
          const newText = hrefMap[href];
          const span    = document.querySelector("#main-title .framer-text span");
          if (span) {
            const parts = newText.split(" ");
            span.innerHTML = parts.length === 1
              ? parts[0]
              : parts[0] + `<br class="framer-text">` + parts.slice(1).join(" ");
          }

          // 3) update thumbnail selection
          const thumbId = thumbMap[href];
          if (thumbId) {
            if (currentThumbId && currentThumbId !== thumbId) {
              document.getElementById(currentThumbId)
                      ?.classList.remove("selected");
            }
            const thumbEl = document.getElementById(thumbId);
            if (thumbEl) {
              thumbEl.classList.add("selected");
              currentThumbId = thumbId;
            }
          }
        }
      });
    }, {
      root:       null,
      rootMargin: "-50% 0px -50% 0px",
      threshold:  0
    });

    items.forEach(el => io.observe(el));

    // ←—— **new**: whenever the gallery is observed (initial load OR after a route change),
    // kick off the auto-scroll setup too.
    initAutoScroll();
  }

  /* ——— SPA navigation hooks ——— */
  function onLocationChange() {
    // tiny delay to let Framer re-render the DOM
    setTimeout(initObserver, 50);
  }
  const _push = history.pushState;
  history.pushState = function() {
    _push.apply(this, arguments);
    window.dispatchEvent(new Event("locationchange"));
  };
  const _replace = history.replaceState;
  history.replaceState = function() {
    _replace.apply(this, arguments);
    window.dispatchEvent(new Event("locationchange"));
  };
  window.addEventListener("popstate",      onLocationChange);
  window.addEventListener("locationchange", onLocationChange);

  /* ——— initial boot ——— */
  document.addEventListener("DOMContentLoaded", initObserver);

})();
