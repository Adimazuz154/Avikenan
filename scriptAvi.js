(function() {
  let io;
  let wheelHandler = null;
  let autoScrollTimer = null;
  let currentThumbId = null;
  let centerListenersAttached = false;
  let jumpListenersAttached = false;

  // map gallery href → thumbnail ID
  const thumbMap = {
    "bronze":      "bronze-cat",
    "painted": "painted-cat",
    "monumental":         "monumental-cat",
    "photography":      "photography-cat",
    "conceptual":       "conceptual-cat",
    "jewelry":  "jewelry-cat"
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

    const isPress = window.location.pathname === "/press";
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isPress && isMobile) {
      // force normal vertical scrolling
      gallery.style.overflowX = "hidden";
      gallery.style.overflowY = "auto";
      // make sure any running ticker is stopped
      stopAutoScroll();
      return;
  }

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

  // grab all your <a> links AND the inner two-level div wrappers
  const items = Array.from(
    gallery.querySelectorAll('a, :scope > div > div')
  );
  if (!items.length) return;

  // decide whether this gallery scrolls horizontally or vertically
  const isHorizontal = gallery.scrollWidth > gallery.clientWidth;

  // find the gallery’s own center line
  const gRect      = gallery.getBoundingClientRect();
  const galleryMid = isHorizontal
    ? gRect.left   + gRect.width  / 2   // x-axis center
    : gRect.top    + gRect.height / 2;  // y-axis center

  let closestEl   = null;
  let closestDist = Infinity;

  items.forEach(el => {
    const r = el.getBoundingClientRect();
    // find each item’s center on the same axis
    const elMid = isHorizontal
      ? (r.left + r.width  / 2)
      : (r.top  + r.height / 2);

    const dist = Math.abs(elMid - galleryMid);
    if (dist < closestDist) {
      closestDist = dist;
      closestEl   = el;
    }
  });

  // only that one element gets .in-center
  items.forEach(el => {
    el.classList.toggle('in-center', el === closestEl);
  });
}

  /* ── helper: distance from element to #gallery on the chosen axis ── */
  function offsetWithin(container, element, axis = "y") {
  let off = 0;
  let el  = element;
  while (el && el !== container) {
    off += axis === "y" ? el.offsetTop : el.offsetLeft;
    el   = el.offsetParent;          // walk up until we reach #gallery
  }
  return off;
}
  /* ——— intersection‐observer for title & thumbnails only ——— */
  function initObserver() {
    initWheel();
    if (io) io.disconnect();

    const items = document.querySelectorAll("#gallery a, #gallery > div > div");
    if (!items.length) return;

    io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
    if (!entry.isIntersecting) return;        // ignore off-screen items

    const el  = entry.target;
    const img = el.querySelector("img");
    if (!img)   return;

    /* ------------- get the category from <img alt="…"> ------------- */
    const catRaw = img.alt || "";             // whatever you typed in Alt
    if (!catRaw) return;
    const cat    = catRaw.trim();             // e.g. "Bronze"
    const catKey = cat.toLowerCase();         // "bronze"

    /* ========== 1) update the main title ========== */
    const span = document.querySelector("#main-title .framer-text span");
    if (span) {
      const parts = cat.split(" ");
      span.innerHTML = parts.length === 1
        ? parts[0]                                   // one-word category
        : parts[0] + "<br>" + parts.slice(1).join(" "); // two+ words stacked
    }

    /* ========== 2) highlight the small thumbnail ========== */
    const thumbId = thumbMap[catKey];
    if (thumbId) {
      if (currentThumbId && currentThumbId !== thumbId) {
        document.getElementById(currentThumbId)
                ?.classList.remove("selected");
      }
      document.getElementById(thumbId)
              ?.classList.add("selected");
      currentThumbId = thumbId;
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
    console.log("onLocationChange");
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

  (function attachThumbnailJumps() {
  const gallery = document.querySelector('#gallery');
  if (!gallery) return;

  document.querySelectorAll('[id$="-cat"]').forEach(thumb => {
    console.log(thumb);
    /* use the image that fills the square */
    const thumbImg = thumb.querySelector('img') || thumb;
    console.log(thumbImg);

    const cat = (thumbImg.alt || thumb.id)
       .replace(/-cat$/,'')
       .trim()
       .toLowerCase();

       console.log (cat);

        thumbImg.style.cursor = 'pointer';
        thumbImg.addEventListener('click', (e) => {
          console.log("click", e.target, cat, gallery.querySelector(`img[alt="${cat}"]`));
          /* ① pause the auto-scroll ticker */
          stopAutoScroll();

          /* ② find the first gallery image with this category */
          const img = gallery.querySelector(`img[alt="${cat}"]`);
          if (!img) return;
          const wrapper = img.closest('a, div') || img;

          /* ③ decide orientation and centre the item on that axis */
          const isVertical = gallery.scrollHeight > gallery.clientHeight + 10;

          console.log(
            `▶ thumb '${cat}' — smooth-centre (${isVertical ? 'vertical' : 'horizontal'})`
          );

          wrapper.scrollIntoView({
            behavior: 'smooth',
            block:  isVertical ? 'center'  : 'nearest',  // centre vertically
            inline: isVertical ? 'nearest' : 'center'    // centre horizontally
          });

          /* ④ resume the ticker after the glide */
          const resume = () => startAutoScroll();
          if ('onscrollend' in document) {
            gallery.addEventListener('scrollend', resume, { once: true });
          } else {
            setTimeout(resume, 1500);          // fallback if scrollend unsupported
          }
        });
            });
})();

})();
