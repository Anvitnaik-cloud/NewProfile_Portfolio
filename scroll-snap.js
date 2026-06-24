/**
 * GSAP Observer Fullscreen Transitions & SplitText Reveal System
 * Replicates the reference project's scrolling, masking, parallax, and stagger reveals.
 */

// 1. Safe Fallback for SplitText (if S3/CDN fails to load or is blocked)
if (typeof SplitText === 'undefined') {
  window.SplitText = class {
    constructor(element) {
      this.elements = [element];
      const text = element.textContent.trim();
      element.innerHTML = '';
      this.chars = [...text].map(char => {
        const span = document.createElement('span');
        if (char === ' ') {
          span.innerHTML = '&nbsp;';
        } else {
          span.textContent = char;
        }
        span.style.display = 'inline-block';
        element.appendChild(span);
        return span;
      });
    }
    revert() {
      if (this.elements && this.elements[0]) {
        this.elements[0].textContent = this.chars.map(c => c.textContent).join('');
      }
    }
  };
}

// 2. Safe Fallback check for GSAP and Observer
if (typeof gsap === 'undefined' || typeof Observer === 'undefined') {
  console.warn("GSAP or GSAP Observer is missing. Fullscreen transitions disabled.");
  // Site falls back to native scroll naturally because transitions-enabled class is never added.
} else {
  // Register Observer Plugin
  gsap.registerPlugin(Observer);

  // Enable fullscreen transitions layout styles
  document.body.classList.add('transitions-enabled');
  document.documentElement.classList.add('transitions-enabled');

  // Select all content sections
  const sections = gsap.utils.toArray("main section");

  // Wrap each section's contents in .outer -> .inner -> .bg to support masking transition
  sections.forEach(section => {
    const outer = document.createElement("div");
    outer.className = "outer";
    const inner = document.createElement("div");
    inner.className = "inner";
    const bg = document.createElement("div");
    bg.className = "bg";

    // Move all original children into the .bg wrapper
    while (section.firstChild) {
      bg.appendChild(section.firstChild);
    }

    inner.appendChild(bg);
    outer.appendChild(inner);
    section.appendChild(outer);
  });

  // Cache wrappers and backgrounds
  const outerWrappers = sections.map(sec => sec.querySelector(".outer"));
  const innerWrappers = sections.map(sec => sec.querySelector(".inner"));
  const bgs = sections.map(sec => sec.querySelector(".bg"));

  // Setup SplitText heading reveals on section entry
  const sectionHeadings = sections.map(section => {
    const titleLines = section.querySelectorAll(".hero-title, .section-title .title-line");
    if (titleLines.length > 0) {
      const splits = Array.from(titleLines).map(line => new SplitText(line, {
        type: "chars,words,lines",
        linesClass: "clip-text"
      }));
      return {
        chars: splits.flatMap(s => s.chars || []),
        revert: () => splits.forEach(s => s.revert())
      };
    } else {
      const heading = section.querySelector(".hero-title, .section-title");
      if (heading) {
        return new SplitText(heading, { 
          type: "chars,words,lines", 
          linesClass: "clip-text" 
        });
      }
    }
    return null;
  });

  // Re-split on window resize to ensure responsiveness is preserved
  window.addEventListener("resize", () => {
    sectionHeadings.forEach((split, index) => {
      if (split) {
        split.revert();
        const section = sections[index];
        const titleLines = section.querySelectorAll(".hero-title, .section-title .title-line");
        if (titleLines.length > 0) {
          const splits = Array.from(titleLines).map(line => new SplitText(line, {
            type: "chars,words,lines",
            linesClass: "clip-text"
          }));
          sectionHeadings[index] = {
            chars: splits.flatMap(s => s.chars || []),
            revert: () => splits.forEach(s => s.revert())
          };
        } else {
          const heading = section.querySelector(".hero-title, .section-title");
          if (heading) {
            sectionHeadings[index] = new SplitText(heading, { 
              type: "chars,words,lines", 
              linesClass: "clip-text" 
            });
          }
        }
      }
    });
  });

  // Set initial states
  let currentIndex = -1;
  let animating = false;
  const wrap = gsap.utils.wrap(0, sections.length);

  gsap.set(outerWrappers, { yPercent: 100 });
  gsap.set(innerWrappers, { yPercent: -100 });

  // Primary transition function
  function gotoSection(index, direction) {
    index = wrap(index); // Validate index
    animating = true;
    
    const fromTop = direction === -1;
    const dFactor = fromTop ? -1 : 1;
    
    const tl = gsap.timeline({
      defaults: { duration: 1.25, ease: "power1.inOut" },
      onComplete: () => {
        animating = false;
      }
    });

    // Handle current section exit
    if (currentIndex >= 0) {
      gsap.set(sections[currentIndex], { zIndex: 0 });
      tl.to(bgs[currentIndex], { yPercent: -15 * dFactor })
        .set(sections[currentIndex], { autoAlpha: 0 });
    }

    // Handle next section entry
    gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
    
    tl.fromTo([outerWrappers[index], innerWrappers[index]], { 
        yPercent: i => i ? -100 * dFactor : 100 * dFactor
      }, { 
        yPercent: 0 
      }, 0)
      .fromTo(bgs[index], { yPercent: 15 * dFactor }, { yPercent: 0 }, 0);

    // Character reveal on section heading
    const splitH = sectionHeadings[index];
    if (splitH && splitH.chars) {
      tl.fromTo(splitH.chars, { 
          autoAlpha: 0, 
          yPercent: 150 * dFactor
      }, {
          autoAlpha: 1,
          yPercent: 0,
          duration: 1,
          ease: "power2",
          stagger: {
            each: 0.02,
            from: "random"
          }
      }, 0.2);
    }

    // Slide up and fade in sub-contents (paragraphs, pills, cards, links, timelines)
    const subElements = sections[index].querySelectorAll(
      '.fade-in-up, .fade-in-down, .fade-in, .slide-in-left, .slide-in-right, .skills-grid .card, .project-card, .timeline-item, .cert-card, .link-card, .contact-layout .card, .contact-card'
    );
    if (subElements.length > 0) {
      tl.fromTo(subElements, {
        autoAlpha: 0,
        y: 20
      }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.06
      }, 0.3);
    }

    currentIndex = index;
    updateBackToTop();
  }

  // Expose globally for menu hook integration
  window.gotoSection = function(target) {
    let targetIndex = -1;
    if (typeof target === 'number') {
      targetIndex = target;
    } else if (target instanceof Element) {
      targetIndex = sections.indexOf(target);
    }

    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      const direction = targetIndex > currentIndex ? 1 : -1;
      gotoSection(targetIndex, direction);
    }
  };

  // Intelligent scroll boundary detection
  let boundaryTime = 0;
  let lastBoundary = null;

  function handleScrollUpDown(direction) {
    if (animating) return;
    const activeBg = bgs[currentIndex];
    if (!activeBg) return;

    const isScrollable = activeBg.scrollHeight > activeBg.clientHeight + 5;
    if (!isScrollable) {
      gotoSection(direction === 1 ? currentIndex + 1 : currentIndex - 1, direction);
      return;
    }

    const isAtTop = activeBg.scrollTop <= 5;
    const isAtBottom = activeBg.scrollTop + activeBg.clientHeight >= activeBg.scrollHeight - 5;
    const now = Date.now();

    if (direction === -1) { // User scrolling up
      if (isAtTop) {
        if (lastBoundary !== 'top') {
          lastBoundary = 'top';
          boundaryTime = now;
          return;
        }
        if (now - boundaryTime > 150) {
          gotoSection(currentIndex - 1, -1);
        }
      } else {
        lastBoundary = null;
      }
    } else if (direction === 1) { // User scrolling down
      if (isAtBottom) {
        if (lastBoundary !== 'bottom') {
          lastBoundary = 'bottom';
          boundaryTime = now;
          return;
        }
        if (now - boundaryTime > 150) {
          gotoSection(currentIndex + 1, 1);
        }
      } else {
        lastBoundary = null;
      }
    }
  }

  // GSAP Observer Initialization
  Observer.create({
    type: "wheel,touch,pointer",
    wheelSpeed: -1,
    onDown: () => handleScrollUpDown(-1), // Scroll up gesture
    onUp: () => handleScrollUpDown(1),    // Scroll down gesture
    tolerance: 10,
    preventDefault: false
  });

  // Keyboard Navigation Hook
  document.addEventListener("keydown", (e) => {
    if (animating) return;

    // Ignore navigation if user is typing in forms
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      handleScrollUpDown(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      handleScrollUpDown(-1);
    } else if (e.key === "Spacebar" || e.key === " ") {
      e.preventDefault();
      handleScrollUpDown(e.shiftKey ? -1 : 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      window.gotoSection(0);
    } else if (e.key === "End") {
      e.preventDefault();
      window.gotoSection(sections.length - 1);
    }
  });

  // Intercept hash links (Logo, View Projects, contact buttons)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"], button[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    let target = null;
    if (href === '#top' || href === '#') {
      target = sections[0];
    } else {
      target = document.querySelector(href);
    }

    if (target && sections.includes(target)) {
      e.preventDefault();
      window.gotoSection(target);
    }
  });

  // Back to Top Button Control
  function updateBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      if (currentIndex > 0) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
  }

  // Setup custom back-to-top click handler
  const backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    const newBtn = backToTopBtn.cloneNode(true);
    backToTopBtn.parentNode.replaceChild(newBtn, backToTopBtn);
    newBtn.addEventListener('click', () => {
      window.gotoSection(0);
    });
  }

  // Start the animation system after the loader finishes
  function init() {
    if (document.body.classList.contains('loaded')) {
      if (currentIndex === -1) gotoSection(0, 1);
    } else {
      window.addEventListener('loaderComplete', () => {
        if (currentIndex === -1) gotoSection(0, 1);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
