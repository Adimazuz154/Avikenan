(function () {
    // State variables
    let io;
    let wheelHandler = null;
    let autoScrollTimer = null;
    let currentThumbId = null;
    let centerListenersAttached = false;
    let jumpListenersAttached = false;

    // Constants
    const thumbMap = {
        "bronze": "bronze-cat",
        "painted": "painted-cat",
        "monumental": "monumental-cat",
        "photography": "photography-cat",
        "conceptual": "conceptual-cat",
        "jewelry": "jewelry-cat"
    };

    // Helper Functions
    function offsetWithin(container, element, axis = "y") {
        let off = 0;
        let el = element;
        while (el && el !== container) {
            off += axis === "y" ? el.offsetTop : el.offsetLeft;
            el = el.offsetParent;
        }
        return off;
    }

    function updateInCenter() {
        const gallery = document.querySelector('#gallery');
        if (!gallery) return;

        const items = Array.from(gallery.querySelectorAll('a, :scope > div > div'));
        if (!items.length) return;

        const isHorizontal = gallery.scrollWidth > gallery.clientWidth;
        const gRect = gallery.getBoundingClientRect();
        const galleryMid = isHorizontal
            ? gRect.left + gRect.width / 2
            : gRect.top + gRect.height / 2;

        let closestEl = null;
        let closestDist = Infinity;

        items.forEach(el => {
            const r = el.getBoundingClientRect();
            const elMid = isHorizontal
                ? (r.left + r.width / 2)
                : (r.top + r.height / 2);

            const dist = Math.abs(elMid - galleryMid);
            if (dist < closestDist) {
                closestDist = dist;
                closestEl = el;
            }
        });

        items.forEach(el => {
            el.classList.toggle('in-center', el === closestEl);
        });
    }

    // Gallery Functions
    function initWheel() {
        const allowOnPages = ['/', '/press'];
        if (wheelHandler) {
            window.removeEventListener('wheel', wheelHandler, { passive: false });
            wheelHandler = null;
        }
        if (!allowOnPages.includes(window.location.pathname)) return;

        const gallery = document.querySelector("#gallery");
        if (!gallery) return;

        wheelHandler = function (e) {
            if (e.deltaY === 0) return;
            const r = gallery.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return;
            gallery.scrollTop += e.deltaY;
            e.preventDefault();
        };
        window.addEventListener('wheel', wheelHandler, { passive: false });
    }

    function startAutoScroll() {
        const gallery = document.querySelector("#gallery");
        if (!gallery || autoScrollTimer) return;

        const pixelsPerFrame = 1;
        const frameDuration = 20;

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

    function initAutoScroll() {
        const gallery = document.querySelector("#gallery");
        if (!gallery) return;

        const isPress = window.location.pathname === "/press";
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        if (isPress && isMobile) {
            gallery.style.overflowX = "hidden";
            gallery.style.overflowY = "auto";
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

    function initObserver() {
        initWheel();
        if (io) io.disconnect();

        const items = document.querySelectorAll("#gallery a, #gallery > div > div");
        if (!items.length) return;

        io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const el = entry.target;
                const img = el.querySelector("img");
                if (!img) return;

                const catRaw = img.alt || "";
                if (!catRaw) return;
                const cat = catRaw.trim();
                const catKey = cat.toLowerCase();

                const span = document.querySelector("#main-title .framer-text span");
                if (span) {
                    const parts = cat.split(" ");
                    span.innerHTML = parts.length === 1
                        ? parts[0]
                        : parts[0] + "<br>" + parts.slice(1).join(" ");
                }

                const thumbId = thumbMap[catKey];
                if (thumbId) {
                    if (currentThumbId && currentThumbId !== thumbId) {
                        document.getElementById(currentThumbId)?.classList.remove("selected");
                    }
                    document.getElementById(thumbId)?.classList.add("selected");
                    currentThumbId = thumbId;
                }
            });
        }, {
            root: null,
            rootMargin: "-50% 0px -50% 0px",
            threshold: 0
        });

        items.forEach(el => io.observe(el));
        initAutoScroll();

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
        updateInCenter();
    }

    function attachThumbnailJumps() {
        const gallery = document.querySelector('#gallery');
        if (!gallery) return;

        document.querySelectorAll('[id$="-cat"]').forEach(thumb => {
            const thumbImg = thumb.querySelector('img') || thumb;
            const cat = (thumbImg.alt || thumb.id)
                .replace(/-cat$/, '')
                .trim()
                .toLowerCase();

            thumbImg.style.cursor = 'pointer';
            thumbImg.addEventListener('click', (e) => {
                stopAutoScroll();

                const img = gallery.querySelector(`img[alt="${cat}"]`);
                if (!img) return;
                const wrapper = img.closest('a, div') || img;

                const isVertical = gallery.scrollHeight > gallery.clientHeight + 10;

                wrapper.scrollIntoView({
                    behavior: 'smooth',
                    block: isVertical ? 'center' : 'nearest',
                    inline: isVertical ? 'nearest' : 'center'
                });

                const resume = () => startAutoScroll();
                if ('onscrollend' in document) {
                    gallery.addEventListener('scrollend', resume, { once: true });
                } else {
                    setTimeout(resume, 1500);
                }
            });
        });
    }

    // Main initialization function
    function initPage() {
        initObserver();
        attachThumbnailJumps();
    }

    // Location change handling
    function onLocationChange() {
        console.log("onLocationChange");
        setTimeout(initPage, 50);
    }

    // History API overrides
    const _push = history.pushState;
    history.pushState = function () {
        _push.apply(this, arguments);
        window.dispatchEvent(new Event("locationchange"));
    };

    const _replace = history.replaceState;
    history.replaceState = function () {
        _replace.apply(this, arguments);
        window.dispatchEvent(new Event("locationchange"));
    };

    // Event listeners
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("locationchange", onLocationChange);
    document.addEventListener("DOMContentLoaded", initPage);

})();
