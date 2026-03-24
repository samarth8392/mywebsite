// ==================== CONFIG ====================
const ORCID_ID = '0000-0002-6446-5718';
const ORCID_API = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const S2_API = 'https://api.semanticscholar.org/graph/v1/paper/DOI:';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// ==================== CACHE HELPERS ====================
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function cacheTimestamp(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).ts;
  } catch { return null; }
}

function cacheInvalidate(...keys) { keys.forEach(k => localStorage.removeItem(k)); }

function showCacheInfo(elementId, cacheKeys, refreshCallback) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const ts = cacheTimestamp(cacheKeys[0]);
  if (ts) {
    const date = new Date(ts);
    const daysLeft = Math.ceil((ts + CACHE_TTL - Date.now()) / (24*60*60*1000));
    el.innerHTML = `<i class="fas fa-database"></i> Cached ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · refreshes in ${daysLeft}d <button class="refresh-btn" id="refresh_${elementId}"><i class="fas fa-sync-alt"></i> Refresh</button>`;
    document.getElementById(`refresh_${elementId}`).addEventListener('click', () => {
      cacheInvalidate(...cacheKeys);
      el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      refreshCallback();
    });
  } else {
    el.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Fetched just now';
  }
}

// ==================== GLOBAL SPEED ====================
let animSpeed = 0.5;

function initSpeedControl() {
  const control = document.getElementById('speedControl');
  const toggle = document.getElementById('speedToggle');
  const slider = document.getElementById('speedSlider');
  const label = document.getElementById('speedLabel');
  if (!control || !toggle || !slider) return;

  toggle.addEventListener('click', () => control.classList.toggle('open'));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.speed-control')) control.classList.remove('open');
  });

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    animSpeed = val / 100;
    if (label) {
      if (val === 0) label.textContent = 'off';
      else label.textContent = animSpeed.toFixed(1) + 'x';
    }
    tickerState.speed = 0.5 * animSpeed;
  });
}

// ==================== MAIN INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  initDarkMode();
  initExpandableCards();
  initBioCanvas();
  initDNACards();
  initCareerTimeline();
  initNavbarEffects();
  initMagneticLinks();
  initPageEntrance();
  initPubFilters();
  initStatBubbles();
  initSpeedControl();
  fetchPublications();
  fetchGitHubRepos();
});

// ==================== PAGE ENTRANCE SEQUENCE ====================
function initPageEntrance() {
  const body = document.body;
  body.classList.add('page-loading');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      body.classList.remove('page-loading');
      body.classList.add('page-loaded');

      // Trigger scroll animations for active panel
      setTimeout(() => {
        const panel = document.querySelector('.tab-panel.active');
        if (panel) observeAnimatedElements(panel);
      }, 100);
    });
  });
}

// ==================== SCROLL ANIMATIONS ====================
function observeAnimatedElements(container) {
  const elements = container.querySelectorAll('.anim');
  if (!elements.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  elements.forEach(el => observer.observe(el));
}

// ==================== TAB NAVIGATION ====================
function initTabNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navLinks');

  function switchTab(tabId) {
    const current = document.querySelector('.tab-panel.active');
    const target = document.getElementById(tabId);
    if (!target || current === target) return;

    navLinks.forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
    if (link) link.classList.add('active');

    if (current) {
      current.classList.add('fade-out');
      current.addEventListener('animationend', () => {
        current.classList.remove('active', 'fade-out');
        target.classList.add('active');
        observeAnimatedElements(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, { once: true });
    } else {
      target.classList.add('active');
      observeAnimatedElements(target);
    }
    history.replaceState(null, '', '#' + tabId);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
    });
  });

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    navToggle.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
    }
  });

  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) switchTab(hash);
}

// ==================== EXPANDABLE CARDS ====================
function initExpandableCards() {
  document.querySelectorAll('[data-expandable]').forEach(card => {
    const top = card.querySelector('.about-card-top') || card.querySelector('.dna-card-header');
    if (!top) return;
    top.addEventListener('click', () => card.classList.toggle('expanded'));
  });
}

// ==================== DARK MODE ====================
function initDarkMode() {
  const toggle = document.getElementById('darkToggle');
  if (!toggle) return;

  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.querySelector('i').className = 'fas fa-sun';
  }

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    if (isDark) document.documentElement.removeAttribute('data-theme');
    toggle.querySelector('i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
}

// ==================== NAVBAR EFFECTS ====================
function initNavbarEffects() {
  const navbar = document.getElementById('navbar');
  const progress = document.getElementById('scrollProgress');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navbar.classList.toggle('navbar-scrolled', y > 40);

    // Scroll progress
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    }
  }, { passive: true });
}

// ==================== MAGNETIC HOVER ON HERO LINKS ====================
function initMagneticLinks() {
  document.querySelectorAll('.hero-link').forEach(link => {
    link.addEventListener('mousemove', (e) => {
      const rect = link.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      link.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });
    link.addEventListener('mouseleave', () => {
      link.style.transform = '';
    });
  });
}

// ==================== PUBLICATION FILTERS ====================
let pubFilterState = { year: 'all', keyword: 'all', search: '' };

function applyPubFilters() {
  const { year, keyword, search } = pubFilterState;
  const searchLower = search.toLowerCase().trim();
  let visible = 0;

  document.querySelectorAll('.pub-item').forEach(item => {
    const matchYear = year === 'all' || item.dataset.year === year;
    const matchKeyword = keyword === 'all' || (item.dataset.keywords || '').split(',').includes(keyword);
    const matchSearch = !searchLower || (item.textContent || '').toLowerCase().includes(searchLower);

    if (matchYear && matchKeyword && matchSearch) {
      item.style.display = '';
      item.style.animation = 'slideIn 0.3s var(--ease) both';
      visible++;
    } else {
      item.style.display = 'none';
    }
  });

  const noResults = document.getElementById('pubNoResults');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';

  // Update charts to reflect current filters
  if (pubChartData.pubs.length) updateCharts();
}

function initPubFilters() {
  // Year filter buttons
  document.querySelectorAll('.pub-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pub-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pubFilterState.year = btn.dataset.year;
      applyPubFilters();
    });
  });

  // Keyword filter buttons
  document.querySelectorAll('.pub-keyword-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pub-keyword-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pubFilterState.keyword = btn.dataset.keyword;
      applyPubFilters();
    });
  });

  // Search input
  const searchInput = document.getElementById('pubSearch');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        pubFilterState.search = searchInput.value;
        applyPubFilters();
      }, 200);
    });
  }
}

// ==================== BIO CANVAS — DNA DOUBLE HELIX + PARTICLES ====================
function initBioCanvas() {
  const canvas = document.getElementById('bioCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, mouse = { x: -1000, y: -1000 }, particles = [], helixTime = 0, bioLastTime = 0;
  const NUCLEOTIDES = ['A', 'T', 'C', 'G'];
  const PAIRS = { A: 'T', T: 'A', C: 'G', G: 'C' };

  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

  function getColors() {
    return isDark() ? [
      { r:255, g:140, b:90 }, { r:74, g:234, b:224 },
      { r:180, g:142, b:255 }, { r:80, g:232, b:155 }
    ] : [
      { r:217, g:119, b:87 }, { r:59, g:138, b:138 },
      { r:123, g:107, b:160 }, { r:74, g:158, b:109 }
    ];
  }

  function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    createParticles();
  }

  function createParticles() {
    const count = Math.min(Math.floor((W * H) / 25000), 60);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: 1.5 + Math.random() * 2,
        ci: Math.floor(Math.random() * 4),
        label: NUCLEOTIDES[Math.floor(Math.random() * 4)],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Draw a DNA double helix column
  function drawHelix(cx, startY, nodes, colors, dark, phaseOffset) {
    const spacing = 40;
    const amplitude = 35;

    for (let i = 0; i < nodes; i++) {
      const y = startY + i * spacing;
      if (y < -50 || y > H + 50) continue;

      const angle = helixTime + i * 0.6 + phaseOffset;
      const x1 = cx + Math.sin(angle) * amplitude;
      const x2 = cx + Math.sin(angle + Math.PI) * amplitude;
      const z1 = Math.cos(angle);
      const z2 = Math.cos(angle + Math.PI);

      // Bond line between strands
      const bondAlpha = dark ? 0.08 : 0.05;
      ctx.strokeStyle = rgba(colors[1], bondAlpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // Strand 1 node
      const a1 = (z1 + 1) / 2 * 0.5 + 0.1;
      const r1 = 3 + z1 * 1.5;
      if (dark) { ctx.shadowColor = rgba(colors[0], 0.4); ctx.shadowBlur = 6; }
      ctx.fillStyle = rgba(colors[0], a1 * (dark ? 1.4 : 1));
      ctx.beginPath();
      ctx.arc(x1, y, Math.max(r1, 1), 0, Math.PI * 2);
      ctx.fill();

      // Strand 2 node
      const a2 = (z2 + 1) / 2 * 0.5 + 0.1;
      const r2 = 3 + z2 * 1.5;
      ctx.shadowColor = rgba(colors[2], 0.4);
      ctx.fillStyle = rgba(colors[2], a2 * (dark ? 1.4 : 1));
      ctx.beginPath();
      ctx.arc(x2, y, Math.max(r2, 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Backbone curves
    ctx.lineWidth = 1.5;
    for (let strand = 0; strand < 2; strand++) {
      const offset = strand * Math.PI;
      ctx.strokeStyle = rgba(colors[strand === 0 ? 0 : 2], dark ? 0.12 : 0.06);
      ctx.beginPath();
      for (let i = 0; i < nodes; i++) {
        const y = startY + i * spacing;
        const x = cx + Math.sin(helixTime + i * 0.6 + phaseOffset + offset) * amplitude;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function draw(timestamp) {
    const bioDt = bioLastTime ? Math.min((timestamp - bioLastTime) / 16.667, 3) : 1;
    bioLastTime = timestamp;
    ctx.clearRect(0, 0, W, H);
    const colors = getColors();
    const dark = isDark();
    helixTime += 0.015 * animSpeed * bioDt;

    // Draw helices — each with a different phase offset
    const helixCount = Math.max(2, Math.floor(W / 500));
    for (let h = 0; h < helixCount; h++) {
      const cx = (W / (helixCount + 1)) * (h + 1);
      const nodes = Math.ceil(H / 40) + 4;
      const phaseOffset = h * (Math.PI * 2 / helixCount);
      drawHelix(cx, -80, nodes, colors, dark, phaseOffset);
    }

    // Draw floating particles with connections
    const connectDist = 120;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse proximity effect
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mouseInfluence = Math.max(0, 1 - dist / 200);

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const ddx = p.x - q.x, ddy = p.y - q.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < connectDist) {
          const alpha = (1 - d / connectDist) * (dark ? 0.12 : 0.05);
          ctx.strokeStyle = rgba(colors[p.ci], alpha);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      // Draw particle
      const glow = mouseInfluence * 0.5;
      const baseAlpha = dark ? 0.5 : 0.3;
      const particleR = p.r + mouseInfluence * 3;

      if (dark && mouseInfluence > 0.1) {
        ctx.shadowColor = rgba(colors[p.ci], 0.6);
        ctx.shadowBlur = 12 * mouseInfluence;
      }

      ctx.fillStyle = rgba(colors[p.ci], baseAlpha + glow);
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleR, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.shadowBlur = 0;
      if (particleR > 2.5) {
        ctx.font = `600 ${particleR * 3}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(colors[p.ci], (dark ? 0.25 : 0.12) + glow * 0.3);
        ctx.fillText(p.label, p.x, p.y - particleR * 2.5);
      }

      // Update position
      p.x += (p.vx + Math.sin(helixTime + p.phase) * 0.1) * animSpeed * bioDt;
      p.y += (p.vy + Math.cos(helixTime * 0.7 + p.phase) * 0.08) * animSpeed * bioDt;

      // Mouse repulsion
      if (dist < 150 && dist > 0) {
        p.vx += (dx / dist) * 0.02 * bioDt;
        p.vy += (dy / dist) * 0.02 * bioDt;
      }

      // Damping
      p.vx *= Math.pow(0.998, bioDt);
      p.vy *= Math.pow(0.998, bioDt);

      // Bounce
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      p.x = Math.max(0, Math.min(W, p.x));
      p.y = Math.max(0, Math.min(H, p.y));
    }

    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
  window.addEventListener('resize', resize);
  resize();
  draw();
}

// ==================== 3D DNA HELIX CARDS ====================

// Shared tooltip
let dnaTooltip = null;

function showDNATooltip(screenX, screenY, data, accentColor) {
  if (!dnaTooltip) {
    dnaTooltip = document.createElement('div');
    dnaTooltip.className = 'dna-tooltip';
    dnaTooltip.innerHTML =
      '<div class="dna-tooltip-accent"></div>' +
      '<div class="dna-tooltip-inner">' +
        '<div class="dna-tooltip-close">&times;</div>' +
        '<div class="dna-tooltip-title"></div>' +
        '<div class="dna-tooltip-year"></div>' +
        '<div class="dna-tooltip-detail"></div>' +
      '</div>';
    document.body.appendChild(dnaTooltip);
    dnaTooltip.querySelector('.dna-tooltip-close').addEventListener('click', e => {
      e.stopPropagation();
      hideDNATooltip();
    });
  }
  dnaTooltip.querySelector('.dna-tooltip-accent').style.background = accentColor;
  dnaTooltip.querySelector('.dna-tooltip-title').textContent = data.title || data.label;
  const yearEl = dnaTooltip.querySelector('.dna-tooltip-year');
  if (data.year) { yearEl.textContent = data.year; yearEl.style.display = ''; }
  else { yearEl.style.display = 'none'; }
  dnaTooltip.querySelector('.dna-tooltip-detail').textContent = data.detail || '';
  dnaTooltip.style.left = screenX + 'px';
  dnaTooltip.style.top = screenY + 'px';
  dnaTooltip.classList.add('visible');
}

function hideDNATooltip() {
  if (dnaTooltip) dnaTooltip.classList.remove('visible');
}

function initDNACards() {
  const configs = [
    {
      canvasId: 'dnaResearchSkills',
      strandA: [
        { label: 'Cancer Genomics', title: 'Cancer Genomics', detail: 'Multi-omic analyses of cancer biology at NCI/NIH CCBR' },
        { label: 'Pop. Genetics', title: 'Population Genetics', detail: 'Genetic load, adaptive potential, inbreeding in small populations' },
        { label: 'Conservation', title: 'Conservation Genomics', detail: 'Wildlife genomics informing conservation management decisions' },
        { label: 'Transcriptomics', title: 'RNA-seq / Transcriptomics', detail: 'Multi-tissue immune response profiling, differential expression' },
        { label: 'Genome Assembly', title: 'Genome Assembly', detail: 'De novo nuclear & mitochondrial genome assembly' },
        { label: 'Multi-omics', title: 'Multi-omics Integration', detail: 'WGS, WES, RNA-seq, epigenomics data integration' },
        { label: 'Evo. Biology', title: 'Evolutionary Biology', detail: 'Demographic history, speciation, adaptive evolution' },
      ],
      strandB: [
        { label: 'R', title: 'R / RStudio', detail: 'Statistical modeling, population genetics, data visualization' },
        { label: 'Python', title: 'Python', detail: 'Pipeline development, bioinformatics tooling, data analysis' },
        { label: 'Bash', title: 'Bash / Shell', detail: 'Unix scripting, HPC job automation, cluster workflows' },
        { label: 'Perl', title: 'Perl', detail: 'Legacy bioinformatics scripting and sequence manipulation' },
        { label: 'Nextflow', title: 'Nextflow / Snakemake', detail: 'Reproducible pipeline frameworks for NGS analysis' },
        { label: 'HPC / AWS', title: 'HPC & Cloud Computing', detail: 'Slurm, PBS, AWS; large-scale genomics workflows' },
        { label: 'Docker/Conda', title: 'Docker / Conda', detail: 'Containerized reproducible bioinformatics environments' },
      ],
      lightA: { r:74, g:158, b:109 },  lightB: { r:59, g:138, b:138 },
      darkA:  { r:80, g:232, b:155 },  darkB:  { r:74, g:234, b:224 },
    },
    {
      canvasId: 'dnaEducationExp',
      strandA: [
        { label: 'BTech', title: 'BTech in Biotechnology', year: '2011 – 2015', detail: 'IIT Roorkee — Silver Medal for Best Bachelor\'s Project' },
        { label: 'PhD', title: 'PhD in Biological Sciences', year: '2015 – 2020', detail: 'Purdue University — Population genomics & conservation genetics' },
        { label: 'Purdue', title: 'Purdue University', detail: 'Welder Wildlife Foundation Graduate Research Fellow' },
        { label: 'IIT Roorkee', title: 'IIT Roorkee', detail: 'Prestigious Indian engineering & science institution' },
        { label: 'Genomics', title: 'Computational Genomics', detail: 'NGS, genome assembly, population structure analysis' },
        { label: 'Statistics', title: 'Biostatistics & Modeling', detail: 'Forward-time simulation, statistical modeling, GLMMs' },
        { label: 'Conservation', title: 'Conservation Biology', detail: 'Wildlife agency collaborations, endangered species management' },
      ],
      strandB: [
        { label: 'Postdoc', title: 'Postdoctoral Research Scholar', year: 'Jan 2021 – Feb 2023', detail: 'Ohio State University — Rattlesnake immunogenomics' },
        { label: 'NCI/NIH', title: 'Bioinformatics Analyst II', year: 'Mar 2023 – Present', detail: 'NCI/NIH CCBR — Cancer genomics & multi-omics pipelines' },
        { label: 'OSU', title: 'The Ohio State University', detail: 'EEOB department — Dr. H. Lisle Gibbs lab' },
        { label: 'CCBR', title: 'CCR Collaborative Bioinformatics Resource', detail: 'Supporting cancer researchers across NIH intramural programs' },
        { label: 'Pipelines', title: 'Pipeline Development', detail: 'Nextflow/Snakemake workflows for genomics & transcriptomics' },
        { label: 'Snake SFD', title: 'Snake Fungal Disease', detail: 'Ophidiomyces ophidiicola host-pathogen transcriptomics' },
        { label: 'TCGA/NCBI', title: 'Cancer Databases', detail: 'TCGA, GEO, cBioPortal, Ensembl, NCBI data integration' },
      ],
      lightA: { r:217, g:119, b:87 },  lightB: { r:123, g:107, b:160 },
      darkA:  { r:255, g:140, b:90 },  darkB:  { r:180, g:142, b:255 },
    }
  ];
  configs.forEach(c => createDNAHelix(c));

  // Close tooltip on click outside canvas
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.dna-canvas-wrap') && !(dnaTooltip && dnaTooltip.contains(e.target))) {
      hideDNATooltip();
    }
  });
}

/* ==================== CAREER TIMELINE (horizontal) ==================== */
function initCareerTimeline() {
  const track = document.getElementById('careerTrack');
  if (!track) return;

  const entries = [
    { type: 'edu', year: 2013, date: 'Jun 2013 – Jun 2015', title: 'BTech in Biotechnology', sub: 'IIT Roorkee', detail: 'Bioremediation, microbial genomics, antibiotic resistance; Institute Silver Medal for Best Project', icon: 'fa-seedling' },
    { type: 'exp', year: 2015, date: 'Aug 2015 – Dec 2020', title: 'Graduate Research Fellow', sub: 'Purdue University — Biological Sciences', detail: 'PhD: population genomics, genetic load, conservation genetics of Montezuma quail; Welder Wildlife Foundation Fellow', icon: 'fa-dna' },
    { type: 'exp', year: 2021, date: 'Jan 2021 – Feb 2023', title: 'Postdoctoral Research Scholar', sub: 'The Ohio State University — EEOB', detail: 'Host immune responses to snake fungal disease; neutral vs functional genomic diversity in Eastern Massasauga rattlesnakes', icon: 'fa-microscope' },
    { type: 'exp', year: 2023, date: 'Mar 2023 – Present', title: 'Bioinformatics Analyst II', sub: 'NCI / NIH — CCBR', detail: 'Multi-omic cancer genomics pipelines; NGS analysis supporting investigators across NIH intramural cancer research', icon: 'fa-flask-vial', active: true },
    { type: 'edu', year: 2020, date: 'Dec 2020', title: 'PhD in Biological Sciences', sub: 'Purdue University', detail: 'Dissertation: genetic load and adaptive potential in small isolated populations; SSE Presidents\' Award 2024', icon: 'fa-graduation-cap' },
  ];

  // Build 3 flex rows: above (cards for edu, years for exp), dots, below (cards for exp, years for edu)
  const rowAbove = document.createElement('div');
  rowAbove.className = 'tl-row tl-row-above';
  const rowDots = document.createElement('div');
  rowDots.className = 'tl-row tl-row-dots';
  const rowBelow = document.createElement('div');
  rowBelow.className = 'tl-row tl-row-below';

  const cardEls = [];
  entries.forEach((e, i) => {
    const isEdu = e.type === 'edu';
    const side = isEdu ? 'above' : 'below';

    const cardHTML = `
      <div class="tl-card ${e.type} ${side}" data-col="${i}">
        <div class="tl-card-icon ${e.type}"><i class="fas ${e.icon}"></i></div>
        <div class="tl-card-date ${e.type}">${e.date}</div>
        <div class="tl-card-title">${e.title}</div>
        <div class="tl-card-sub">${e.sub}</div>
        ${e.detail ? `<div class="tl-card-detail">${e.detail}</div>` : ''}
      </div>`;

    const yearHTML = `<span class="tl-year ${e.type}">${e.year}</span>`;

    // Above column: edu → card, exp → year
    const aboveCol = document.createElement('div');
    aboveCol.innerHTML = isEdu ? cardHTML : yearHTML;
    rowAbove.appendChild(aboveCol);

    // Dot column
    const dotCol = document.createElement('div');
    dotCol.innerHTML = `<div class="tl-dot ${e.type}${e.active ? ' active' : ''}"></div>`;
    // Mobile-only card clone
    const mobileCard = document.createElement('div');
    mobileCard.className = `tl-card ${e.type} below tl-mobile-card`;
    mobileCard.setAttribute('data-col', i);
    mobileCard.style.display = 'none';
    mobileCard.innerHTML = `
      <div class="tl-card-icon ${e.type}"><i class="fas ${e.icon}"></i></div>
      <div class="tl-card-date ${e.type}">${e.date}</div>
      <div class="tl-card-title">${e.title}</div>
      <div class="tl-card-sub">${e.sub}</div>
      ${e.detail ? `<div class="tl-card-detail">${e.detail}</div>` : ''}`;
    dotCol.appendChild(mobileCard);
    rowDots.appendChild(dotCol);

    // Below column: exp → card, edu → year
    const belowCol = document.createElement('div');
    belowCol.innerHTML = !isEdu ? cardHTML : yearHTML;
    rowBelow.appendChild(belowCol);

    // Collect card elements for observer
    const cardEl = (isEdu ? aboveCol : belowCol).querySelector('.tl-card');
    if (cardEl) cardEls.push(cardEl);
  });

  track.appendChild(rowAbove);
  track.appendChild(rowDots);
  track.appendChild(rowBelow);

  // Add legend
  const legend = document.createElement('div');
  legend.className = 'tl-legend';
  legend.innerHTML = `
    <div class="tl-legend-item"><div class="tl-legend-dot edu"></div> Education</div>
    <div class="tl-legend-item"><div class="tl-legend-dot exp"></div> Experience</div>
  `;
  track.parentElement.appendChild(legend);

  // Reveal cards with IntersectionObserver
  const observer = new IntersectionObserver((obs) => {
    obs.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  cardEls.forEach(el => observer.observe(el));

  // Mobile: show card inside dot column, above/below rows hidden via CSS
  const mobileQuery = window.matchMedia('(max-width: 768px)');
  function handleMobile(mq) {
    track.querySelectorAll('.tl-mobile-card').forEach(mc => {
      mc.style.display = mq.matches ? 'block' : 'none';
    });
  }
  mobileQuery.addEventListener('change', handleMobile);
  handleMobile(mobileQuery);

  // Expandable toggle
  const container = track.closest('.career-timeline');
  if (container) {
    container.classList.add('expanded');
    const header = container.querySelector('.career-timeline-header');
    header.addEventListener('click', () => {
      container.classList.toggle('expanded');
    });
  }
}

function createDNAHelix(cfg) {
  const canvas = document.getElementById(cfg.canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const numPairs = Math.max(cfg.strandA.length, cfg.strandB.length);
  let W = 0, H = 0;
  let rotation = 0;
  let particles = [];
  let frame = 0;
  let lastTime = 0;
  let spawnAcc = 0;
  let mouseX = -1000, mouseY = -1000;

  // Drag state
  let ptrDown = false;
  let ptrMoved = false;
  let ptrStartX = 0;
  let rotAtStart = 0;
  let momentum = 0;
  let lastPtrX = 0;
  let lastPtrTime = 0;

  // Node positions for hit testing (updated each frame)
  let nodePositions = [];

  // Strand filtering
  let activeStrand = 'both';
  let strandAlphaA = 1, strandAlphaB = 1;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;
  const white = { r:255, g:255, b:255 };

  // ---- Pointer events: drag + click ----
  canvas.addEventListener('pointerdown', e => {
    ptrDown = true;
    ptrMoved = false;
    ptrStartX = e.clientX;
    lastPtrX = e.clientX;
    lastPtrTime = Date.now();
    rotAtStart = rotation;
    momentum = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
    if (!ptrDown) return;
    const dx = e.clientX - ptrStartX;
    if (Math.abs(dx) > 3) ptrMoved = true;
    if (ptrMoved) {
      rotation = rotAtStart + dx * 0.008;
      const now = Date.now();
      const dt = Math.max(now - lastPtrTime, 1);
      momentum = (e.clientX - lastPtrX) * 0.008 / Math.max(dt / 16, 1);
      lastPtrX = e.clientX;
      lastPtrTime = now;
      hideDNATooltip();
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (!ptrDown) return;
    ptrDown = false;
    canvas.style.cursor = 'grab';
    if (!ptrMoved) {
      const r = canvas.getBoundingClientRect();
      handleNodeClick(e.clientX - r.left, e.clientY - r.top, e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('pointerleave', () => { mouseX = -1000; mouseY = -1000; });

  // Strand label click → filter to one strand
  const card = canvas.closest('.dna-card');
  if (card) {
    const strandLabels = card.querySelectorAll('.dna-strand-label');
    const dnaIcon = card.querySelector('.dna-header-icon');
    strandLabels.forEach((label, idx) => {
      label.addEventListener('click', e => {
        if (!card.classList.contains('expanded')) return; // let click propagate to expand
        e.stopPropagation();
        const s = idx === 0 ? 'A' : 'B';
        activeStrand = activeStrand === s ? 'both' : s;
        strandLabels.forEach((l, i) => {
          l.classList.toggle('dimmed', activeStrand !== 'both' && activeStrand !== (i === 0 ? 'A' : 'B'));
        });
      });
    });
    if (dnaIcon) {
      dnaIcon.style.cursor = 'pointer';
      dnaIcon.addEventListener('click', e => {
        if (!card.classList.contains('expanded')) return; // let click propagate to expand
        e.stopPropagation();
        activeStrand = 'both';
        strandLabels.forEach(l => l.classList.remove('dimmed'));
      });
    }
  }

  function handleNodeClick(mx, my, screenX, screenY) {
    let closest = null;
    let closestDist = Infinity;
    for (const n of nodePositions) {
      if (n.zN < 0.3) continue;
      const nMul = n.strand === 'A' ? strandAlphaA : strandAlphaB;
      if (nMul < 0.5) continue;
      const dx = n.x - mx, dy = n.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitR = n.size + 14;
      if (dist < hitR && dist < closestDist) {
        closest = n;
        closestDist = dist;
      }
    }
    if (closest) {
      const data = closest.strand === 'A' ? cfg.strandA[closest.index] : cfg.strandB[closest.index];
      const dark = isDark();
      const color = closest.strand === 'A' ? (dark ? cfg.darkA : cfg.lightA) : (dark ? cfg.darkB : cfg.lightB);
      showDNATooltip(screenX, screenY, data, rgba(color, 1));
    } else {
      hideDNATooltip();
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = window.innerWidth < 480 ? 300 : window.innerWidth < 768 ? 350 : 400;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(timestamp) {
    if (W <= 0 || H <= 0) { resize(); requestAnimationFrame(draw); return; }
    const dt = lastTime ? Math.min((timestamp - lastTime) / 16.667, 3) : 1;
    lastTime = timestamp;

    ctx.clearRect(0, 0, W, H);
    const dark = isDark();
    const cA = dark ? cfg.darkA : cfg.lightA;
    const cB = dark ? cfg.darkB : cfg.lightB;
    const cx = W / 2;

    const helixR = Math.min(W * 0.14, 65);
    const pairGap = Math.min(48, (H - 80) / numPairs);
    const totalH = (numPairs - 1) * pairGap;
    const startY = H / 2 - totalH / 2;
    const angleStep = Math.PI * 2 / 5;

    // Subtle center glow
    const grad = ctx.createRadialGradient(cx, H / 2, 0, cx, H / 2, Math.max(W, H) * 0.45);
    grad.addColorStop(0, rgba(cA, dark ? 0.04 : 0.025));
    grad.addColorStop(0.5, rgba(cB, dark ? 0.025 : 0.015));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Smooth strand alpha transition
    const tgtA = (activeStrand === 'both' || activeStrand === 'A') ? 1 : 0.07;
    const tgtB = (activeStrand === 'both' || activeStrand === 'B') ? 1 : 0.07;
    strandAlphaA += (tgtA - strandAlphaA) * 0.1 * dt;
    strandAlphaB += (tgtB - strandAlphaB) * 0.1 * dt;

    // Draw backbones
    drawBackbone(cx, startY, pairGap, helixR, angleStep, cA, cB, dark, strandAlphaA, strandAlphaB);

    // Collect and sort base pairs by depth
    let pairs = [];
    for (let i = 0; i < numPairs; i++) {
      const angle = rotation + i * angleStep;
      const y = startY + i * pairGap;
      const ax = cx + helixR * Math.cos(angle);
      const az = helixR * Math.sin(angle);
      const bx = cx + helixR * Math.cos(angle + Math.PI);
      const bz = helixR * Math.sin(angle + Math.PI);
      pairs.push({ i, y, ax, az, bx, bz });
    }
    pairs.sort((a, b) => Math.min(a.az, a.bz) - Math.min(b.az, b.bz));

    // Reset node positions for hit testing
    nodePositions = [];

    // Draw pairs back-to-front
    pairs.forEach(p => {
      const labelA = cfg.strandA[p.i]?.label || '';
      const labelB = cfg.strandB[p.i]?.label || '';
      const bondZN = ((p.az + p.bz) / 2 + helixR) / (2 * helixR);

      // Hydrogen bond (dashed line)
      const bondMul = Math.min(strandAlphaA, strandAlphaB);
      ctx.save();
      ctx.setLineDash([3, 5]);
      const bondAlpha = (0.06 + bondZN * 0.22) * (dark ? 1.4 : 1) * bondMul;
      ctx.strokeStyle = dark ? rgba(white, bondAlpha * 0.5) : rgba({ r:100, g:100, b:100 }, bondAlpha);
      ctx.lineWidth = 1 + bondZN * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.ax, p.y);
      ctx.lineTo(p.bx, p.y);
      ctx.stroke();
      ctx.restore();

      // Track node positions
      const zNA = (p.az + helixR) / (2 * helixR);
      const zNB = (p.bz + helixR) / (2 * helixR);
      const sA = (3 + zNA * 7) * (1 + Math.sin(frame * 0.03 + p.az * 0.1) * 0.12);
      const sB = (3 + zNB * 7) * (1 + Math.sin(frame * 0.03 + p.bz * 0.1) * 0.12);
      nodePositions.push({ x: p.ax, y: p.y, size: sA, index: p.i, strand: 'A', zN: zNA });
      nodePositions.push({ x: p.bx, y: p.y, size: sB, index: p.i, strand: 'B', zN: zNB });

      // Draw back node first, then front node
      if (p.az > p.bz) {
        drawNode(p.bx, p.y, p.bz, labelB, cB, dark, helixR, cx, strandAlphaB);
        drawNode(p.ax, p.y, p.az, labelA, cA, dark, helixR, cx, strandAlphaA);
      } else {
        drawNode(p.ax, p.y, p.az, labelA, cA, dark, helixR, cx, strandAlphaA);
        drawNode(p.bx, p.y, p.bz, labelB, cB, dark, helixR, cx, strandAlphaB);
      }
    });

    // Particles
    drawParticles(dark, dt);

    // Spawn particles from random bases
    spawnAcc += dt;
    if (spawnAcc >= 6 && particles.length < 100) {
      spawnAcc -= 6;
      const i = Math.floor(Math.random() * numPairs);
      const angle = rotation + i * angleStep;
      const y = startY + i * pairGap;
      const strand = activeStrand === 'A' ? false : activeStrand === 'B' ? true : Math.random() < 0.5;
      const offset = strand ? Math.PI : 0;
      const px = cx + helixR * Math.cos(angle + offset);
      const color = strand ? cB : cA;
      particles.push({
        x: px, y: y,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -0.2 - Math.random() * 0.9,
        life: 1,
        decay: 0.006 + Math.random() * 0.014,
        size: 1 + Math.random() * 2.5,
        color: color
      });
    }

    frame += dt;

    // Rotation: drag → momentum → auto-rotate
    if (ptrDown) {
      // rotation set by pointer handler
    } else if (Math.abs(momentum) > 0.0003) {
      rotation += momentum * dt;
      momentum *= Math.pow(0.95, dt);
    } else {
      momentum = 0;
      rotation += 0.006 * animSpeed * dt;
    }

    requestAnimationFrame(draw);
  }

  function drawBackbone(cx, startY, pairGap, helixR, angleStep, cA, cB, dark, mulA, mulB) {
    const segs = numPairs * 12;
    for (let strand = 0; strand < 2; strand++) {
      const offset = strand * Math.PI;
      const color = strand === 0 ? cA : cB;
      const mul = strand === 0 ? mulA : mulB;
      for (let s = 0; s < segs; s++) {
        const t1 = s / segs * (numPairs - 1);
        const t2 = (s + 1) / segs * (numPairs - 1);
        const a1 = rotation + t1 * angleStep + offset;
        const a2 = rotation + t2 * angleStep + offset;
        const wave1 = Math.sin(frame * 0.02 + t1 * 0.5) * 1.5;
        const wave2 = Math.sin(frame * 0.02 + t2 * 0.5) * 1.5;
        const x1 = cx + (helixR + wave1) * Math.cos(a1);
        const y1 = startY + t1 * pairGap;
        const z1 = helixR * Math.sin(a1);
        const x2 = cx + (helixR + wave2) * Math.cos(a2);
        const y2 = startY + t2 * pairGap;
        const z2 = helixR * Math.sin(a2);
        const zN = ((z1 + z2) / 2 + helixR) / (2 * helixR);
        const alpha = (0.07 + zN * 0.38) * (dark ? 1.5 : 1) * mul;
        const lw = 1 + zN * 2.5;
        if (dark && mul > 0.3) {
          ctx.shadowColor = rgba(color, 0.25 * zN * mul);
          ctx.shadowBlur = 3 + zN * 8;
        }
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  function drawNode(x, y, z, label, color, dark, helixR, cx, mul) {
    if (mul === undefined) mul = 1;
    const zN = (z + helixR) / (2 * helixR);
    const pulse = 1 + Math.sin(frame * 0.03 + z * 0.1) * 0.12;
    let size = (3 + zN * 7) * pulse;
    const alpha = (0.15 + zN * 0.85) * mul;

    // Mouse hover effect
    const dx = x - mouseX, dy = y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hover = Math.max(0, 1 - dist / 50);
    if (hover > 0) size *= 1 + hover * 0.6;

    // Glow
    if (dark && mul > 0.3) {
      ctx.shadowColor = rgba(color, (0.4 + hover * 0.4) * zN * mul);
      ctx.shadowBlur = 6 + zN * 16 + hover * 10;
    }

    // Outer glow ring
    if (zN > 0.35) {
      const glowR = size + 3 + zN * 4 + hover * 6;
      ctx.fillStyle = rgba(color, alpha * 0.12 + hover * 0.08);
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main node
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright spot
    ctx.fillStyle = rgba(white, alpha * 0.35);
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Label
    if (zN > 0.2 && label && mul > 0.25) {
      const fontSize = Math.round(8 + zN * 5);
      const labelAlpha = Math.pow(Math.max(0, (zN - 0.2) / 0.8), 0.6) * mul;
      ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
      const isLeft = x < cx;
      ctx.textAlign = isLeft ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      const gap = size + 10;
      const lx = isLeft ? x - gap : x + gap;

      if (dark) {
        ctx.shadowColor = rgba(color, 0.4 * labelAlpha);
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 4;
      }

      ctx.fillStyle = rgba(color, labelAlpha * (dark ? 0.95 : 0.85) + hover * 0.15);
      ctx.fillText(label, lx, y);
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles(dark, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * animSpeed * dt;
      p.y += p.vy * animSpeed * dt;
      p.life -= p.decay * animSpeed * dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const a = p.life * (dark ? 0.7 : 0.4);
      const s = p.size * p.life;
      if (dark) {
        ctx.shadowColor = rgba(p.color, 0.5 * p.life);
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = rgba(p.color, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  resize();
  draw();
  window.addEventListener('resize', resize);

  // ResizeObserver for expand/collapse
  if (window.ResizeObserver) {
    new ResizeObserver(() => resize()).observe(canvas.parentElement);
  }
}

// ==================== ORCID + SEMANTIC SCHOLAR ====================
function parseOrcidWorks(groups) {
  const pubs = groups.map(g => {
    const s = g['work-summary'][0];
    const title = s.title?.title?.value || 'Untitled';
    const journal = s['journal-title']?.value || '';
    const year = s['publication-date']?.year?.value || '';
    const month = s['publication-date']?.month?.value || '';
    const extIds = s['external-ids']?.['external-id'] || [];
    const doi = extIds.find(e => e['external-id-type'] === 'doi')?.['external-id-value'] || null;
    return { title, journal, year, month, doi };
  });
  pubs.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (b.month || 0) - (a.month || 0);
  });
  return pubs;
}

// ==================== STAT BUBBLES ====================
let statData = { pubs: 0, citations: 0, pathogens: [], langs: [] };
let activeBubble = null; // track the currently open bubble

const PATHOGEN_ICONS = {
  'Cancer': 'fa-ribbon', 'Liquid Biopsy': 'fa-vial',
  'Rattlesnake': 'fa-snake', 'Quail': 'fa-feather',
  'Fungal Disease': 'fa-bacterium', 'Walnut': 'fa-seedling',
  'Bananaquit': 'fa-feather-alt'
};

function closeBubble() {
  if (!activeBubble) return;
  const b = activeBubble;
  activeBubble = null;
  b.classList.remove('visible');
  setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
}

function buildBubbleHTML(type) {
  if (type === 'pubs') {
    return `<div class="stat-bubble-title"><i class="fas fa-file-alt"></i> Publications</div>
            <div class="stat-bubble-big">${statData.pubs || '20+'}</div>
            <div class="stat-bubble-sub">papers indexed in ORCID</div>`;
  }
  if (type === 'citations') {
    return `<div class="stat-bubble-title"><i class="fas fa-quote-right"></i> Citations</div>
            <div class="stat-bubble-big">${statData.citations || '750+'}</div>
            <div class="stat-bubble-sub">via Semantic Scholar</div>`;
  }
  if (type === 'years') {
    return `<div class="stat-bubble-title"><i class="fas fa-calendar-alt"></i> Years Experience</div>
            <div class="stat-bubble-big">9+</div>
            <div class="stat-bubble-sub">IIT Roorkee → Purdue → OSU → NCI/NIH</div>`;
  }
  if (type === 'langs') {
    const tags = statData.langs.length
      ? statData.langs.map(l => `<span class="stat-bubble-tag stat-bubble-tag--lang"><span class="stat-bubble-dot" style="background:${LANG_COLORS[l] || '#8b8b8b'}"></span> ${l}</span>`).join('')
      : '<div class="stat-bubble-sub">Loading...</div>';
    return `<div class="stat-bubble-title"><i class="fas fa-code"></i> Languages</div>
            <div class="stat-bubble-tags">${tags}</div>`;
  }
  return '';
}

function openBubble(card) {
  const type = card.dataset.stat;
  const bubble = document.createElement('div');
  bubble.className = 'stat-bubble';
  bubble.dataset.stat = type;
  bubble.innerHTML = buildBubbleHTML(type);

  // Prevent clicks inside bubble from closing it
  bubble.onmousedown = function(e) { e.stopPropagation(); };
  bubble.onclick = function(e) { e.stopPropagation(); };

  document.body.appendChild(bubble);

  // Position above the card
  const rect = card.getBoundingClientRect();
  bubble.style.left = (rect.left + rect.width / 2) + 'px';
  bubble.style.top = (rect.top - 12) + 'px';

  activeBubble = bubble;

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.classList.add('visible');
    });
  });
}

function initStatBubbles() {
  const cards = document.querySelectorAll('.stat-card[data-stat]');

  cards.forEach(card => {
    // Use mousedown + click to ensure we catch the event
    card.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const type = card.dataset.stat;
      const wasOpen = activeBubble && activeBubble.dataset.stat === type;

      closeBubble();

      if (!wasOpen) {
        // Small delay if we just closed one, otherwise immediate
        openBubble(card);
      }
    });
  });

  // Close bubble when clicking anywhere else
  document.addEventListener('click', function(e) {
    if (activeBubble && !e.target.closest('.stat-card[data-stat]')) {
      closeBubble();
    }
  });

  // Close on scroll
  window.addEventListener('scroll', function() {
    if (activeBubble) closeBubble();
  }, { passive: true });
}

// ==================== PATHOGEN DETECTION ====================
const PATHOGEN_PATTERNS = [
  { pattern: /cancer|tumor|tumour|carcinoma|leukemia|lymphoma|oncol/i, name: 'Cancer' },
  { pattern: /liquid biopsy|ctDNA|cell.?free/i, name: 'Liquid Biopsy' },
  { pattern: /massasauga|rattlesnake|sistrurus|crotalus/i, name: 'Rattlesnake' },
  { pattern: /quail|cyrtonyx|montezumae/i, name: 'Quail' },
  { pattern: /ophidiomyces|fungal disease|snake fungal/i, name: 'Fungal Disease' },
  { pattern: /juglans|walnut|butternut/i, name: 'Walnut' },
  { pattern: /bananaquit|coereba/i, name: 'Bananaquit' },
  { pattern: /pseudomonas/i, name: 'Pseudomonas' },
];

function detectPathogens(pubs) {
  const found = new Set();
  for (const pub of pubs) {
    const text = `${pub.title} ${pub.journal}`;
    for (const { pattern, name } of PATHOGEN_PATTERNS) {
      if (pattern.test(text)) found.add(name);
    }
  }
  return found;
}

// ==================== KEYWORD EXTRACTION ====================
const KEYWORD_PATTERNS = [
  { pattern: /cancer|tumor|oncol|carcinoma|leukemia/i, label: 'Cancer', icon: 'fa-ribbon' },
  { pattern: /population\s+genom|conservation\s+genom|genetic\s+diversity/i, label: 'Pop. Genomics', icon: 'fa-dna' },
  { pattern: /genetic\s+load|inbreeding|runs\s+of\s+homozygosity|ROH/i, label: 'Genetic Load', icon: 'fa-project-diagram' },
  { pattern: /rna.?seq|transcriptom|gene\s+expression/i, label: 'Transcriptomics', icon: 'fa-chart-line' },
  { pattern: /genome\s+assembl|de\s+novo|chromosome/i, label: 'Genome Assembly', icon: 'fa-layer-group' },
  { pattern: /phylogenom|phylogenet/i, label: 'Phylogenetics', icon: 'fa-sitemap' },
  { pattern: /bioinformatics|pipeline|workflow|nextflow|snakemake/i, label: 'Bioinformatics', icon: 'fa-laptop-code' },
  { pattern: /microsatellite|snp|variant|mutation/i, label: 'Variants', icon: 'fa-code-branch' },
  { pattern: /conservation|endangered|wildlife/i, label: 'Conservation', icon: 'fa-leaf' },
  { pattern: /immune|immunity|immuno/i, label: 'Immunogenomics', icon: 'fa-shield-alt' },
];

function extractKeywords(pub) {
  const text = `${pub.title} ${pub.journal}`;
  const kws = [];
  for (const { pattern, label } of KEYWORD_PATTERNS) {
    if (pattern.test(text) && !kws.includes(label)) kws.push(label);
  }
  return kws;
}

// ==================== PUBLICATION CHARTS ====================
let pubChartData = { yearCounts: {}, topicCounts: {}, pubs: [], pubKeywords: [] };

function buildCharts(pubs, pubKeywords) {
  // Store data for filter updates
  pubChartData.pubs = pubs;
  pubChartData.pubKeywords = pubKeywords;

  // Compute initial (unfiltered) data
  const yearCounts = {};
  const topicCounts = {};
  pubs.forEach((pub, i) => {
    if (pub.year) yearCounts[pub.year] = (yearCounts[pub.year] || 0) + 1;
    pubKeywords[i].forEach(kw => {
      topicCounts[kw] = (topicCounts[kw] || 0) + 1;
    });
  });
  pubChartData.yearCounts = yearCounts;
  pubChartData.topicCounts = topicCounts;

  renderYearChart(yearCounts, null);
  renderTopicChart(topicCounts, null);
}

function renderYearChart(counts, activeYear) {
  const container = document.getElementById('chartYearBars');
  if (!container) return;

  const years = Object.keys(counts).sort((a, b) => b - a);
  const max = Math.max(...Object.values(counts), 1);

  container.innerHTML = years.map(year => {
    const count = counts[year];
    const pct = (count / max) * 100;
    const isActive = activeYear && activeYear === year;
    const isDimmed = activeYear && activeYear !== 'all' && activeYear !== year;
    return `
      <div class="chart-bar-row${isActive ? ' active' : ''}" data-chart-year="${year}">
        <span class="chart-bar-label">${year}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill year${isDimmed ? ' dimmed' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="chart-bar-count">${count}</span>
      </div>`;
  }).join('');

  // Click to filter by year
  container.querySelectorAll('.chart-bar-row').forEach(row => {
    row.addEventListener('click', () => {
      const yr = row.dataset.chartYear;
      // Toggle: if already active, go back to 'all'
      const newYear = pubFilterState.year === yr ? 'all' : yr;
      pubFilterState.year = newYear;
      // Sync year filter buttons
      document.querySelectorAll('.pub-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.year === newYear);
      });
      applyPubFilters();
    });
  });
}

function renderTopicChart(counts, activeKeyword) {
  const container = document.getElementById('chartTopicBars');
  if (!container) return;

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(e => e[1]), 1);

  container.innerHTML = sorted.map(([label, count], i) => {
    const pct = (count / max) * 100;
    const kp = KEYWORD_PATTERNS.find(p => p.label === label);
    const icon = kp ? kp.icon : 'fa-tag';
    const isActive = activeKeyword && activeKeyword === label;
    const isDimmed = activeKeyword && activeKeyword !== 'all' && activeKeyword !== label;
    return `
      <div class="chart-bar-row${isActive ? ' active' : ''}" data-chart-topic="${label}">
        <span class="chart-bar-icon"><i class="fas ${icon}"></i></span>
        <span class="chart-bar-label">${label}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill topic-${i % 10}${isDimmed ? ' dimmed' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="chart-bar-count">${count}</span>
      </div>`;
  }).join('');

  // Click to filter by topic
  container.querySelectorAll('.chart-bar-row').forEach(row => {
    row.addEventListener('click', () => {
      const kw = row.dataset.chartTopic;
      const newKw = pubFilterState.keyword === kw ? 'all' : kw;
      pubFilterState.keyword = newKw;
      // Sync keyword filter buttons
      document.querySelectorAll('.pub-keyword-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.keyword === newKw);
      });
      applyPubFilters();
    });
  });
}

function updateCharts() {
  const { year, keyword, search } = pubFilterState;
  const searchLower = search.toLowerCase().trim();

  // Recount based on currently visible publications
  const filteredYearCounts = {};
  const filteredTopicCounts = {};

  pubChartData.pubs.forEach((pub, i) => {
    const matchYear = year === 'all' || String(pub.year) === year;
    const kws = pubChartData.pubKeywords[i];
    const matchKeyword = keyword === 'all' || kws.includes(keyword);

    // For text search filtering
    const text = `${pub.title} ${pub.journal || ''}`.toLowerCase();
    const matchSearch = !searchLower || text.includes(searchLower);

    if (matchKeyword && matchSearch) {
      if (pub.year) filteredYearCounts[pub.year] = (filteredYearCounts[pub.year] || 0) + 1;
    }
    if (matchYear && matchSearch) {
      kws.forEach(kw => {
        filteredTopicCounts[kw] = (filteredTopicCounts[kw] || 0) + 1;
      });
    }
  });

  renderYearChart(filteredYearCounts, year);
  renderTopicChart(filteredTopicCounts, keyword);
}

function renderPublications(pubs, citations) {
  const pubList = document.getElementById('pubList');
  const pubLoading = document.getElementById('pubLoading');
  const filtersEl = document.getElementById('pubFilters');
  const keywordsEl = document.getElementById('pubKeywords');

  // Update stats
  statData.pubs = pubs.length;
  document.getElementById('statPubs').textContent = pubs.length;
  document.getElementById('pubCountBadge').querySelector('span').textContent = pubs.length;

  // Detect research topics for ticker
  const pathogens = detectPathogens(pubs);
  statData.pathogens = [...pathogens];

  // Feed ticker
  tickerPathogens = [...pathogens];
  updateTicker();

  // Extract keywords per publication
  const allKeywords = new Map(); // label -> count
  const pubKeywords = pubs.map(pub => {
    const kws = extractKeywords(pub);
    kws.forEach(k => allKeywords.set(k, (allKeywords.get(k) || 0) + 1));
    return kws;
  });

  // Year filters
  const years = [...new Set(pubs.map(p => p.year).filter(Boolean))].sort((a, b) => b - a);
  if (filtersEl && years.length > 1) {
    filtersEl.innerHTML = `
      <button class="pub-filter-btn active" data-year="all">All</button>
      ${years.map(y => `<button class="pub-filter-btn" data-year="${y}">${y}</button>`).join('')}
    `;
    filtersEl.style.display = 'flex';
  }

  // Keyword filters (sorted by frequency)
  if (keywordsEl && allKeywords.size > 0) {
    const sorted = [...allKeywords.entries()].sort((a, b) => b[1] - a[1]);
    const kwIcon = (label) => {
      const kp = KEYWORD_PATTERNS.find(p => p.label === label);
      return kp ? kp.icon : 'fa-tag';
    };
    keywordsEl.innerHTML = `
      <button class="pub-keyword-btn active" data-keyword="all"><i class="fas fa-tags"></i> All topics</button>
      ${sorted.map(([label, count]) => `<button class="pub-keyword-btn" data-keyword="${label}"><i class="fas ${kwIcon(label)}"></i> ${label} <span style="opacity:0.5">${count}</span></button>`).join('')}
    `;
    keywordsEl.style.display = 'flex';
  }

  // Re-init filters with new buttons
  initPubFilters();

  // Build interactive charts
  buildCharts(pubs, pubKeywords);

  pubList.innerHTML = pubs.map((pub, i) => {
    const citCount = citations && pub.doi && citations[pub.doi] !== undefined
      ? citations[pub.doi] : null;
    const citHTML = pub.doi
      ? (citCount !== null
        ? `<span class="citation-badge" data-doi="${pub.doi}"><i class="fas fa-quote-right"></i> ${citCount}</span>`
        : `<span class="citation-badge loading" data-doi="${pub.doi}"><i class="fas fa-spinner fa-spin"></i></span>`)
      : '';

    const kws = pubKeywords[i];

    return `
      <article class="pub-item" data-year="${pub.year || ''}" data-keywords="${kws.join(',')}" style="animation-delay: ${i * 0.04}s">
        <span class="pub-year">${pub.year || '?'}</span>
        <div class="pub-content">
          <h3>${pub.title}</h3>
          ${pub.journal ? `<p class="pub-journal"><em>${pub.journal}</em></p>` : ''}
          <div class="pub-meta">
            ${pub.doi ? `<a href="https://doi.org/${pub.doi}" target="_blank" class="btn-pub"><i class="fas fa-external-link-alt"></i> DOI</a>` : ''}
            ${citHTML}
          </div>
        </div>
      </article>`;
  }).join('');

  pubLoading.style.display = 'none';
  const pubLayout = document.getElementById('pubLayout');
  if (pubLayout) pubLayout.style.display = '';

  if (citations) {
    const total = Object.values(citations).reduce((s, c) => s + (c || 0), 0);
    statData.citations = total;
    animateNumber('statCitations', total);
    document.getElementById('citCountBadge').querySelector('span').textContent = total;
  }
}

async function fetchPublications() {
  const pubLoading = document.getElementById('pubLoading');
  const cachedCitations = cacheGet('s2_citations');

  try {
    const res = await fetch(ORCID_API, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    const pubs = parseOrcidWorks(data.group || []);

    renderPublications(pubs, cachedCitations);

    if (!cachedCitations) {
      fetchAllCitations(pubs.filter(p => p.doi));
    } else {
      showCacheInfo('pubCacheInfo', ['s2_citations'], () => {
        cacheInvalidate('s2_citations');
        fetchAllCitations(pubs.filter(p => p.doi));
      });
    }
  } catch (err) {
    console.error('ORCID fetch error:', err);
    pubLoading.innerHTML = `<p style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i> Could not load publications.<br><a href="https://orcid.org/${ORCID_ID}" target="_blank">View on ORCID directly</a></p>`;
  }
}

async function fetchAllCitations(pubs) {
  const cached = cacheGet('s2_citations');
  if (cached) {
    let total = 0;
    for (const pub of pubs) {
      const count = cached[pub.doi] ?? null;
      if (count !== null) total += count;
      const badge = document.querySelector(`.citation-badge[data-doi="${pub.doi}"]`);
      if (badge) { badge.classList.remove('loading'); badge.innerHTML = `<i class="fas fa-quote-right"></i> ${count ?? '--'}`; }
    }
    statData.citations = total;
    animateNumber('statCitations', total);
    document.getElementById('citCountBadge').querySelector('span').textContent = total;
    return;
  }

  const citations = {};
  let totalCitations = 0;
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (const pub of pubs) {
    try {
      await delay(150);
      const res = await fetch(`${S2_API}${pub.doi}?fields=citationCount`);
      if (!res.ok) { citations[pub.doi] = 0; continue; }
      const data = await res.json();
      const count = data.citationCount || 0;
      citations[pub.doi] = count;
      totalCitations += count;
      const badge = document.querySelector(`.citation-badge[data-doi="${pub.doi}"]`);
      if (badge) { badge.classList.remove('loading'); badge.innerHTML = `<i class="fas fa-quote-right"></i> ${count}`; }
    } catch {
      citations[pub.doi] = 0;
      const badge = document.querySelector(`.citation-badge[data-doi="${pub.doi}"]`);
      if (badge) { badge.classList.remove('loading'); badge.innerHTML = `<i class="fas fa-quote-right"></i> --`; }
    }
  }

  cacheSet('s2_citations', citations);
  statData.citations = totalCitations;
  animateNumber('statCitations', totalCitations);
  document.getElementById('citCountBadge').querySelector('span').textContent = totalCitations;
  showCacheInfo('pubCacheInfo', ['s2_citations'], () => {
    cacheInvalidate('s2_citations');
    const el = document.getElementById('pubCacheInfo');
    if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing citations...';
    fetchAllCitations(pubs);
  });
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const duration = 1500;
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = Math.round(target * eased);
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ==================== DYNAMIC TICKER ====================
let tickerPathogens = [];
let tickerLangs = [];
let tickerState = { x: 0, speed: 0.25, dragging: false, startX: 0, startScroll: 0, velocity: 0, lastX: 0, lastTime: 0, halfWidth: 0, raf: null };

function updateTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const items = [];
  tickerPathogens.forEach(name => {
    items.push({ label: name, icon: 'fas ' + (PATHOGEN_ICONS[name] || 'fa-disease'), tab: 'publications' });
  });
  tickerLangs.forEach(name => {
    items.push({ label: name, icon: 'fas fa-code', tab: 'projects' });
  });

  if (items.length === 0) return;

  function buildSet() {
    return items.map(item =>
      `<a class="ticker-item" href="#${item.tab}" data-tab="${item.tab}"><i class="${item.icon}"></i> ${item.label}</a><span class="ticker-sep"></span>`
    ).join('');
  }

  const repeats = Math.max(4, Math.ceil(20 / items.length));
  let html = '';
  for (let i = 0; i < repeats; i++) html += buildSet();
  track.innerHTML = html + html;

  // Click handler
  track.querySelectorAll('.ticker-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (tickerState.dragging) { e.preventDefault(); return; }
      e.preventDefault();
      const link = document.querySelector(`.nav-link[data-tab="${el.dataset.tab}"]`);
      if (link) link.click();
    });
  });

  // Measure half-width for seamless looping
  requestAnimationFrame(() => {
    tickerState.halfWidth = track.scrollWidth / 2;
    if (!tickerState.raf) tickerAnimate();
  });

  initTickerDrag(track);
}

function tickerAnimate() {
  const track = document.getElementById('tickerTrack');
  if (!track || tickerState.halfWidth === 0) return;

  if (!tickerState.dragging) {
    // Apply momentum decay
    if (Math.abs(tickerState.velocity) > 0.1) {
      tickerState.x -= tickerState.velocity;
      tickerState.velocity *= 0.95;
    } else {
      tickerState.velocity = 0;
      tickerState.x -= tickerState.speed;
    }
  }

  // Seamless loop
  if (tickerState.x <= -tickerState.halfWidth) tickerState.x += tickerState.halfWidth;
  if (tickerState.x > 0) tickerState.x -= tickerState.halfWidth;

  track.style.transform = `translateX(${tickerState.x}px)`;
  tickerState.raf = requestAnimationFrame(tickerAnimate);
}

function initTickerDrag(track) {
  const s = tickerState;

  function pointerDown(clientX) {
    s.dragging = true;
    s.startX = clientX;
    s.startScroll = s.x;
    s.velocity = 0;
    s.lastX = clientX;
    s.lastTime = performance.now();
    track.classList.add('dragging');
  }

  function pointerMove(clientX) {
    if (!s.dragging) return;
    const dx = clientX - s.startX;
    s.x = s.startScroll + dx;

    const now = performance.now();
    const dt = now - s.lastTime;
    if (dt > 0) {
      s.velocity = -(clientX - s.lastX) / dt * 16;
    }
    s.lastX = clientX;
    s.lastTime = now;
  }

  function pointerUp() {
    if (!s.dragging) return;
    s.dragging = false;
    track.classList.remove('dragging');
  }

  // Mouse
  track.addEventListener('mousedown', (e) => { e.preventDefault(); pointerDown(e.clientX); });
  document.addEventListener('mousemove', (e) => pointerMove(e.clientX));
  document.addEventListener('mouseup', pointerUp);

  // Touch
  track.addEventListener('touchstart', (e) => pointerDown(e.touches[0].clientX), { passive: true });
  document.addEventListener('touchmove', (e) => { if (s.dragging) pointerMove(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchend', pointerUp);
}

// ==================== GITHUB REPOS ====================
const GH_USER = 'samarth8392';
const GH_LAB = 'ccbr';
const GH_LAB_API = `https://api.github.com/orgs/${GH_LAB}/repos?sort=updated&per_page=100`;
const GH_USER_API = `https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=100`;
// CCBR repos where @samarth8392 has contributed
const GH_MY_LAB_REPOS = ['CCBR_GATK4_Exome_Seq_Pipeline', 'CHAMPAGNE', 'CARLISLE', 'XAVIER', 'RENEE', 'ASPEN'];
// Personal repos to exclude
const GH_EXCLUDE = ['samarth8392.github.io'];
const GH_CACHE_KEY = 'gh_samarth8392_repos';

const LANG_COLORS = {
  Python: '#3572A5', R: '#198CE7', HTML: '#E34C26',
  JavaScript: '#F1E05A', Shell: '#89E051', Jupyter: '#DA5B0B',
  Nextflow: '#3AC486', Perl: '#0298c3', CSS: '#563d7c',
  Dockerfile: '#384d54', Makefile: '#427819', TypeScript: '#3178c6',
  Rust: '#DEA584',
};

let ghAllRepos = [];
let ghFilterLang = 'all';

function renderGitHubRepos(repos) {
  const grid = document.getElementById('ghGrid');
  const loading = document.getElementById('ghLoading');
  const filtersEl = document.getElementById('ghFilters');
  const chartsEl = document.getElementById('ghCharts');

  // Store all repos for filtering
  ghAllRepos = repos;

  // Count unique languages
  const langs = new Set(repos.map(r => r.language).filter(Boolean));
  statData.langs = [...langs];
  const langEl = document.getElementById('statLangs');
  if (langEl) animateNumber('statLangs', langs.size);
  if (langEl) langEl.title = [...langs].join(', ');

  // Feed ticker
  tickerLangs = [...langs];
  updateTicker();

  // Build language filter chips
  const langCounts = {};
  repos.forEach(r => {
    const l = r.language || 'Other';
    langCounts[l] = (langCounts[l] || 0) + 1;
  });
  const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

  if (filtersEl && sortedLangs.length > 1) {
    filtersEl.innerHTML = `
      <button class="gh-filter-btn active" data-lang="all"><i class="fas fa-layer-group"></i> All <span class="gh-filter-count">${repos.length}</span></button>
      ${sortedLangs.map(([lang, count]) => {
        const color = LANG_COLORS[lang] || '#8b8b8b';
        return `<button class="gh-filter-btn" data-lang="${lang}"><span class="gh-filter-dot" style="background:${color}"></span> ${lang} <span class="gh-filter-count">${count}</span></button>`;
      }).join('')}
    `;
    filtersEl.style.display = 'flex';

    filtersEl.querySelectorAll('.gh-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filtersEl.querySelectorAll('.gh-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ghFilterLang = btn.dataset.lang;
        applyGhFilter();
      });
    });
  }

  // Build tech chart
  renderTechChart(langCounts);

  // Render cards and show layout
  renderGhCards(repos);
  loading.style.display = 'none';
  const ghLayout = document.getElementById('ghLayout');
  if (ghLayout) ghLayout.style.display = '';
}

function renderTechChart(langCounts) {
  const container = document.getElementById('chartTechBars');
  if (!container) return;

  const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(e => e[1]), 1);

  container.innerHTML = sorted.map(([lang, count], i) => {
    const color = LANG_COLORS[lang] || '#8b8b8b';
    const pct = (count / max) * 100;
    const isActive = ghFilterLang === lang;
    const isDimmed = ghFilterLang !== 'all' && ghFilterLang !== lang;
    return `
      <div class="chart-bar-row${isActive ? ' active' : ''}" data-chart-lang="${lang}">
        <span class="chart-bar-icon"><span class="gh-lang-dot" style="background:${color};width:8px;height:8px;border-radius:50%;display:inline-block"></span></span>
        <span class="chart-bar-label">${lang}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill${isDimmed ? ' dimmed' : ''}" style="width:${pct}%;background:linear-gradient(90deg, ${color}, ${color}88)"></div>
        </div>
        <span class="chart-bar-count">${count}</span>
      </div>`;
  }).join('');

  // Click chart bars to filter
  container.querySelectorAll('.chart-bar-row').forEach(row => {
    row.addEventListener('click', () => {
      const lang = row.dataset.chartLang;
      ghFilterLang = ghFilterLang === lang ? 'all' : lang;
      const filtersEl = document.getElementById('ghFilters');
      if (filtersEl) {
        filtersEl.querySelectorAll('.gh-filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.lang === ghFilterLang);
        });
      }
      applyGhFilter();
    });
  });
}

function renderGhCards(repos) {
  const grid = document.getElementById('ghGrid');
  grid.innerHTML = repos.map((repo, i) => {
    const lang = repo.language || 'Other';
    const langColor = LANG_COLORS[lang] || '#8b8b8b';
    const desc = repo.description || 'No description';
    const updated = new Date(repo.updated_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    return `
      <a href="${repo.html_url}" target="_blank" class="gh-card gh-card--lab" data-lang="${lang}" style="animation-delay: ${i * 0.05}s">
        <div class="gh-card-header">
          <i class="fab fa-github"></i>
          <span class="gh-repo-name">${repo.name}</span>
          ${repo.owner.login.toLowerCase() === GH_LAB.toLowerCase() ? `<span class="gh-org-badge"><i class="fas fa-flask"></i> ${GH_LAB}</span>` : ''}
        </div>
        <p class="gh-desc">${desc}</p>
        <div class="gh-card-footer">
          <span class="gh-lang"><span class="gh-lang-dot" style="background:${langColor}"></span>${lang}</span>
          <span class="gh-meta"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
          <span class="gh-meta"><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
          <span class="gh-updated">${updated}</span>
        </div>
      </a>`;
  }).join('');
}

function applyGhFilter() {
  const filtered = ghFilterLang === 'all'
    ? ghAllRepos
    : ghAllRepos.filter(r => (r.language || 'Other') === ghFilterLang);

  renderGhCards(filtered);

  // Update chart highlighting
  const langCounts = {};
  const countSource = ghFilterLang === 'all' ? ghAllRepos : filtered;
  ghAllRepos.forEach(r => {
    const l = r.language || 'Other';
    langCounts[l] = (langCounts[l] || 0) + 1;
  });
  renderTechChart(langCounts);
}

async function fetchGitHubRepos() {
  const loading = document.getElementById('ghLoading');

  // Clear legacy cache keys
  localStorage.removeItem('gh_repos');
  localStorage.removeItem('gh_lab_repos');

  const cached = cacheGet(GH_CACHE_KEY);
  if (cached) {
    renderGitHubRepos(cached);
    showCacheInfo('ghCacheInfo', [GH_CACHE_KEY], fetchGitHubRepos);
    return;
  }

  try {
    const labSet = new Set(GH_MY_LAB_REPOS.map(n => n.toLowerCase()));
    const excludeSet = new Set(GH_EXCLUDE.map(n => n.toLowerCase()));
    let labRepos = [];
    let userRepos = [];

    // Fetch lab repos (only the ones @samarth8392 contributed to)
    try {
      const res = await fetch(GH_LAB_API);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) labRepos = data.filter(r => !r.fork && !r.archived && labSet.has(r.name.toLowerCase()));
      }
    } catch { /* fall through */ }

    // Fallback for lab repos: fetch individually
    if (labRepos.length === 0) {
      const results = await Promise.all(
        GH_MY_LAB_REPOS.map(name =>
          fetch(`https://api.github.com/repos/${GH_LAB}/${name}`).catch(() => null)
        )
      );
      for (const res of results) {
        if (res && res.ok) {
          const repo = await res.json();
          if (repo && repo.name) labRepos.push(repo);
        }
      }
    }

    // Fetch personal repos
    try {
      const res = await fetch(GH_USER_API);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) userRepos = data.filter(r => !r.fork && !r.archived && !excludeSet.has(r.name.toLowerCase()));
      }
    } catch { /* ignore */ }

    // Merge and deduplicate
    const seen = new Set();
    const repos = [];
    for (const r of [...labRepos, ...userRepos]) {
      const key = r.full_name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); repos.push(r); }
    }

    if (repos.length === 0) throw new Error('No repos loaded');

    const sorted = repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    cacheSet(GH_CACHE_KEY, sorted);
    renderGitHubRepos(sorted);
    showCacheInfo('ghCacheInfo', [GH_CACHE_KEY], fetchGitHubRepos);
  } catch (err) {
    console.error('GitHub fetch error:', err);
    loading.innerHTML = `<p style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i> Could not load repositories.<br><a href="https://github.com/${GH_USER}" target="_blank">View on GitHub directly</a></p>`;
  }
}
