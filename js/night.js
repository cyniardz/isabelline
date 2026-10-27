(function () {
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const token = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

  const T = { flameR: 220, glowR: 170, darkStart: 0.9, darkLit: 0.55, darkExplore: 0.92 };

  const el = {
    intro: $("#intro"),
    frame: $("#introFrame"),
    introVideo: $("#introVideo"),
    loopVideo: $("#loopVideo"),
    knock: $("#introKnock"),
    ambient: $("#ambient"),
    line: $("#introLine"),
    steps: Array.from(document.querySelectorAll("#introSteps li")),
    art: $("#heroArt"),
    heroOn: $("#heroOn"),
    flicker: $("#heroFlicker"),
    spots: Array.from(document.querySelectorAll(".spot")),
    title: $("#nightTitle"),
    heroGuide: $("#heroGuide"),
    explore: $("#explore"),
    scent: $("#scent"),
    grid: $("#exploreGrid"),
    panel: $("#panel"),
    panelBody: $("#panelBody"),
    exploreCount: $("#exploreCount"),
    scentList: $("#scentList"),
    canvas: $("#dark"),
    flame: $("#flame"),
    standBtn: $("#standBtn"),
    fade: $("#fade"),
    smoke: $("#smoke"),
    cue: $("#scrollcue"),
    cueArrow: $("#cueArrow"),
    cueText: $("#cueText")
  };

  let state = ISB.nightState();
  let mode = "intro";
  let zone = "hero";
  let holding = false;
  let locked = false;
  let flameOut = false;
  let forceTarget = null;
  let dark = 1;
  let darkTarget = 1;
  let glowK = 1;
  let glowTarget = 1;
  let cards = [];
  let lastMask = "";
  let panelId = null;
  let focusId = null;
  let focusAt = 0;
  const ignite = {};
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const vel = { x: 0, y: 0 };

  const save = () => ISB.saveNight(state);

  /* Holding the flame */
  function hold(x, y) {
    holding = true;
    body.classList.add("is-holding");
    body.classList.remove("is-standing");
    if (x != null) {
      pointer.x = pos.x = x;
      pointer.y = pos.y = y;
    }
  }

  function standUp() {
    holding = false;
    body.classList.remove("is-holding");
    body.classList.add("is-standing");
  }

  function standPoint() {
    const r = el.standBtn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
  }

  el.standBtn.addEventListener("click", (e) => {
    const p = standPoint();
    hold(e.clientX || p.x, e.clientY || p.y);
  });

  window.addEventListener("mousemove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!holding) return;
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
    },
    { passive: true }
  );

  /* Intro */
  const posters = [new Image(), new Image()];
  posters[0].src = el.introVideo.getAttribute("poster");
  posters[1].src = el.loopVideo.getAttribute("poster");
  const actx = el.ambient.getContext("2d");
  let lineKey = "";

  function setLine(key) {
    if (key === lineKey) return;
    lineKey = key;
    el.line.classList.remove("is-on");
    setTimeout(() => {
      el.line.dataset.i18n = key;
      el.line.innerHTML = ISB.t(key);
      el.line.classList.add("is-on");
    }, 350);
  }

  function setStep(n) {
    el.steps.forEach((s, i) => s.classList.toggle("is-on", i === n));
  }

  function introTick() {
    if (mode !== "intro" && mode !== "opening") return;
    const loop = el.intro.classList.contains("is-loop");
    const v = loop ? el.loopVideo : el.introVideo;
    try {
      if (v.readyState >= 2) actx.drawImage(v, 0, 0, 64, 36);
      else actx.drawImage(posters[loop ? 1 : 0], 0, 0, 64, 36);
    } catch (e) {}
    if (loop) {
      setLine("intro.l4");
      setStep(1);
    } else if (el.intro.classList.contains("is-playing")) {
      if (el.introVideo.currentTime > 4.9) {
        setLine("intro.l3");
        setStep(1);
      } else setLine("intro.l2");
    }
  }

  function preloadVideo(video) {
    fetch(video.getAttribute("src"))
      .then((r) => r.blob())
      .then((b) => {
        if (!video.currentTime) video.src = URL.createObjectURL(b);
      })
      .catch(() => {});
  }

  function startIntro() {
    mode = "intro";
    preloadVideo(el.introVideo);
    preloadVideo(el.loopVideo);
    body.classList.add("is-intro");
    setTimeout(() => {
      el.intro.classList.add("is-ready");
      setLine("intro.l1");
    }, 150);
    setTimeout(() => el.intro.classList.add("is-clickable"), 1700);
  }

  function toLoop() {
    el.loopVideo.play().catch(() => {});
    el.intro.classList.add("is-loop");
    el.intro.classList.remove("is-playing");
  }

  function knock() {
    if (mode !== "intro" || !el.intro.classList.contains("is-clickable")) return;
    if (el.intro.classList.contains("is-playing") || el.intro.classList.contains("is-loop")) return;
    el.intro.classList.add("is-playing");
    el.introVideo.play().catch(toLoop);
  }

  el.introVideo.addEventListener("ended", toLoop);
  el.knock.addEventListener("click", (e) => {
    e.stopPropagation();
    knock();
  });

  el.intro.addEventListener("click", (e) => {
    if (mode !== "intro") return;
    if (el.intro.classList.contains("is-loop")) return takeFromVideo(e);
    const r = el.frame.getBoundingClientRect();
    if (e.clientX > r.left + r.width * 0.33 && e.clientX < r.right - r.width * 0.33 && e.clientY > r.top && e.clientY < r.bottom) knock();
  });

  function takeFromVideo(e) {
    mode = "opening";
    state.entered = true;
    state.scene = "hero";
    save();
    const r = el.frame.getBoundingClientRect();
    const sc = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.02;
    el.frame.style.setProperty("--s", sc.toFixed(3));
    el.intro.classList.add("is-opening");
    setStep(2);
    hold(e.clientX, e.clientY);
    setTimeout(() => {
      dark = 1;
      enterMain();
      el.intro.classList.add("is-gone");
    }, 650);
    setTimeout(() => el.loopVideo.pause(), 1700);
  }

  function enterMain() {
    mode = "main";
    body.classList.remove("is-intro");
    el.introVideo.pause();
  }

  function skipIntro() {
    el.intro.style.transition = "none";
    el.intro.classList.add("is-gone");
    enterMain();
  }

  /* Lighting */
  let spreading = false;
  function lightHero(i) {
    if (state.hero.includes(i)) return;
    state.hero.push(i);
    ignite["h" + i] = performance.now();
    save();
    renderHeroState();
    updateTargets();
  }

  function lightAllFrom(start) {
    if (spreading || state.hero.length >= 5) return;
    spreading = true;
    const from = spotPoint(start);
    el.spots
      .map((s, i) => ({ i, d: Math.hypot(spotPoint(i).x - from.x, spotPoint(i).y - from.y) }))
      .sort((a, b) => a.d - b.d)
      .forEach((o, n) => setTimeout(() => lightHero(o.i), n * 110));
    setTimeout(() => (spreading = false), 650);
  }

  function lightCard(id) {
    if (state.explore.includes(id)) return;
    state.explore.push(id);
    ignite["e" + id] = performance.now();
    save();
    renderExploreState();
    updateTargets();
  }

  function renderHeroState() {
    const all = state.hero.length >= 5;
    el.art.classList.toggle("is-all", all);
    el.heroGuide.dataset.i18n = all ? "night.guideDone" : "night.guideHero";
    el.heroGuide.innerHTML = ISB.t(el.heroGuide.dataset.i18n);
  }

  function renderExploreState() {
    el.exploreCount.textContent = state.explore.length;
    cards.forEach((c) => c.el.classList.toggle("is-lit", state.explore.includes(c.id)));
  }

  function spotPoint(i) {
    const r = el.art.getBoundingClientRect();
    const s = el.spots[i];
    return { x: r.left + (r.width * parseFloat(s.style.left)) / 100, y: r.top + (r.height * parseFloat(s.style.top)) / 100 };
  }

  function cardRect(c) {
    return c.img.getBoundingClientRect();
  }

  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const igniteK = (key, now) => (ignite[key] ? ease((now - ignite[key]) / 700) : 1);

  function updateTargets() {
    if (zone === "hero") darkTarget = state.hero.length >= 5 ? T.darkLit : T.darkStart;
    else if (zone === "explore") darkTarget = state.explore.length >= 6 ? T.darkLit : T.darkExplore;
  }

  function detect(now) {
    if (!holding || locked || mode !== "main") return;
    const fx = pos.x;
    const fy = pos.y - 14;
    if (zone === "hero") {
      el.spots.forEach((s, i) => {
        const p = spotPoint(i);
        if (Math.hypot(fx - p.x, fy - p.y) < 56) lightAllFrom(i);
      });
    } else if (zone === "explore") {
      let over = null;
      cards.forEach((c) => {
        const r = cardRect(c);
        const ix = r.width * 0.2;
        if (fx > r.left + ix && fx < r.right - ix && fy > r.top + r.height * 0.12 && fy < r.bottom - r.height * 0.12) {
          over = c.id;
          lightCard(c.id);
        }
      });
      if (over !== focusId) {
        focusId = over;
        focusAt = now;
      } else if (over && now - focusAt > 150) showPanel(over);
    }
  }

  function updateHeroMask(now) {
    const parts = state.hero.map((i) => {
      const s = el.spots[i];
      const r = (7 * igniteK("h" + i, now)).toFixed(2);
      return "radial-gradient(circle at " + s.style.left + " " + s.style.top + ", #000 0%, #000 " + (r * 0.35).toFixed(2) + "%, transparent " + r + "%)";
    });
    const mask = parts.length ? parts.join(",") : "linear-gradient(transparent, transparent)";
    if (mask !== lastMask) {
      el.heroOn.style.webkitMaskImage = mask;
      el.heroOn.style.maskImage = mask;
      lastMask = mask;
    }
  }

  /* Panel: the name lights up, the rest clears like smoke */
  function panelHtml(p) {
    return (
      '<p class="panel__no panel__fade">' + p.no + "</p>" +
      '<h3 class="panel__name">' + ISB.l(p.name) + "</h3>" +
      '<p class="panel__line panel__fade">' + ISB.l(p.line) + "</p>" +
      '<p class="panel__notes panel__fade">' + ISB.l(p.notes) + "</p>" +
      '<p class="panel__price panel__fade">' + ISB.won(p.price) + "</p>" +
      '<a class="panel__link panel__fade" href="product.html?id=' + p.id + '">' + ISB.t("p.view") + ' <span class="arrow">→</span></a>'
    );
  }

  function showPanel(id, force) {
    if (id === panelId && !force) return;
    panelId = id;
    const p = ISB.product(id);
    if (!p) return;
    el.panel.classList.add("is-out");
    el.panel.classList.remove("is-in");
    clearTimeout(showPanel.t);
    showPanel.t = setTimeout(() => {
      el.panelBody.innerHTML = panelHtml(p);
      el.panel.classList.remove("is-out");
      void el.panel.offsetWidth;
      el.panel.classList.add("is-in");
    }, force ? 0 : 200);
  }

  /* Darkness */
  const ctx = el.canvas.getContext("2d");
  let W = 0;
  let H = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth;
    H = innerHeight;
    el.canvas.width = W * dpr;
    el.canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T.flameR = token("--flame-radius") || 220;
    T.glowR = token("--glow-radius") || 170;
    T.darkStart = token("--dark-start") || 0.9;
    T.darkLit = token("--dark-lit") || 0.55;
    updateTargets();
  }

  function hole(x, y, r, s) {
    if (r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0," + s + ")");
    g.addColorStop(0.4, "rgba(0,0,0," + s * 0.88 + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function warm(x, y, r, a) {
    if (r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(252,170,96," + a + ")");
    g.addColorStop(1, "rgba(252,170,96,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function draw(now, flick) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(11,10,10," + dark.toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
    const lights = [];
    if ((holding || forceTarget) && !flameOut) lights.push([pos.x, pos.y - 14, T.flameR * flick, 1]);
    else if (body.classList.contains("is-standing")) {
      const p = standPoint();
      lights.push([p.x, p.y, T.flameR * 0.7 * flick, 1]);
    }
    if (zone === "hero") {
      state.hero.forEach((i, n) => {
        const p = spotPoint(i);
        lights.push([p.x, p.y, T.glowR * igniteK("h" + i, now) * (0.97 + 0.03 * Math.sin(now / 170 + n)), 0.72 * glowK]);
      });
    }
    cards.forEach((c, n) => {
      if (!state.explore.includes(c.id)) return;
      const r = cardRect(c);
      if (r.bottom < 0 || r.top > H) return;
      lights.push([r.left + r.width / 2, r.top + r.height * 0.45, T.glowR * 0.95 * igniteK("e" + c.id, now) * (0.97 + 0.03 * Math.sin(now / 160 + n)), 0.72 * glowK]);
    });
    ctx.globalCompositeOperation = "destination-out";
    lights.forEach((l) => hole(l[0], l[1], l[2], l[3]));
    ctx.globalCompositeOperation = "source-over";
    const tint = Math.min(1, dark / 0.9);
    lights.forEach((l) => warm(l[0], l[1], l[2] * 1.05, 0.09 * l[3] * tint));
  }

  /* Zones follow the scroll */
  function readZone() {
    const vh = innerHeight;
    const s = el.scent.getBoundingClientRect().top;
    const e = el.explore.getBoundingClientRect().top;
    if (s <= vh * 0.55) return "out";
    if (e <= vh * 0.5) return "explore";
    return "hero";
  }

  function setZone(z) {
    if (z === zone) return;
    const prev = zone;
    zone = z;
    body.classList.toggle("zone-explore", z === "explore");
    state.scene = z === "out" ? "scent" : z;
    save();
    if (z === "out" && !flameOut) extinguish();
    if (prev === "out" && z !== "out" && !locked) relight();
    updateTargets();
    el.cue.classList.toggle("is-up", z === "out");
    el.cueArrow.textContent = z === "out" ? "↑" : "↓";
    el.cueText.dataset.i18n = z === "out" ? "night.scrollUp" : "night.scroll";
    el.cueText.innerHTML = ISB.t(el.cueText.dataset.i18n);
  }

  function lockScroll(on) {
    locked = on;
    body.classList.toggle("is-locked", on);
  }

  ["wheel", "touchmove"].forEach((ev) =>
    window.addEventListener(
      ev,
      (e) => {
        if (locked || mode !== "main") e.preventDefault();
      },
      { passive: false }
    )
  );

  window.addEventListener("keydown", (e) => {
    if ((locked || mode !== "main") && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) e.preventDefault();
  });

  function extinguish() {
    lockScroll(true);
    window.scrollTo({ top: el.scent.offsetTop, behavior: "smooth" });
    const cx = innerWidth / 2;
    const cy = innerHeight / 2;
    if (!holding) {
      const p = standPoint();
      body.classList.remove("is-standing");
      hold(p.x, p.y);
    }
    forceTarget = { x: cx, y: cy };
    glowTarget = 0;
    setTimeout(() => {
      flameOut = true;
      el.flame.classList.add("is-out");
      body.classList.remove("is-holding");
      holding = false;
      darkTarget = 1;
      body.classList.add("zone-out");
    }, 500);
    setTimeout(() => {
      el.smoke.style.left = cx + "px";
      el.smoke.style.top = cy - 24 + "px";
      el.fade.classList.add("is-on", "is-smoke");
    }, 800);
    setTimeout(() => {
      el.fade.className = "fade";
      el.flame.classList.remove("is-out");
      forceTarget = null;
      lockScroll(false);
      window.scrollTo({ top: el.scent.offsetTop, behavior: "instant" });
    }, 2700);
  }

  function relight() {
    flameOut = false;
    glowTarget = 1;
    dark = 1;
    body.classList.remove("zone-out");
    standUp();
  }

  /* Main loop */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - lastT);
    lastT = now;
    introTick();
    const target = forceTarget || pointer;
    const k = forceTarget ? 0.08 : 0.3;
    const px = pos.x;
    const py = pos.y;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    vel.x = vel.x * 0.8 + (pos.x - px) * 0.2;
    vel.y = vel.y * 0.8 + (pos.y - py) * 0.2;
    const speed = Math.hypot(vel.x, vel.y);
    const flick = 1 + 0.025 * Math.sin(now / 90) + 0.018 * Math.sin(now / 37) + Math.min(0.06, speed * 0.004) * Math.sin(now / 23);
    const tilt = Math.max(-20, Math.min(20, -vel.x * 1.4));
    el.flame.style.transform = "translate(" + pos.x + "px," + pos.y + "px) rotate(" + tilt.toFixed(1) + "deg)";

    if (mode === "main") {
      if (!locked) setZone(readZone());
      dark += (darkTarget - dark) * Math.min(1, dt / 260);
      glowK += (glowTarget - glowK) * Math.min(1, dt / 200);
      detect(now);
      updateHeroMask(now);
      if (zone !== "out" || locked) draw(now, flick);
      const tr = el.title.getBoundingClientRect();
      if (holding && tr.bottom > 0) {
        const hx = ((pos.x - tr.left) / tr.width) * 100;
        const hy = ((pos.y - 14 - tr.top) / tr.height) * 100;
        el.title.style.setProperty("--hx", Math.max(-30, Math.min(130, hx)).toFixed(1) + "%");
        el.title.style.setProperty("--hy", Math.max(-80, Math.min(220, hy)).toFixed(1) + "%");
      }
    }
    requestAnimationFrame(frame);
  }

  /* Rendering from JSON */
  const HERO_FLAMES = [[48.55,57.27,3.2],[88.62,48.73,2.21],[14.94,23.36,2.09],[17.33,29.29,2.07],[28.36,54.65,2.02],[11.42,31.07,2.02],[50.77,73.65,1.9],[51.92,63.84,1.81],[65.91,67.59,1.81],[46.43,73.72,1.81],[69.43,49.27,1.8],[39.5,53.62,1.79],[5.81,42.08,1.76],[90.41,12.97,1.72],[91.21,47.32,1.65],[48.76,73.85,1.65],[77.14,30.55,1.63],[87.16,32.05,1.62],[57.83,42.63,1.62],[37.85,55.7,1.6],[36.52,52.56,1.58],[91.04,52.62,1.54],[91.7,16.55,1.51],[51.92,70.53,1.5],[15.48,29.26,1.48],[88.97,50.92,1.48]];

  function flick(x, y, r) {
    const d = (0.55 + Math.random() * 0.6).toFixed(2);
    const delay = (-Math.random() * 2).toFixed(2);
    return '<span class="flick" style="left:' + x + "%;top:" + y + "%;--d:" + d + "s;--delay:" + delay + "s" + (r ? ";--r:" + (r * 2.2).toFixed(2) + "%" : "") + '"></span>';
  }

  function renderExplore() {
    const list = ISB.products.filter((p) => p.group === "limited");
    el.grid.innerHTML = list
      .map((p) => {
        const fx = p.flame ? ((p.flame[0] - 12.5) / 0.75).toFixed(2) : null;
        return (
          '<a class="ecard" data-id="' + p.id + '" href="product.html?id=' + p.id + '">' +
          '<div class="ecard__img"><img class="off" src="' + ISB.img(p.images.off) + '" alt="' + ISB.l(p.name) + '">' +
          '<img class="on" src="' + ISB.img(p.images.on) + '" alt="" loading="lazy">' +
          (p.flame ? flick(fx, p.flame[1]) : "") + "</div>" +
          '<div class="caption"><span class="caption__no">' + p.no + '</span><span class="caption__name">' + ISB.l(p.name) + "</span></div></a>"
        );
      })
      .join("");
    cards = Array.from(el.grid.querySelectorAll(".ecard")).map((c) => ({ el: c, id: c.dataset.id, img: c.querySelector(".ecard__img") }));
    cards.forEach((c) => c.el.addEventListener("mouseenter", () => !holding && showPanel(c.id)));
    renderExploreState();
  }

  function renderScent() {
    el.scentList.innerHTML = ISB.products
      .filter((p) => p.group === "scent")
      .map(
        (p) =>
          '<a class="scard" href="product.html?id=' + p.id + '">' +
          (p.images.main
            ? '<div class="scard__img"><img src="' + ISB.img(p.images.main) + '" alt="' + ISB.l(p.name) + '" loading="lazy"></div>'
            : '<div class="scard__img is-empty">' + ISB.t("p.soon") + "</div>") +
          '<div class="caption"><span class="caption__no">' + p.no + '</span><span class="caption__name">' + ISB.l(p.name) +
          '</span><span class="caption__price">' + ISB.won(p.price) + "</span></div>" +
          '<p class="scard__line">' + ISB.l(p.line) + "</p></a>"
      )
      .join("");
  }

  /* Links inside the night page */
  function sectionFor(hash) {
    return hash === "#explore" ? el.explore : hash === "#scent" ? el.scent : document.getElementById("top");
  }

  function go(hash, instant) {
    if (mode !== "main") {
      state.entered = true;
      save();
      skipIntro();
      standUp();
    }
    const target = sectionFor(hash);
    if (target) window.scrollTo({ top: target.offsetTop, behavior: instant ? "instant" : "smooth" });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !a.hash || a.pathname !== location.pathname) return;
    if (["#top", "#explore", "#scent"].includes(a.hash)) {
      e.preventDefault();
      go(a.hash);
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && mode === "main" && holding) standUp();
  });
  window.addEventListener("resize", resize);

  ISB.onLang(() => {
    renderExplore();
    renderScent();
    renderHeroState();
    if (panelId) showPanel(panelId, true);
  });

  const arrive = document.getElementById("arrive");
  if (ISB.store.get("isb-arrive", false, true)) {
    ISB.store.remove("isb-arrive", true);
    arrive.classList.add("is-on");
    setTimeout(() => arrive.classList.add("is-off"), 400);
    setTimeout(() => arrive.classList.remove("is-on", "is-off"), 1800);
  }

  ISB.onReady(() => {
    resize();
    el.flicker.innerHTML = HERO_FLAMES.map((f) => flick(f[0], f[1], f[2])).join("");
    renderExplore();
    renderScent();
    renderHeroState();
    updateHeroMask(performance.now());

    const hash = location.hash;
    if (hash) history.replaceState(null, "", location.pathname);
    if (!state.entered && !hash) {
      startIntro();
    } else {
      state.entered = true;
      save();
      skipIntro();
      standUp();
      const saved = hash || (state.scene === "scent" ? "#scent" : state.scene === "explore" ? "#explore" : "#top");
      requestAnimationFrame(() => {
        go(saved, true);
        zone = readZone();
        if (zone === "out") {
          flameOut = true;
          body.classList.add("zone-out");
          body.classList.remove("is-standing");
        }
        body.classList.toggle("zone-explore", zone === "explore");
        const z = zone;
        zone = "";
        setZone(z);
        updateTargets();
      });
    }
    requestAnimationFrame(frame);
  });
})();
