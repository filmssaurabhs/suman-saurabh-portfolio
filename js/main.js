/**
 * SUMAN SAURABH — EDITOR / FILMMAKER
 * Core Interaction, Cinematic Video Modal, Stills Lightbox & Notebook Timeline
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initVideoPreviews();
  initCinematicModal();
  initStillsLightbox();
  initSmoothScroll();
  initNotebookTimeline();
});

/**
 * Header Scroll & Mobile Navigation
 */
function initHeader() {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Lightweight Looping Video Previews (Autoplay, Muted, Continuous Middle Excerpts)
 */
function initVideoPreviews() {
  const previewVideos = document.querySelectorAll('.preview-video');

  previewVideos.forEach(video => {
    const previewStart = parseFloat(video.dataset.previewStart || '4');
    const previewDuration = parseFloat(video.dataset.previewDuration || '5');
    const previewEnd = previewStart + previewDuration;

    video.muted = true;
    video.playsInline = true;

    const setPreviewTime = () => {
      try {
        video.currentTime = previewStart;
      } catch (e) {}
    };

    if (video.readyState >= 1) {
      setPreviewTime();
    } else {
      video.addEventListener('loadedmetadata', setPreviewTime, { once: true });
      video.addEventListener('canplay', setPreviewTime, { once: true });
    }

    // Loop snippet continuously within configured range
    video.addEventListener('timeupdate', () => {
      if (video.currentTime >= previewEnd || video.currentTime < previewStart) {
        video.currentTime = previewStart;
      }
    });

    // Handle container hover play/pause
    const container = video.closest('.video-preview-container') || 
                      video.closest('.digital-preview-wrap') ||
                      video.closest('.selected-showreel-unit');
    if (container) {
      container.addEventListener('mouseenter', () => {
        if (video.currentTime < previewStart || video.currentTime >= previewEnd) {
          try { video.currentTime = previewStart; } catch (e) {}
        }
        video.play().catch(() => {});
      });

      container.addEventListener('mouseleave', () => {
        // Keep selected showreel and viewport visible videos gently playing or pausing
        if (!video.classList.contains('showreel-unit-video')) {
          video.pause();
          try { video.currentTime = previewStart; } catch (e) {}
        }
      });
    }
  });

  // IntersectionObserver to auto-play previews subtly on mobile/desktop
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        const previewStart = parseFloat(video.dataset.previewStart || '4');
        const previewDuration = parseFloat(video.dataset.previewDuration || '5');
        const previewEnd = previewStart + previewDuration;

        if (entry.isIntersecting) {
          if (video.currentTime < previewStart || video.currentTime >= previewEnd) {
            try { video.currentTime = previewStart; } catch (e) {}
          }
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.2 });

    previewVideos.forEach(video => observer.observe(video));
  }
}

/**
 * Cinematic Fullscreen Modal Video Player
 * When triggered from showreel, plays the COMPLETE 01:49 showreel from 00:00
 */
function initCinematicModal() {
  const modal = document.getElementById('cinematicModal');
  if (!modal) return;

  const modalVideo = modal.querySelector('.modal-video-element');
  const modalViewport = modal.querySelector('.modal-video-viewport');
  const modalTitle = modal.querySelector('.modal-project-title');
  const modalMeta = modal.querySelector('.modal-project-meta');
  const closeBtn = modal.querySelector('.modal-close-btn');

  // Open modal on click of any trigger
  const triggers = document.querySelectorAll('[data-action="open-modal"]');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const videoSrc = trigger.dataset.videoSrc;
      const title = trigger.dataset.projectTitle || 'Project Film';
      const meta = trigger.dataset.projectMeta || '';
      const aspect = trigger.dataset.aspect || '16-9';

      openModal(videoSrc, title, meta, aspect);
    });
  });

  function openModal(src, title, meta, aspect) {
    if (!src) return;

    if (aspect === '9-16') {
      modalViewport.classList.remove('aspect-16-9');
      modalViewport.classList.add('aspect-9-16');
    } else {
      modalViewport.classList.remove('aspect-9-16');
      modalViewport.classList.add('aspect-16-9');
    }

    modalTitle.textContent = title;
    modalMeta.textContent = meta;

    modalVideo.src = encodeURI(src);
    modalVideo.muted = false;
    modalVideo.controls = true;
    modalVideo.currentTime = 0; // Play complete video from the beginning

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Pause all background preview videos while modal is open
    document.querySelectorAll('.preview-video').forEach(v => v.pause());

    modalVideo.play().catch(err => {
      console.warn('Auto-playback blocked, user interaction required:', err);
    });
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();

    // Resume looping previews in viewport
    document.querySelectorAll('.preview-video').forEach(v => {
      v.play().catch(() => {});
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('cinematic-modal')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

/**
 * Stills Cinematic Lightbox Viewer (Requirements 5 & 6)
 * Enables click-to-enlarge, lower integrated caption, prev/next arrows, keyboard & touch swipe navigation
 */
function initStillsLightbox() {
  const lightbox = document.getElementById('stillsLightbox');
  if (!lightbox) return;

  const closeBtn = document.getElementById('lightboxCloseBtn');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxMeta = document.getElementById('lightboxMeta');
  const lightboxNote = document.getElementById('lightboxNote');
  const lightboxCounter = document.getElementById('lightboxCounter');

  const stillCards = Array.from(document.querySelectorAll('.still-card'));
  if (!stillCards.length) return;

  const stillsData = stillCards.map(card => {
    const img = card.querySelector('img');
    return {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      title: img.dataset.captionTitle || card.querySelector('.still-label')?.textContent || 'Still',
      context: img.dataset.captionContext || card.querySelector('.still-location')?.textContent || '',
      note: img.dataset.captionNote || ''
    };
  });

  let currentIndex = 0;
  const total = stillsData.length;

  function showStill(index) {
    currentIndex = (index + total) % total;
    const item = stillsData[currentIndex];

    // Subtly fade transition between stills
    lightboxImg.classList.add('fade-out');

    setTimeout(() => {
      lightboxImg.src = item.src;
      lightboxImg.alt = item.alt;
      lightboxTitle.textContent = item.title;
      lightboxMeta.textContent = item.context;
      lightboxNote.textContent = item.note;
      lightboxCounter.textContent = `${currentIndex + 1} / ${total}`;

      const removeFade = () => lightboxImg.classList.remove('fade-out');
      if (lightboxImg.complete) {
        removeFade();
      } else {
        lightboxImg.onload = removeFade;
      }
    }, 120);
  }

  function openLightbox(index) {
    showStill(index);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Click card to open
  stillCards.forEach((card, idx) => {
    card.addEventListener('click', () => openLightbox(idx));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(idx);
      }
    });
  });

  // Controls
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => showStill(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showStill(currentIndex + 1));

  // Backdrop click dismiss
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-viewport')) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      showStill(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      showStill(currentIndex + 1);
    }
  });

  // Touch Swipe Navigation (Mobile)
  let touchStartX = 0;
  let touchStartY = 0;

  lightbox.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      // Horizontal swipe threshold
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          showStill(currentIndex + 1); // Swiped left -> next
        } else {
          showStill(currentIndex - 1); // Swiped right -> prev
        }
      }
    }
  }, { passive: true });
}

/**
 * Smooth Scroll & Active Nav Highlighting
 */
function initSmoothScroll() {
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (!('IntersectionObserver' in window)) return;

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(sec => sectionObserver.observe(sec));
}

/**
 * Horizontal Notebook Timeline Animation (Requirement 6)
 */
function initNotebookTimeline() {
  const timeline = document.getElementById('notebookTimeline');
  if (!timeline) return;

  const milestones = timeline.querySelectorAll('.journey-step, .trajectory-item, .notebook-milestone');
  if (!milestones.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          milestones.forEach((m, idx) => {
            setTimeout(() => {
              m.classList.add('in-view');
            }, idx * 100);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(timeline);
  }
}
