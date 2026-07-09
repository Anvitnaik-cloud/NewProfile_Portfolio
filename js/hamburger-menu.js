/**
 * GSAP Animated Hamburger Menu
 * Exact replica of the reference GSAP hamburger menu
 * Uses GSAP timeline with expo.out and back.out easing
 */

(function initHamburgerMenu() {
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const navOverlay = document.getElementById('nav-overlay');
  const menuLinks = document.querySelectorAll('[data-menu-link]');
  const htmlEl = document.documentElement;

  if (!hamburgerMenu || !navOverlay) return;

  let isOpen = false;

  // Read the translation amount dynamically from CSS variables (e.g., 4.3px on mobile, 5.5px on desktop)
  const style = window.getComputedStyle(hamburgerMenu);
  const translateY = parseFloat(style.getPropertyValue('--hamburger-y')) || 5.5;

  // Build the GSAP timeline (paused) — matches reference exactly
  const tl = gsap.timeline({ paused: true });

  // Top line: rotate 45° and move down
  tl.to('#top-line', {
    rotate: 45,
    y: translateY,
    duration: 1,
    ease: 'expo.out'
  }, 0); // Starts immediately on click

  // Bottom line: rotate -45° and move up
  tl.to('#bottom-line', {
    rotate: -45,
    y: -translateY,
    duration: 1,
    ease: 'expo.out'
  }, '<'); // Starts with previous animation

  // Nav overlay: slide in from right to left
  tl.to('#nav-overlay', {
    x: '0%',   // Goes from translateX(100%) to 0%
    duration: 1,
    ease: 'expo.out'
  }, '<');

  // Links section: slide in from right with bounce
  tl.from('#links-section', {
    x: 100,
    autoAlpha: 0,
    duration: 1,
    ease: 'back.out'
  }, '<0.3'); // Starts 0.3s after previous

  // Contacts section: slide in from left
  tl.from('#contacts-section', {
    x: -50,
    autoAlpha: 0,
    duration: 1,
    ease: 'back.out'
  }, '<0.3');

  // Toggle on click
  hamburgerMenu.addEventListener('click', () => {
    if (isOpen) {
      tl.reverse(); // Plays animations in reverse when closing
      document.body.classList.remove('menu-open');
      navOverlay.setAttribute('aria-hidden', 'true');
      htmlEl.style.scrollSnapType = '';
    } else {
      tl.play(0); // Plays animations from the start
      document.body.classList.add('menu-open');
      navOverlay.setAttribute('aria-hidden', 'false');
      htmlEl.style.scrollSnapType = 'none';
    }
    isOpen = !isOpen;
  });

  // Keyboard accessibility (Enter / Space)
  hamburgerMenu.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hamburgerMenu.click();
    }
  });

  // Close menu when a nav link is clicked, then scroll to section
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (!isOpen) return;

      e.preventDefault();
      const targetId = link.getAttribute('href');

      // Close menu
      tl.reverse();
      document.body.classList.remove('menu-open');
      navOverlay.setAttribute('aria-hidden', 'true');
      htmlEl.style.scrollSnapType = '';
      isOpen = false;

      // Scroll to section after menu close animation finishes
      setTimeout(() => {
        const target = document.querySelector(targetId);
        if (target && typeof window.gotoSection === 'function') {
          window.gotoSection(target);
        } else if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 800);
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      hamburgerMenu.click();
    }
  });
})();
