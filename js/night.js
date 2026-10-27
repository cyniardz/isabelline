(function () {
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const rootStyle = () => getComputedStyle(document.documentElement);
  const token = (name) => parseFloat(rootStyle().getPropertyValue(name));

  const T = {
    flameR: 220,
    glowR: 170,
    darkStart: 0.9,
    darkLit: 0.55,
    darkExplore: 0.92
  };

  const el = {
    intro: $("#intro"),
    hero: $("#hero"),
    explore: $("#explore"),
    introVideo: $("#introVideo"),
    loopVideo: $("#loopVideo"),
    cue: $("#introCue"),
    art: $("#heroArt"),
    heroOn: $("#heroOn"),
    spots: Array.from(document.querySelectorAll(".spot")),
    grid: $("#exploreGrid"),
    guide: $("#exploreGuide"),
    heroGuide: $("#heroGuide"),
    exploreCount: $("#exploreCount"),
    canvas: $("#dark"),
    flame: $("#flame"),
    stand: $("#stand"),
    standBtn: $("#standBtn"),
    fade: $("#fade"),
    smoke: $("#smoke"),
    scrollArea: $("#scrollArea"),
    scentList: $("#scentList"),
    eventPrice: $("#eventPrice"),
    bars: Array.from(document.querySelectorAll(".scrollcue i"))
  };

  let state = ISB.nightState();
  let mode = "intro";
  let scene = null;
  let holding = false;
  let locked = false;
  let flameOut = false;
  let hintShown = false;
  let forceTarget = null;
  let dark = 1;
  let darkTarget = 1;
  let cards = [];
  let lastMask = "";
  let glowK = 1;
  let glowTarget = 1;
  const ignite = {};
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const vel = { x: 0, y: 0 };

  const save = () => ISB.saveNight(state);

  /* HUD and scenes */
  function showHud(name) {
    document.querySelectorAll("[data-hud]").forEach((g) => {
      const n = g.dataset.hud;
      const on = n === name || (n === "cue" && (name === "hero" || name === "explore"));
      g.classList.toggle("is-active", on);
    });
  }

  function updateTargets() {
    if (scene === "hero") darkTarget = state.hero.length >= 5 ? T.darkLit : T.darkStart;
    else if (scene === "explore") darkTarget = state.explore.length >= 6 ? T.darkLit : T.darkExplore;
  }

  function setScene(name) {
    glowTarget = 1;
    mode = "scenes";
    scene = name;
    body.classList.add("is-scenes");
    body.classList.remove("is-scroll", "is-intro");
    el.scrollArea.classList.remove("is-shown");
    el.intro.classList.remove("is-active");
    el.hero.classList.toggle("is-active", name === "hero");
    el.explore.classList.toggle("is-active", name === "explore");
    body.classList.toggle("in-explore", name === "explore");
    showHud(name);
    state.scene = name;
    save();
    ticks.reset();
    updateTargets();
  }

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

  function enterIfNeeded() {
    if (state.entered) return;
    state.entered = true;
    save();
    el.introVideo.pause();
    el.loopVideo.pause();
  }

  /* Intro: door, knock, candle */
  function startIntro() {
    preloadVideo(el.introVideo);
    preloadVideo(el.loopVideo);
    mode = "intro";
    body.classList.add("is-intro", "is-scenes");
    el.intro.classList.add("is-active");
    el.hero.classList.add("is-active");
    showHud(null);
  }

  function toLoop() {
    el.loopVideo.play().catch(() => {});
    el.intro.classList.add("is-loop");
    el.intro.classList.remove("is-playing");
    el.cue.dataset.i18n = "night.take";
    el.cue.innerHTML = ISB.t("night.take");
  }

  function takeFromVideo(e) {
    state.entered = true;
    save();
    dark = 1;
    setScene("hero");
    hold(e.clientX, e.clientY);
    setTimeout(() => el.loopVideo.pause(), 1000);
  }

  el.intro.addEventListener("click", (e) => {
    if (mode !== "intro") return;
    if (el.intro.classList.contains("is-loop")) return takeFromVideo(e);
    if (el.intro.classList.contains("is-playing")) return;
    el.intro.classList.add("is-playing");
    el.introVideo.play().catch(toLoop);
  });
  el.introVideo.addEventListener("ended", toLoop);

  function preloadVideo(video) {
    const src = video.getAttribute("src");
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        if (!video.currentTime) video.src = URL.createObjectURL(b);
      })
      .catch(() => {});
  }

  /* Scroll ticks: the screen stays still, three scrolls move to the next scene */
  const ticks = {
    count: 0,
    dir: 0,
    acc: 0,
    last: 0,
    idle: null,
    reset() {
      this.count = 0;
      this.acc = 0;
      renderBars();
    },
    push(delta) {
      if (locked) return;
      const now = performance.now();
      const d = Math.sign(delta);
      if (!d) return;
      if (d !== this.dir) {
        this.dir = d;
        this.count = 0;
        this.acc = 0;
      }
      this.acc += Math.abs(delta);
      if (now - this.last < 380 || this.acc < 60) return;
      this.acc = 0;
      this.last = now;
      this.count += 1;
      renderBars();
      clearTimeout(this.idle);
      this.idle = setTimeout(() => this.reset(), 1600);
      if (this.count >= 3) {
        this.count = 0;
        this.last = now + 700;
        renderBars();
        advance(d);
      }
    }
  };

  function renderBars() {
    el.bars.forEach((b, i) => b.classList.toggle("is-on", i < ticks.count));
  }

  function advance(dir) {
    if (mode === "scroll") {
      if (dir < 0) backToExplore();
      return;
    }
    if (mode !== "scenes") return;
    if (scene === "hero" && dir > 0) setScene("explore");
    else if (scene === "explore" && dir < 0) setScene("hero");
    else if (scene === "explore" && dir > 0) {
      if (!state.explore.length && !hintShown) showHint();
      else extinguish();
    }
  }

  function showHint() {
    hintShown = true;
    el.guide.dataset.i18n = "night.hintExplore";
    el.guide.innerHTML = ISB.t("night.hintExplore");
    el.guide.classList.add("is-hint");
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (mode === "scenes") {
        e.preventDefault();
        ticks.push(e.deltaY);
      } else if (mode === "scroll" && window.scrollY <= 0 && e.deltaY < 0) {
        ticks.push(e.deltaY);
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (mode === "intro" && (e.key === "Enter" || e.key === " ")) return;
    const down = ["ArrowDown", "PageDown", " "].includes(e.key);
    const up = ["ArrowUp", "PageUp"].includes(e.key);
    if (!down && !up) return;
    if (mode === "scenes") {
      e.preventDefault();
      ticks.last = 0;
      ticks.push(down ? 100 : -100);
    } else if (mode === "scroll" && up && window.scrollY <= 0) {
      ticks.last = 0;
      ticks.push(-100);
    }
  });

  let touch = null;
  window.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, time: performance.now() };
      if (holding) {
        pointer.x = t.clientX;
        pointer.y = t.clientY;
      }
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (holding) {
        pointer.x = t.clientX;
        pointer.y = t.clientY;
      }
      if (mode === "scenes") e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dy = touch.y - t.clientY;
    const dt = performance.now() - touch.time;
    touch = null;
    if (Math.abs(dy) < 60 || dt > 450) return;
    if (mode === "scenes" || (mode === "scroll" && window.scrollY <= 0 && dy < 0)) advance(Math.sign(dy));
  });

  window.addEventListener("mousemove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  el.standBtn.addEventListener("click", (e) => {
    const p = standPoint();
    hold(e.clientX || p.x, e.clientY || p.y);
  });

  /* Lighting */
  function lightHero(i) {
    if (state.hero.includes(i)) return;
    state.hero.push(i);
    ignite["h" + i] = performance.now();
    save();
    renderHeroState();
    updateTargets();
  }

  function lightCard(id) {
    if (state.explore.includes(id)) return;
    state.explore.push(id);
    ignite["e" + id] = performance.now();
    save();
    renderExploreState();
    updateTargets();
  }

  let spreading = false;
  function lightAllFrom(start) {
    if (spreading || state.hero.length >= 5) return;
    spreading = true;
    const from = spotPoint(start);
    const order = el.spots
      .map((s, i) => ({ i, d: Math.hypot(spotPoint(i).x - from.x, spotPoint(i).y - from.y) }))
      .sort((a, b) => a.d - b.d);
    order.forEach((o, n) => setTimeout(() => lightHero(o.i), n * 110));
    setTimeout(() => (spreading = false), order.length * 110 + 50);
  }

  el.spots.forEach((s) =>
    s.addEventListener("click", () => {
      lightAllFrom(Number(s.dataset.i));
    })
  );

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
    return {
      x: r.left + (r.width * parseFloat(s.style.left)) / 100,
      y: r.top + (r.height * parseFloat(s.style.top)) / 100
    };
  }

  function cardPoint(c) {
    const r = c.img.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, r };
  }

  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const igniteK = (key, now) => (ignite[key] ? ease((now - ignite[key]) / 700) : 1);

  function detect() {
    if (!holding || locked || mode !== "scenes") return;
    const fx = pos.x;
    const fy = pos.y - 14;
    if (scene === "hero") {
      el.spots.forEach((s, i) => {
        if (state.hero.includes(i)) return;
        const p = spotPoint(i);
        if (Math.hypot(fx - p.x, fy - p.y) < 56) lightAllFrom(i);
      });
    } else if (scene === "explore") {
      cards.forEach((c) => {
        if (state.explore.includes(c.id)) return;
        const { r } = cardPoint(c);
        const inset = r.width * 0.22;
        if (fx > r.left + inset && fx < r.right - inset && fy > r.top + r.height * 0.15 && fy < r.bottom - r.height * 0.15) lightCard(c.id);
      });
    }
  }

  function updateHeroMask(now) {
    const parts = state.hero.map((i) => {
      const s = el.spots[i];
      const k = igniteK("h" + i, now);
      const r = (7 * k).toFixed(2);
      return "radial-gradient(circle at " + s.style.left + " " + s.style.top + ", #000 0%, #000 " + (r * 0.35).toFixed(2) + "%, transparent " + r + "%)";
    });
    const mask = parts.length ? parts.join(",") : "linear-gradient(transparent, transparent)";
    if (mask !== lastMask) {
      el.heroOn.style.webkitMaskImage = mask;
      el.heroOn.style.maskImage = mask;
      lastMask = mask;
    }
  }

  /* Darkness canvas */
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
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0," + s + ")");
    g.addColorStop(0.4, "rgba(0,0,0," + s * 0.88 + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function warm(x, y, r, a) {
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
    if (holding || forceTarget) {
      if (!flameOut) lights.push([pos.x, pos.y - 14, T.flameR * flick, 1]);
    } else if (body.classList.contains("is-standing")) {
      const p = standPoint();
      lights.push([p.x, p.y, T.flameR * 0.85 * flick, 1]);
    }
    if (scene === "hero") {
      state.hero.forEach((i, n) => {
        const p = spotPoint(i);
        const k = igniteK("h" + i, now);
        lights.push([p.x, p.y, T.glowR * k * (0.97 + 0.03 * Math.sin(now / 170 + n)), 0.72 * glowK]);
      });
    } else if (scene === "explore") {
      cards.forEach((c, n) => {
        if (!state.explore.includes(c.id)) return;
        const p = cardPoint(c);
        const k = igniteK("e" + c.id, now);
        lights.push([p.x, p.y, T.glowR * 1.15 * k * (0.97 + 0.03 * Math.sin(now / 160 + n)), 0.72 * glowK]);
      });
    }

    ctx.globalCompositeOperation = "destination-out";
    lights.forEach((l) => hole(l[0], l[1], l[2], l[3]));
    ctx.globalCompositeOperation = "source-over";
    const tint = Math.min(1, dark / 0.9);
    lights.forEach((l) => warm(l[0], l[1], l[2] * 1.05, 0.09 * l[3] * tint));
  }

  /* Main loop */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - lastT);
    lastT = now;
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

    dark += (darkTarget - dark) * Math.min(1, dt / 260);
    glowK += (glowTarget - glowK) * Math.min(1, dt / 200);

    detect();
    if (scene === "hero") updateHeroMask(now);
    if (mode === "scenes" && !body.classList.contains("is-intro")) draw(now, flick);
    requestAnimationFrame(frame);
  }

  /* Flame out: one scene in the middle of the screen */
  function extinguish() {
    locked = true;
    const cx = innerWidth / 2;
    const cy = innerHeight / 2;
    if (!holding) {
      const p = standPoint();
      body.classList.remove("is-standing");
      hold(p.x, p.y);
    }
    forceTarget = { x: cx, y: cy };
    setTimeout(() => {
      flameOut = true;
      el.flame.classList.add("is-out");
      body.classList.remove("is-holding");
      holding = false;
      darkTarget = 1;
      glowTarget = 0;
    }, 500);
    setTimeout(() => {
      el.smoke.style.left = cx + "px";
      el.smoke.style.top = cy - 24 + "px";
      el.fade.classList.add("is-on", "is-smoke");
    }, 800);
    setTimeout(() => el.fade.classList.add("is-text"), 950);
    setTimeout(() => toScroll(), 1700);
    setTimeout(() => el.fade.classList.add("is-leaving"), 2300);
    setTimeout(() => {
      el.fade.className = "fade";
      el.flame.classList.remove("is-out");
      flameOut = false;
      forceTarget = null;
      locked = false;
    }, 2900);
  }

  function toScroll() {
    enterIfNeeded();
    mode = "scroll";
    scene = null;
    holding = false;
    body.classList.remove("is-scenes", "is-standing", "is-holding", "is-intro", "in-explore");
    body.classList.add("is-scroll");
    el.intro.classList.remove("is-active");
    window.scrollTo(0, 0);
    requestAnimationFrame(() => el.scrollArea.classList.add("is-shown"));
    state.scene = "scroll";
    save();
    ticks.reset();
  }

  function backToExplore() {
    dark = 1;
    glowK = glowTarget = 1;
    setScene("explore");
    standUp();
  }

  /* Rendering from JSON */
  function renderExplore() {
    const list = ISB.products.filter((p) => p.group === "limited");
    el.grid.innerHTML = list
      .map(
        (p) =>
          '<a class="ecard" data-id="' + p.id + '" href="product.html?id=' + p.id + '">' +
          '<div class="ecard__img"><img class="off" src="' + ISB.img(p.images.off) + '" alt="' + ISB.l(p.name) + '">' +
          '<img class="on" src="' + ISB.img(p.images.on) + '" alt="" loading="lazy"></div>' +
          '<div class="caption"><span class="caption__no">' + p.no + '</span><span class="caption__name">' + ISB.l(p.name) +
          '</span><span class="caption__price">' + ISB.won(p.price) + "</span></div></a>"
      )
      .join("");
    cards = Array.from(el.grid.querySelectorAll(".ecard")).map((c) => ({ el: c, id: c.dataset.id, img: c.querySelector(".ecard__img") }));
    renderExploreState();
  }

  function renderScent() {
    const list = ISB.products.filter((p) => p.group === "scent");
    el.scentList.innerHTML = list
      .map(
        (p) =>
          '<a class="scard" href="product.html?id=' + p.id + '">' +
          '<div class="scard__img"><img src="' + ISB.img(p.images.main) + '" alt="' + ISB.l(p.name) + '" loading="lazy"></div>' +
          '<div class="caption"><span class="caption__no">' + p.no + '</span><span class="caption__name">' + ISB.l(p.name) +
          '</span><span class="caption__price">' + ISB.won(p.price) + "</span></div>" +
          '<p class="scard__line">' + ISB.l(p.line) + "</p></a>"
      )
      .join("");
    const ev = ISB.product("E01");
    if (ev) el.eventPrice.textContent = ISB.l(ev.name) + ", " + ISB.won(ev.price);
  }

  /* Nav links inside the night page */
  function go(hash) {
    if (hash === "#explore") {
      enterIfNeeded();
      dark = 1;
      setScene("explore");
      if (!holding) standUp();
    } else if (hash === "#scent" || hash === "#event") {
      toScroll();
      const target = document.querySelector(hash);
      if (target) setTimeout(() => target.scrollIntoView(), 50);
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !a.hash || a.pathname !== location.pathname) return;
    if (["#explore", "#scent", "#event"].includes(a.hash)) {
      e.preventDefault();
      history.replaceState(null, "", location.pathname);
      go(a.hash);
    }
  });

  window.addEventListener("hashchange", () => {
    const h = location.hash;
    history.replaceState(null, "", location.pathname);
    go(h);
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && mode === "scenes") standUp();
  });

  window.addEventListener("resize", resize);

  ISB.onLang(() => {
    renderExplore();
    renderScent();
    renderHeroState();
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
    renderExplore();
    renderScent();
    renderHeroState();
    updateHeroMask(performance.now());

    const hash = location.hash;
    if (hash) {
      history.replaceState(null, "", location.pathname);
      go(hash);
    } else if (!state.entered) {
      startIntro();
    } else if (state.scene === "scroll") {
      toScroll();
    } else {
      dark = 1;
      setScene(state.scene === "explore" ? "explore" : "hero");
      standUp();
    }
    requestAnimationFrame(frame);
  });
})();
