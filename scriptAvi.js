(function() {
  let io;
  let wheelHandler = null;
  let autoScrollTimer = null;
  let currentThumbId = null;
  let centerListenersAttached = false;

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

  /* ——— wheel‐override when cursor over gallery ——— */
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

  /* ——— auto‐scroll ticker ——— */
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

  /* ——— init auto‐scroll + overflow setup ——— */
  function initAutoScroll() {
    const gallery = document.querySelector("#gallery");
    if (!gallery) return;

    stopAutoScroll();

    const isHorizontal = gallery.scrollWidth > gallery.clientWidth;
    if (isHorizontal) {
      gallery.style.overflowY = "hidden";
      gallery.style.overflowX = "auto";
      return;
    }
    gallery.style.overflowX = "hidden";
    gallery.style.overflowY = "auto";

    gallery.removeEventListener("mouseenter", stopAutoScroll);
    gallery.removeEventListener("mouseleave", startAutoScroll);
    gallery.addEventListener("mouseenter", stopAutoScroll);
    gallery.addEventListener("mouseleave", startAutoScroll);

    startAutoScroll();
  }

 function updateInCenter() {
  const gallery = document.querySelector('#gallery');
  if (!gallery) return;

  // grab both your <a> and your two-levels-down <div> wrappers
  const items = Array.from(
    gallery.querySelectorAll('a, :scope > div > div')
  );
  if (!items.length) return;

  // decide orientation
  const isHorizontal = gallery.scrollWidth > gallery.clientWidth;

  // pick the screen mid-point on the relevant axis
  const screenMid = isHorizontal
    ? window.innerWidth  / 2   // horizontal centre
    : window.innerHeight / 2;  // vertical centre

  let closestEl   = null;
  let closestDist = Infinity;

  items.forEach(el => {
    const r = el.getBoundingClientRect();
    // compute each element’s mid-point on X or Y
    const elMid = isHorizontal
      ? r.left + r.width  / 2
      : r.top  + r.height / 2;

    const dist = Math.abs(elMid - screenMid);
    if (dist < closestDist) {
      closestDist = dist;
      closestEl   = el;
    }
  });

  // toggle .in-center so only the closestEl gets it
  items.forEach(el => {
    el.classList.toggle('in-center', el === closestEl);
  });
}

  /* ——— intersection‐observer for title & thumbnails only ——— */
  function initObserver() {
    initWheel();
    if (io) io.disconnect();

    const items = document.querySelectorAll("#gallery a, #gallery > div > div");
    if (!items.length) return;

    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el   = entry.target;
        const href = el.getAttribute("href");

        if (entry.isIntersecting && hrefMap[href]) {
          // update main-title
          const newText = hrefMap[href];
          const span    = document.querySelector("#main-title .framer-text span");
          if (span) {
            const parts = newText.split(" ");
            span.innerHTML = parts.length === 1
              ? parts[0]
              : parts[0] + `<br class="framer-text">` + parts.slice(1).join(" ");
          }

          // update thumbnail highlight
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

    // re-init auto-scroll every time
    initAutoScroll();

    // attach our “one‐at‐a‐time” .in-center logic once
    if (!centerListenersAttached) {
      const galleryEl = document.querySelector('#gallery');
      if (galleryEl) {
        let ticking = false;
        galleryEl.addEventListener('scroll', () => {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(() => {
              updateInCenter();
              ticking = false;
            });
          }
        }, { passive: true });
        window.addEventListener('resize', updateInCenter);
        centerListenersAttached = true;
      }
    }
    // run it immediately on observer init
    updateInCenter();
  }

  /* ——— SPA navigation hooks ——— */
  function onLocationChange() {
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
