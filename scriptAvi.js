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
        console.log('updateInCenter called');
        const gallery = document.querySelector('#gallery');
        if (!gallery) {
            console.log('No gallery found');
            return;
        }

        const items = Array.from(gallery.querySelectorAll('a, :scope > div > div'));
        if (!items.length) {
            console.log('No items found in gallery');
            return;
        }

        // Check if we're on mobile and in press page
        const isPress = window.location.pathname === "/press";
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        console.log('Device state:', { isPress, isMobile });

        // Force vertical mode on mobile press page
        const isHorizontal = !(isPress && isMobile) && gallery.scrollWidth > gallery.clientWidth;
        console.log('Scroll direction:', {
            isHorizontal,
            scrollWidth: gallery.scrollWidth,
            clientWidth: gallery.clientWidth,
            scrollHeight: gallery.scrollHeight,
            clientHeight: gallery.clientHeight
        });

        const gRect = gallery.getBoundingClientRect();
        const galleryMid = isHorizontal
            ? gRect.left + gRect.width / 2
            : gRect.top + gRect.height / 2;
        console.log('Gallery dimensions:', {
            rect: gRect,
            midPoint: galleryMid
        });

        let closestEl = null;
        let closestDist = Infinity;

        items.forEach((el, index) => {
            const r = el.getBoundingClientRect();
            const elMid = isHorizontal
                ? (r.left + r.width / 2)
                : (r.top + r.height / 2);

            // Calculate distance based on scroll direction
            const dist = Math.abs(elMid - galleryMid);

            // Add a small bias for items that are more visible
            const visibilityBias = isHorizontal
                ? Math.min(r.width, gRect.width) / 2
                : Math.min(r.height, gRect.height) / 2;

            const adjustedDist = dist - visibilityBias;

            console.log(`Item ${index} metrics:`, {
                element: el,
                rect: r,
                midPoint: elMid,
                distance: dist,
                bias: visibilityBias,
                adjustedDistance: adjustedDist
            });

            if (adjustedDist < closestDist) {
                closestDist = adjustedDist;
                closestEl = el;
            }
        });

        console.log('Selected element:', {
            element: closestEl,
            distance: closestDist
        });

        // Update classes
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
        console.log('initObserver called');
        initWheel();
        if (io) io.disconnect();

        const items = document.querySelectorAll("#gallery a, #gallery > div > div");
        if (!items.length) {
            console.log('No items found for observer');
            return;
        }

        // Create a new observer for center detection
        const centerObserver = new IntersectionObserver((entries) => {
            console.log('Center observer entries:', entries.length);

            // Find the entry with the highest intersection ratio
            let maxRatio = 0;
            let centerEntry = null;

            entries.forEach(entry => {
                console.log('Entry ratio:', entry.intersectionRatio);
                if (entry.intersectionRatio > maxRatio) {
                    maxRatio = entry.intersectionRatio;
                    centerEntry = entry;
                }
            });

            // Update center class
            items.forEach(el => {
                el.classList.toggle('in-center', el === centerEntry?.target);
            });
        }, {
            root: document.querySelector('#gallery'),
            threshold: [0, 0.25, 0.5, 0.75, 1],
            rootMargin: '-45% 0px -45% 0px'
        });

        // Observe all items for center detection
        items.forEach(el => centerObserver.observe(el));

        // Original observer for category updates
        io = new IntersectionObserver((entries) => {
            console.log('Category observer callback:', entries.length, 'entries');
            entries.forEach(entry => {
                console.log('Entry:', entry);
                if (!entry.isIntersecting) return;
                console.log('Entry is intersecting');

                const el = entry.target;
                const img = el.querySelector("img");
                console.log('El:', el);
                if (!img) return;
                console.log('Img:', img);

                const catRaw = img.alt || "";
                console.log('CatRaw:', catRaw);
                if (!catRaw) return;
                const cat = catRaw.trim();
                const catKey = cat.toLowerCase();
                console.log('CatKey:', catKey);

                const span = document.querySelector("#main-title .framer-text span");
                console.log('Span:', span);
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

        // Remove the old scroll-based center detection
        if (centerListenersAttached) {
            const galleryEl = document.querySelector('#gallery');
            if (galleryEl) {
                galleryEl.removeEventListener('scroll', updateInCenter);
                window.removeEventListener('resize', updateInCenter);
            }
        }
        centerListenersAttached = true;
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
        centerListenersAttached = false;
        jumpListenersAttached = false;
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
