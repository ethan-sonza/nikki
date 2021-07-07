function lazyLoad(node, src) {
    if (IntersectionObserver) {
        const observer = new IntersectionObserver(onIntersect, {
            // If the image gets within 50px in the Y axis, start the download.
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        function onIntersect(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    node.setAttribute('src', src);
                }
            });
        }

        observer.observe(node);
        return {
            destroy() {
                observer && observer.unobserve(node);
            }
        };
    } else {
        // fallback
        let lazyLoadThrottleTimeout = undefined;

        function polyfillLazyLoad() {
            if (lazyLoadThrottleTimeout) {
                clearTimeout(lazyLoadThrottleTimeout);
            }

            lazyLoadThrottleTimeout = setTimeout(function () {
                var scrollTop = window.pageYOffset;
                if (node.offsetTop < window.innerHeight + scrollTop) {
                    node.setAttribute('src', src);
                }
            }, 20);
        }
        document.addEventListener('scroll', polyfillLazyLoad);
        window.addEventListener('resize', polyfillLazyLoad);
        window.addEventListener('orientationChange', polyfillLazyLoad);
        return {
            destroy() {
                document.removeEventListener('scroll', polyfillLazyLoad);
                window.removeEventListener('resize', polyfillLazyLoad);
                window.removeEventListener('orientationChange', polyfillLazyLoad);
            }
        };
    }
}

export default lazyLoad;
