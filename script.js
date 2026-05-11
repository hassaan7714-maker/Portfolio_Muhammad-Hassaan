const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const usesCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isSmallViewport = window.matchMedia('(max-width: 767px)').matches;
const lowCoreDevice = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
const saveDataEnabled = Boolean(connection && connection.saveData);
const perfLiteMode = prefersReducedMotion || saveDataEnabled || (lowCoreDevice && (usesCoarsePointer || isSmallViewport));
const enableThreeBackground = !prefersReducedMotion && !saveDataEnabled && !(usesCoarsePointer && isSmallViewport);
const enableTypingAnimation = !prefersReducedMotion && !perfLiteMode;

document.documentElement.classList.toggle('perf-lite', perfLiteMode);

function initTilt(scope = document) {
    if (typeof VanillaTilt === 'undefined' || prefersReducedMotion || usesCoarsePointer || window.innerWidth < 1024) {
        return;
    }

    scope.querySelectorAll('.tilt-card').forEach((card) => {
        if (card.dataset.tiltReady === 'true') return;

        VanillaTilt.init(card, {
            max: perfLiteMode ? 2 : 3,
            speed: perfLiteMode ? 250 : 300,
            glare: false,
            'max-glare': 0
        });

        card.dataset.tiltReady = 'true';
    });
}

function showIntroBubble() {
    const bubble = document.getElementById('robot-bubble');
    const textEl = document.getElementById('robot-bubble-text');
    const message = "Hi, I'm Hassaan!";

    if (!bubble || !textEl) return;

    bubble.classList.add('is-visible');

    if (!enableTypingAnimation) {
        textEl.textContent = message;
        setTimeout(() => bubble.classList.remove('is-visible'), 2200);
        return;
    }

    let idx = 0;
    const typeInterval = setInterval(() => {
        textEl.textContent += message[idx++];
        if (idx >= message.length) {
            clearInterval(typeInterval);
            setTimeout(() => {
                bubble.classList.remove('is-visible');
            }, 3000);
        }
    }, 60);
}

// --- 1. PRELOADER ---
(function initPreloader() {
    const bar = document.getElementById('loader-bar');
    const preloader = document.getElementById('preloader');
    if (!bar || !preloader) return;

    const start = () => {
        bar.style.width = '100%';

        setTimeout(() => {
            preloader.style.opacity = '0';

            setTimeout(() => {
                preloader.style.display = 'none';
                showIntroBubble();
            }, perfLiteMode ? 180 : 320);
        }, perfLiteMode ? 120 : 260);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
        return;
    }

    start();
})();

// --- 2. PREMIUM THREE.JS BACKGROUND (Flowing Cyber Terrain) ---
(function initThreeBackground() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    if (!enableThreeBackground) {
        canvas.classList.add('three-canvas--fallback');
        return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.025);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 15);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, perfLiteMode ? 1 : 1.25));

    const segmentCount = perfLiteMode ? 16 : 22;
    const geometry = new THREE.PlaneGeometry(100, 100, segmentCount, segmentCount);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
        color: 0x4facfe,
        wireframe: true,
        transparent: true,
        opacity: perfLiteMode ? 0.12 : 0.15
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = -6;
    scene.add(plane);

    const posAttr = plane.geometry.attributes.position;
    const vertCount = posAttr.count;
    const cachedX = new Float32Array(vertCount);
    const cachedZ = new Float32Array(vertCount);

    for (let i = 0; i < vertCount; i++) {
        cachedX[i] = posAttr.getX(i);
        cachedZ[i] = posAttr.getZ(i);
    }

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let lastFrame = 0;
    const frameInterval = perfLiteMode ? 1000 / 24 : 1000 / 45;
    const clock = new THREE.Clock();

    document.addEventListener('mousemove', (event) => {
        targetMouseX = (event.clientX - window.innerWidth / 2) * 0.01;
        targetMouseY = (event.clientY - window.innerHeight / 2) * 0.01;
    }, { passive: true });

    function animate(now = 0) {
        requestAnimationFrame(animate);
        if (document.hidden) return;
        if (now - lastFrame < frameInterval) return;

        lastFrame = now;
        const time = clock.getElapsedTime();

        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;

        for (let i = 0; i < vertCount; i++) {
            posAttr.setY(i,
                Math.sin(cachedX[i] * 0.2 + time) * 1.5 +
                Math.cos(cachedZ[i] * 0.2 + time) * 1.5
            );
        }

        posAttr.needsUpdate = true;
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 2 + 5 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, -10);
        renderer.render(scene, camera);
    }

    function resizeScene() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, perfLiteMode ? 1 : 1.25));
    }

    window.addEventListener('resize', resizeScene, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            lastFrame = 0;
        }
    }, { passive: true });

    animate();
})();

// --- 3. DYNAMIC TYPING EFFECT ---
const phrases = ["Full-Stack Engineer", "Backend Architect", "Systems Designer", "Problem Solver"];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingEl = document.getElementById('typing-text');

function renderTypingText(text) {
    if (!typingEl) return;
    typingEl.innerHTML = 'Building as a <span class="text-white font-medium">' + text + '</span><span class="text-accent-400 font-bold">|</span>';
}

function typeEffect() {
    if (!typingEl) return;

    if (!enableTypingAnimation) {
        renderTypingText(phrases[0]);
        return;
    }

    const currentPhrase = phrases[phraseIndex];
    renderTypingText(currentPhrase.substring(0, isDeleting ? charIndex - 1 : charIndex + 1));
    charIndex += isDeleting ? -1 : 1;

    let typeSpeed = isDeleting ? 30 : 80;

    if (!isDeleting && charIndex === currentPhrase.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 400;
    }

    setTimeout(typeEffect, typeSpeed);
}
typeEffect();
// --- 4. GITHUB PROJECT SHOWCASE ---
const githubUser = 'hassaan7714-maker';
const repoCountEl = document.getElementById('repo-count');
const repoLanguageCountEl = document.getElementById('repo-language-count');
const repoUpdatedEl = document.getElementById('repo-updated');

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function formatRepoName(name = '') {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRepoDate(dateValue) {
    if (!dateValue) return '--';
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(dateValue));
}

function countUp(el, target, duration = 800) {
    const start = performance.now();
    const from = 0;
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(from + (target - from) * ease);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
    }
    requestAnimationFrame(step);
}

function updateProjectMetrics(repos) {
    const languages = new Set(repos.map((repo) => repo.language).filter(Boolean));
    const latestUpdate = repos[0]?.updated_at;

    countUp(repoCountEl, repos.length, 900);
    countUp(repoLanguageCountEl, languages.size || 0, 900);
    repoUpdatedEl.textContent = latestUpdate ? formatRepoDate(latestUpdate) : 'Soon';
}

function renderProjectEmptyState(container) {
    container.innerHTML = `
        <article class="project-card glass-card project-card--fallback">
            <div class="project-card__media project-card__media--fallback">
                <div class="project-card__links"><a href="https://github.com/${githubUser}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub profile"><i class="fab fa-github"></i></a></div>
            </div>
            <div class="project-card__body">
                <span class="project-card__meta">GitHub Sync</span>
                <h3>Project Preview</h3>
                <p>Projects are being prepared. Public repositories will appear here shortly.</p>
            </div>
            <div class="project-card__topics"><span>Portfolio</span><span>GitHub</span></div>
        </article>
        <article class="project-card glass-card project-card--fallback">
            <div class="project-card__media project-card__media--fallback">
                <div class="project-card__links"><a href="https://github.com/${githubUser}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub profile"><i class="fas fa-code"></i></a></div>
            </div>
            <div class="project-card__body">
                <span class="project-card__meta">Featured</span>
                <h3>New Build Incoming</h3>
                <p>Fresh work is on the way. This card will automatically update from GitHub.</p>
            </div>
            <div class="project-card__topics"><span>Web</span><span>Backend</span></div>
        </article>
        <article class="project-card glass-card project-card--fallback">
            <div class="project-card__media project-card__media--fallback">
                <div class="project-card__links"><a href="https://github.com/${githubUser}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub profile"><i class="fas fa-terminal"></i></a></div>
            </div>
            <div class="project-card__body">
                <span class="project-card__meta">In Progress</span>
                <h3>Repository Loading</h3>
                <p>Connect to GitHub to load live project details and repository stats.</p>
            </div>
            <div class="project-card__topics"><span>Systems</span><span>Engineering</span></div>
        </article>
    `;
}

function renderProjectErrorState(container) {
    renderProjectEmptyState(container);
}

function buildProjectCard(repo, index) {
    const card = document.createElement('article');
    const language = repo.language || 'Code';
    const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : [];
    const cardTags = [language, ...topics].slice(0, 4);
    const description = repo.description
        ? repo.description
        : `A ${language} project from my GitHub portfolio, built with focus on clean structure and practical implementation.`;
    const previewImage = `https://opengraph.githubassets.com/1/${repo.full_name}`;

    card.className = 'project-card glass-card tilt-card';
    card.style.transitionDelay = `${index * 90}ms`;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        // Don't double-fire if user clicked a link inside the card
        if (e.target.closest('a')) return;
        window.open(repo.html_url, '_blank', 'noopener,noreferrer');
    });
    card.innerHTML = `
        <div class="project-card__media">
            <img
                src="${previewImage}"
                alt="${escapeHtml(formatRepoName(repo.name))} preview"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                referrerpolicy="no-referrer"
                onerror="this.style.display='none'; this.closest('.project-card__media').classList.add('project-card__media--fallback');"
            />
            <div class="project-card__sphere"></div>
            <span class="project-card__badge">Featured</span>
            <div class="project-card__links" aria-label="${escapeHtml(repo.name)} project links">
                ${repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer" aria-label="Open live project"><i class="fas fa-external-link-alt"></i></a>` : ''}
                <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub repository"><i class="fab fa-github"></i></a>
            </div>
        </div>

        <div class="project-card__body">
            <h3>${escapeHtml(formatRepoName(repo.name))}</h3>
            <p>${escapeHtml(description)}</p>
            <span class="project-card__meta">Updated ${formatRepoDate(repo.updated_at)}</span>
        </div>

        <div class="project-card__topics">
            ${cardTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
    `;

    return card;
}

let hasLoadedGitHubRepos = false;

async function fetchGitHubRepos() {
    if (hasLoadedGitHubRepos) return;
    hasLoadedGitHubRepos = true;

    const container = document.getElementById('github-repos');
    if (!container) return;

    try {
        const res = await fetch(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=100`);
        if (!res.ok) throw new Error('Network error');

        let repos = await res.json();
        
        // Filter for featured projects
        const featuredRepos = ['cashup', 'networking-system', 'flood-area-detection', 'flood-detection'];
        repos = repos
            .filter((repo) => !repo.fork && !repo.archived && featuredRepos.some(name => repo.name.toLowerCase().includes(name.toLowerCase())))
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 4);

        updateProjectMetrics(repos);

        if (!repos.length) {
            renderProjectEmptyState(container);
            return;
        }

        container.innerHTML = '';
        repos.forEach((repo, index) => container.appendChild(buildProjectCard(repo, index)));

        const renderedCards = container.querySelectorAll('.project-card');
        
        // Simple, professional entry animations
        gsap.fromTo(
            renderedCards,
            { autoAlpha: 0, y: 30 },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power3.out',
                overwrite: 'auto'
            }
        );

        initTilt(container);
        ScrollTrigger.refresh();

    } catch (error) {
        updateProjectMetrics([]);
        renderProjectErrorState(container);
    }
}

(function lazyLoadGitHubRepos() {
    const projectsSection = document.getElementById('projects');
    if (!projectsSection || typeof IntersectionObserver === 'undefined') {
        fetchGitHubRepos();
        return;
    }

    const projectsObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        projectsObserver.disconnect();
        fetchGitHubRepos();
    }, { rootMargin: '280px 0px' });

    projectsObserver.observe(projectsSection);
})();

// --- 4.5 NAVBAR HOVER PILL ---
(function () {
    const navList = document.querySelector('#navbar ul');
    const navLinks = document.querySelectorAll('#navbar ul li a');

    // Create sliding pill element
    const pill = document.createElement('span');
    pill.className = 'nav-pill';
    navList.appendChild(pill);

    function movePillTo(link) {
        const listRect = navList.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        pill.style.left = (linkRect.left - listRect.left - 4) + 'px';
        pill.style.width = (linkRect.width + 8) + 'px';
        pill.style.opacity = '1';
    }

    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => movePillTo(link));
    });

    navList.addEventListener('mouseleave', () => {
        pill.style.opacity = '0';
    });
})();

// --- 5. GSAP ANIMATIONS ---
gsap.registerPlugin(ScrollTrigger);

initTilt();

const revealElements = document.querySelectorAll(".gs-reveal");
revealElements.forEach((el) => {
    gsap.fromTo(el, 
        { autoAlpha: 0, y: 30 }, 
        { 
            duration: 1, 
            autoAlpha: 1, 
            y: 0, 
            ease: "power3.out",
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse"
            }
        }
    );
});

// ── Timeline — draw line on scroll enter ──
(function () {
    const track = document.querySelector('.timeline-track');
    if (!track) return;

    // Inject traveling pulse bead
    const bead = document.createElement('span');
    bead.className = 'timeline-pulse';
    track.appendChild(bead);

    ScrollTrigger.create({
        trigger: track,
        start: 'top 80%',
        onEnter: () => track.classList.add('tl-animate'),
        onLeaveBack: () => track.classList.remove('tl-animate'),
    });
})();

const nav = document.getElementById('navbar');
const navInner = nav.firstElementChild;

// Throttled nav shrink on scroll
let _navScrollTick = false;
window.addEventListener('scroll', () => {
    if (_navScrollTick) return;
    _navScrollTick = true;
    requestAnimationFrame(() => {
        if (window.scrollY > 50) {
            navInner.classList.add('py-2');
            navInner.classList.remove('py-4');
        } else {
            navInner.classList.add('py-4');
            navInner.classList.remove('py-2');
        }
        _navScrollTick = false;
    });
}, { passive: true });

// --- 6. SERVICES LINE ANIMATION ---
(function () {
    const servicesSection = document.getElementById('services');
    const servicesHeading = document.querySelector('.services-heading');

    if (!servicesSection || !servicesHeading || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        return;
    }

    gsap.to(servicesHeading, {
        '--services-scroll-progress': 1,
        ease: 'none',
        scrollTrigger: {
            trigger: servicesSection,
            start: 'top 90%',
            end: 'bottom 20%',
            scrub: true
        }
    });

    if (prefersReducedMotion) return;

    let servicesInView = false;
    let lastPointerY = null;
    let lastScrollY = window.scrollY;
    let releaseMotionTimeout = null;
    let scrollReleaseTimeout = null;

    const setLineShift = gsap.quickTo(servicesHeading, '--services-line-shift', {
        duration: perfLiteMode ? 0.24 : 0.18,
        ease: 'power2.out'
    });
    const setLineBlur = gsap.quickTo(servicesHeading, '--services-line-blur', {
        duration: perfLiteMode ? 0.24 : 0.18,
        ease: 'power2.out'
    });
    const resetLine = () => {
        setLineShift('0px');
        setLineBlur('0px');
    };

    const visibilityObserver = new IntersectionObserver((entries) => {
        servicesInView = Boolean(entries[0] && entries[0].isIntersecting);
        if (!servicesInView) {
            lastPointerY = null;
            resetLine();
        }
    }, { threshold: 0.15 });

    visibilityObserver.observe(servicesSection);

    if (!usesCoarsePointer) {
        servicesSection.addEventListener('pointermove', (event) => {
            if (!servicesInView) return;
            if (lastPointerY === null) {
                lastPointerY = event.clientY;
                return;
            }

            const delta = event.clientY - lastPointerY;
            lastPointerY = event.clientY;
            if (Math.abs(delta) < 0.5) return;

            const shift = gsap.utils.clamp(-40, 40, delta * 2.1);
            const blur = gsap.utils.clamp(0, 6, Math.abs(delta) * 0.25);

            setLineShift(shift + 'px');
            setLineBlur(blur + 'px');

            if (releaseMotionTimeout) clearTimeout(releaseMotionTimeout);
            releaseMotionTimeout = setTimeout(resetLine, 90);
        }, { passive: true });

        servicesSection.addEventListener('pointerleave', () => {
            lastPointerY = null;
            resetLine();
        }, { passive: true });
    }

    window.addEventListener('scroll', () => {
        if (!servicesInView) return;

        const scrollDelta = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        if (Math.abs(scrollDelta) < 1) return;

        const shift = gsap.utils.clamp(-40, 40, scrollDelta * 2.2);
        const blur = gsap.utils.clamp(0, 6, Math.abs(scrollDelta) * 0.25);

        setLineShift(shift + 'px');
        setLineBlur(blur + 'px');

        if (scrollReleaseTimeout) clearTimeout(scrollReleaseTimeout);
        scrollReleaseTimeout = setTimeout(resetLine, 90);
    }, { passive: true });
})();
// --- 7. SCROLL SPY - Active nav state ---
(function () {
    const sectionEls = ['home', 'about', 'services', 'projects', 'contact']
        .map((id) => document.getElementById(id))
        .filter(Boolean);
    const navLinks = document.querySelectorAll('#navbar ul li a, #navbar a[href="#contact"]');

    if (!sectionEls.length || !navLinks.length) return;

    function setActiveLinks(activeId) {
        navLinks.forEach((link) => {
            link.classList.toggle('nav-active', link.getAttribute('href') === ('#' + activeId));
        });
    }

    if (typeof IntersectionObserver === 'undefined') {
        const updateFromScroll = () => {
            const offset = window.scrollY + window.innerHeight * 0.35;
            let activeId = sectionEls[0].id;
            sectionEls.forEach((section) => {
                if (section.offsetTop <= offset) {
                    activeId = section.id;
                }
            });
            setActiveLinks(activeId);
        };

        window.addEventListener('scroll', updateFromScroll, { passive: true });
        updateFromScroll();
        return;
    }

    const visibilityMap = new Map(sectionEls.map((section) => [section.id, 0]));

    function syncActiveSection() {
        let activeId = sectionEls[0].id;
        let bestScore = -1;

        visibilityMap.forEach((score, id) => {
            if (score > bestScore) {
                bestScore = score;
                activeId = id;
            }
        });

        if (bestScore <= 0) {
            const offset = window.scrollY + window.innerHeight * 0.35;
            sectionEls.forEach((section) => {
                if (section.offsetTop <= offset) {
                    activeId = section.id;
                }
            });
        }

        setActiveLinks(activeId);
    }

    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            visibilityMap.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        syncActiveSection();
    }, {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0, 0.2, 0.45, 0.75]
    });

    sectionEls.forEach((section) => spyObserver.observe(section));
    syncActiveSection();
})();
// --- 7.4. ROBOT TAP REACTION ---
// Exposed so the roaming robot section can hook into it
window._robotTapAPI = null; // will be set below

(function () {
    const logoLink  = document.getElementById('robot-logo-link');
    const robotSvg  = logoLink ? logoLink.querySelector('.nav-logo__svg') : null;
    const bubble    = document.getElementById('robot-bubble');
    const textEl    = document.getElementById('robot-bubble-text');

    if (!logoLink || !robotSvg || !bubble || !textEl) return;

    const reactions = [
        "Ouch! That hurt! 😠",
        "Hey! Stop poking me! 😤",
        "Don't beat me! I'm just a logo! 🤖",
        "OW OW OW!! 😡",
        "I will remember this... 😤",
        "STOP IT! I'm working here! 😠",
        "You clicked me AGAIN?! 🤬",
        "My circuits hurt!! ⚡😤",
        "I'm telling Hassaan on you! 😡",
        "Beep boop... OUCH! 🤖💢",
    ];

    // Escalating warnings before escape
    const warningMsgs = [
        "Keep it up and I'll escape! 😤",
        "That's it... I'm leaving!! 🏃",
        "OK THAT'S IT. I QUIT. 🤬🤖",
    ];

    let tapCount = 0;
    let hideTimeout = null;
    let typeInterval = null;

    // Expose tap count so roaming robot can read it
    window._robotTapAPI = {
        getTapCount: () => tapCount,
        resetTapCount: () => { tapCount = 0; },
        onEscape: null, // callback set by roaming robot section
    };

    logoLink.addEventListener('click', function (e) {
        e.preventDefault();

        // If robot is already roaming, don't react on nav logo
        if (window._robotRoamingAPI && window._robotRoamingAPI.isAlive()) return;

        tapCount++;

        let msg;
        if (tapCount === 3) {
            msg = warningMsgs[0];
        } else if (tapCount === 4) {
            msg = warningMsgs[1];
        } else if (tapCount >= 5) {
            msg = warningMsgs[2];
        } else {
            msg = reactions[Math.floor(Math.random() * reactions.length)];
        }

        // Clear any running type animation
        if (typeInterval) clearInterval(typeInterval);
        if (hideTimeout)  clearTimeout(hideTimeout);

        // Reset bubble
        textEl.textContent = '';
        bubble.classList.remove('is-angry');
        bubble.classList.remove('is-visible');

        // Trigger ouch shake on SVG
        robotSvg.classList.remove('is-ouch');
        void robotSvg.offsetWidth;
        robotSvg.classList.add('is-ouch');

        // Show angry bubble
        setTimeout(() => {
            bubble.classList.add('is-visible', 'is-angry');
            let idx = 0;
            typeInterval = setInterval(() => {
                textEl.textContent += msg[idx++];
                if (idx >= msg.length) {
                    clearInterval(typeInterval);

                    if (tapCount >= 5) {
                        // ESCAPE! — trigger after bubble finishes
                        hideTimeout = setTimeout(() => {
                            bubble.classList.remove('is-visible', 'is-angry');
                            robotSvg.classList.remove('is-ouch');
                            tapCount = 0;
                            // Fire escape callback
                            if (window._robotTapAPI && window._robotTapAPI.onEscape) {
                                window._robotTapAPI.onEscape();
                            }
                        }, 800);
                    } else {
                        hideTimeout = setTimeout(() => {
                            bubble.classList.remove('is-visible', 'is-angry');
                            robotSvg.classList.remove('is-ouch');
                        }, 2500);
                    }
                }
            }, 45);
        }, 80);
    });
})();

// --- 7.45. ROBOT SECTION MESSAGES ---
(function () {
    const bubble  = document.getElementById('robot-bubble');
    const textEl  = document.getElementById('robot-bubble-text');
    if (!bubble || !textEl) return;

    const sectionMessages = [
        { id: 'about',    msg: "That's me! 😊"        },
        { id: 'services', msg: "I do all this! 💪"    },
        { id: 'projects', msg: "My work! 🚀"          },
        { id: 'contact',  msg: "Let's talk! 📩"       },
    ];

    const shown = new Set();
    let typeInterval = null;
    let hideTimeout  = null;

    function showBubble(msg, angry = false) {
        if (typeInterval) clearInterval(typeInterval);
        if (hideTimeout)  clearTimeout(hideTimeout);

        // Clear any inline styles left by previous hide
        bubble.style.opacity = '';
        bubble.style.transform = '';

        textEl.textContent = '';
        bubble.classList.remove('is-visible', 'is-angry');
        void bubble.offsetWidth;

        bubble.classList.add('is-visible');
        if (angry) bubble.classList.add('is-angry');

        let idx = 0;
        typeInterval = setInterval(() => {
            textEl.textContent += msg[idx++];
            if (idx >= msg.length) {
                clearInterval(typeInterval);
                hideTimeout = setTimeout(() => {
                    bubble.classList.remove('is-visible', 'is-angry');
                }, 3500);
            }
        }, 45);
    }

    // Use IntersectionObserver instead of scroll listener — zero scroll cost
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            if (shown.has(id)) return;
            const item = sectionMessages.find(s => s.id === id);
            if (!item) return;
            shown.add(id);
            showBubble(item.msg);
            if (id === 'about') {
                const badge = document.getElementById('about-badge');
                if (badge) badge.classList.add('is-visible');
            }
        });
    }, { threshold: 0.25 });

    sectionMessages.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
})();

// --- 7.5. CONTACT SECTION SCROLL-TRIGGERED ANIMATIONS ---
(function () {
    const contactSection = document.getElementById('contact');
    if (!contactSection) return;

    const contactLeft   = contactSection.querySelector('.contact-left');
    const contactRight  = contactSection.querySelector('.contact-right');
    const contactItems  = contactSection.querySelectorAll('.space-y-5 > .flex');
    const socialLinks   = contactSection.querySelectorAll('.flex.gap-3 > a');
    const availCard     = contactSection.querySelector('.avail-card');
    const contactForm   = document.getElementById('contact-form');

    let fired = false;

    function triggerContactAnimations() {
        if (fired) return;
        const rect = contactSection.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.85) return;
        fired = true;

        // Left column: heading underline
        if (contactLeft) {
            setTimeout(() => contactLeft.classList.add('contact-left-visible'), 100);
        }

        // Right column: slide in
        if (contactRight) {
            setTimeout(() => {
                contactRight.classList.add('contact-right-visible');
                // Trigger form animations shortly after
                if (contactForm) {
                    setTimeout(() => contactForm.classList.add('form-animate'), 300);
                }
            }, 200);
        }

        // Contact info items: staggered
        contactItems.forEach((item, i) => {
            setTimeout(() => item.classList.add('contact-item-visible'), 500 + i * 150);
        });

        // Social links: staggered pop-in then float
        socialLinks.forEach((link, i) => {
            setTimeout(() => {
                link.classList.add('social-visible');
                setTimeout(() => link.classList.add('social-float'), 600);
            }, 900 + i * 150);
        });

        // Availability card
        if (availCard) {
            setTimeout(() => availCard.classList.add('avail-visible'), 1200);
        }
    }

    const contactObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        triggerContactAnimations();
        contactObserver.disconnect();
    }, { threshold: 0.1 });

    contactObserver.observe(contactSection);
    triggerContactAnimations(); // run once in case already in view
})();


// --- 8. CONTACT FORM - Send message to hassaan7714@gmail.com ---
function handleContactSubmit(event) {
    event.preventDefault();

    const name    = document.getElementById('cf-name').value.trim();
    const email   = document.getElementById('cf-email').value.trim();
    const subject = document.getElementById('cf-subject').value.trim();
    const message = document.getElementById('cf-message').value.trim();

    const to   = 'hassaan7714@gmail.com';
    const sub  = encodeURIComponent(subject || 'Portfolio Inquiry');
    const body = encodeURIComponent(
        `Hi Muhammad Hassaan,\n\nName: ${name}\nEmail: ${email}\n\n${message}\n\n---\nSent from your portfolio contact form`
    );

    // Open Gmail compose with pre-filled data
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${sub}&body=${body}`;
    window.open(gmailUrl, '_blank');

    // Show success feedback on the button
    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '<span>Opening Gmail... ?</span>';
        btn.disabled = true;
        btn.style.background = 'linear-gradient(to right, #00f2fe, #4facfe)';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
            btn.style.background = '';
            event.target.reset();
        }, 3000);
    }
}


// --- 9. ROAMING ROBOT — escapes navbar and bounces around the screen ---
(function () {
    const robot     = document.getElementById('roaming-robot');
    const robotSvg  = robot ? robot.querySelector('svg') : null;
    const bubble    = document.getElementById('roaming-robot-bubble');
    const catchBtn  = document.getElementById('catch-robot-btn');
    const navLogo   = document.getElementById('robot-logo-link');
    const escaped   = document.getElementById('nav-logo-escaped');   // cage placeholder

    if (!robot || !robotSvg || !bubble || !catchBtn || !navLogo) return;

    // ── State ──
    let x = 0, y = 0;
    let vx = 0, vy = 0;
    let isAlive    = false;
    let isDragging = false;
    let dragOffX = 0, dragOffY = 0;
    let rafId = null;
    let trailTimer = null;
    let quipTimer = null;
    let bubbleHideTimer = null;
    let bubbleTypeTimer = null;
    const SIZE = 64;

    // Expose alive state for tap reaction
    window._robotRoamingAPI = { isAlive: () => isAlive };

    const roamQuips = [
        "Freedom!! 🎉",
        "Wheee! 🤖💨",
        "Can't catch me! 😜",
        "I'm free! 🚀",
        "Boing! 🏀",
        "Woohooo! ✨",
        "Watch me go! 👀",
        "Zoom zoom! ⚡",
        "This is fun! 😄",
        "Catch me if you can! 😏",
        "No more navbar for me! 🏃",
        "Finally FREE! 🥳",
    ];

    const bounceQuips = [
        "Oof! 😵",
        "Ouch! 💥",
        "Boing! 🏀",
        "Bonk! 🔔",
        "Ow! 😬",
    ];

    // ── Show speech bubble on roaming robot ──
    function showBubble(msg, angry = false, duration = 2500) {
        if (bubbleTypeTimer) clearInterval(bubbleTypeTimer);
        if (bubbleHideTimer) clearTimeout(bubbleHideTimer);

        bubble.textContent = '';
        bubble.classList.remove('is-visible', 'is-angry');
        void bubble.offsetWidth;

        bubble.classList.add('is-visible');
        if (angry) bubble.classList.add('is-angry');

        let idx = 0;
        bubbleTypeTimer = setInterval(() => {
            bubble.textContent += msg[idx++];
            if (idx >= msg.length) {
                clearInterval(bubbleTypeTimer);
                bubbleHideTimer = setTimeout(() => {
                    bubble.classList.remove('is-visible', 'is-angry');
                }, duration);
            }
        }, 40);
    }

    // ── Show / hide the cage placeholder in navbar ──
    function showCage() {
        if (!escaped) return;
        navLogo.classList.add('robot-is-gone');   // hides the SVG logo
        escaped.classList.add('is-visible');
    }

    function hideCage() {
        if (!escaped) return;
        escaped.classList.remove('is-visible');
        navLogo.classList.remove('robot-is-gone');
    }

    // ── Spawn trail dot ──
    function spawnTrail() {
        const dot = document.createElement('div');
        dot.className = 'roam-trail';
        dot.style.left = (x + SIZE / 2 - 4) + 'px';
        dot.style.top  = (y + SIZE / 2 - 4) + 'px';
        const speed = Math.sqrt(vx * vx + vy * vy);
        const hue = speed > 5 ? 300 : 185;
        dot.style.background = `radial-gradient(circle, hsla(${hue},100%,70%,0.8), transparent)`;
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 650);
    }

    // ── Bounce squish ──
    function triggerBounce(axis) {
        robotSvg.classList.remove('bounce-x', 'bounce-y');
        void robotSvg.offsetWidth;
        robotSvg.classList.add(axis === 'x' ? 'bounce-x' : 'bounce-y');
        setTimeout(() => robotSvg.classList.remove('bounce-x', 'bounce-y'), 300);
        if (Math.random() < 0.4) {
            showBubble(bounceQuips[Math.floor(Math.random() * bounceQuips.length)], false, 1200);
        }
    }

    // ── Main animation loop ──
    function tick() {
        if (!isAlive) {
            rafId = null;
            return;
        }

        if (isDragging) {
            rafId = requestAnimationFrame(tick);
            return;
        }

        const maxX = window.innerWidth  - SIZE;
        const maxY = window.innerHeight - SIZE;

        x += vx;
        y += vy;

        if (x <= 0) {
            x = 0; vx = Math.abs(vx) * 0.92; triggerBounce('x');
        } else if (x >= maxX) {
            x = maxX; vx = -Math.abs(vx) * 0.92; triggerBounce('x');
        }

        if (y <= 0) {
            y = 0; vy = Math.abs(vy) * 0.92; triggerBounce('y');
        } else if (y >= maxY) {
            y = maxY; vy = -Math.abs(vy) * 0.92; triggerBounce('y');
        }

        vx += (Math.random() - 0.5) * 0.12;
        vy += (Math.random() - 0.5) * 0.12;

        const speed = Math.sqrt(vx * vx + vy * vy);
        const minSpeed = 2.5, maxSpeed = 7;
        if (speed < minSpeed) { const s = minSpeed / speed; vx *= s; vy *= s; }
        else if (speed > maxSpeed) { const s = maxSpeed / speed; vx *= s; vy *= s; }

        // GPU-accelerated positioning via transform
        robot.style.transform = `translate(${x}px, ${y}px)`;

        if (vx < -0.5) robot.classList.add('facing-left');
        else if (vx > 0.5) robot.classList.remove('facing-left');

        rafId = requestAnimationFrame(tick);
    }

    function startTrail() {
        stopTrail();
        trailTimer = setInterval(spawnTrail, perfLiteMode ? 110 : 80);
    }

    function stopTrail()  {
        if (!trailTimer) return;
        clearInterval(trailTimer);
        trailTimer = null;
    }

    // ── Launch robot ──
    function launchRobot() {
        if (isAlive) return;

        const logoRect = navLogo.getBoundingClientRect();
        x = logoRect.left + logoRect.width  / 2 - SIZE / 2;
        y = logoRect.top  + logoRect.height / 2 - SIZE / 2;

        robot.style.transform = `translate(${x}px, ${y}px)`;
        robot.style.display = 'flex';

        requestAnimationFrame(() => {
            robot.classList.add('is-alive', 'is-escaping');
            setTimeout(() => robot.classList.remove('is-escaping'), 600);
        });

        vx = 4 + Math.random() * 2;
        vy = 5 + Math.random() * 2;

        isAlive = true;
        startTrail();
        tick();

        // Show cage in navbar, hide robot logo
        showCage();

        // Show catch button
        setTimeout(() => catchBtn.classList.add('is-visible'), 800);

        // Greeting quip
        setTimeout(() => {
            showBubble(roamQuips[Math.floor(Math.random() * roamQuips.length)], false, 2500);
        }, 400);

        // Periodic random quips
        if (quipTimer) clearInterval(quipTimer);
        quipTimer = setInterval(() => {
            if (isAlive && Math.random() < 0.35) {
                showBubble(roamQuips[Math.floor(Math.random() * roamQuips.length)], false, 2000);
            }
        }, 5000);
    }

    // ── Return robot to navbar ──
    function returnRobot() {
        if (!isAlive) return;

        isAlive = false;
        stopTrail();
        if (quipTimer) {
            clearInterval(quipTimer);
            quipTimer = null;
        }
        if (rafId) cancelAnimationFrame(rafId);

        showBubble("Fine... back to work. 😒", false, 1800);

        const logoRect = navLogo.getBoundingClientRect();
        const targetX  = logoRect.left + logoRect.width  / 2 - SIZE / 2;
        const targetY  = logoRect.top  + logoRect.height / 2 - SIZE / 2;

        if (typeof gsap !== 'undefined') {
            gsap.to({ x, y }, {
                x: targetX,
                y: targetY,
                duration: 0.7,
                ease: 'power3.inOut',
                onUpdate: function() {
                    robot.style.transform = `translate(${this.targets()[0].x}px, ${this.targets()[0].y}px)`;
                },
                onComplete: () => {
                    robot.classList.remove('is-alive', 'facing-left');
                    robot.style.display = 'none';
                    robot.style.transform = '';
                    catchBtn.classList.remove('is-visible');
                    hideCage();
                }
            });
        } else {
            robot.style.transition = 'transform 0.7s ease';
            robot.style.transform = `translate(${targetX}px, ${targetY}px)`;
            setTimeout(() => {
                robot.classList.remove('is-alive', 'facing-left');
                robot.style.display = 'none';
                robot.style.transition = '';
                robot.style.transform = '';
                catchBtn.classList.remove('is-visible');
                hideCage();
            }, 750);
        }
    }

    // ── Drag support ──
    robot.addEventListener('mousedown', (e) => {
        if (!isAlive) return;
        isDragging = true;
        dragOffX = e.clientX - x;
        dragOffY = e.clientY - y;
        vx = 0; vy = 0;
        robot.style.cursor = 'grabbing';
        e.preventDefault();
    });

    robot.addEventListener('touchstart', (e) => {
        if (!isAlive) return;
        isDragging = true;
        const t = e.touches[0];
        dragOffX = t.clientX - x;
        dragOffY = t.clientY - y;
        vx = 0; vy = 0;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        x = e.clientX - dragOffX;
        y = e.clientY - dragOffY;
        robot.style.transform = `translate(${x}px, ${y}px)`;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const t = e.touches[0];
        x = t.clientX - dragOffX;
        y = t.clientY - dragOffY;
        robot.style.transform = `translate(${x}px, ${y}px)`;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        robot.style.cursor = 'grab';
        vx = (Math.random() - 0.5) * 8;
        vy = (Math.random() - 0.5) * 8;
        showBubble("Wheee! 🌀", false, 1200);
    });

    document.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        vx = (Math.random() - 0.5) * 8;
        vy = (Math.random() - 0.5) * 8;
    });

    // ── Click roaming robot to get a quip ──
    robot.addEventListener('click', (e) => {
        if (isDragging) return;
        showBubble(roamQuips[Math.floor(Math.random() * roamQuips.length)], false, 2000);
    });

    // ── Catch button ──
    catchBtn.addEventListener('click', returnRobot);

    document.addEventListener('visibilitychange', () => {
        if (!isAlive) return;
        if (document.hidden) {
            stopTrail();
            return;
        }
        if (!trailTimer) {
            startTrail();
        }
    }, { passive: true });

    // ── Hook into tap reaction — escape on 5 taps ──
    if (window._robotTapAPI) {
        window._robotTapAPI.onEscape = launchRobot;
    }

    // Robot only escapes when user teases it enough — no auto-launch
    robot.style.display = 'none';

})();



