(function () {
  ISB.resetNight();

  const art = document.getElementById("heroArt");
  const logo = document.querySelector(".hero__logo");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  window.addEventListener("mousemove", (e) => {
    target.x = (e.clientX / innerWidth - 0.5) * -14;
    target.y = (e.clientY / innerHeight - 0.5) * -8;
  });

  function loop() {
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    if (window.scrollY < innerHeight) {
      art.style.transform = "translate(" + cur.x.toFixed(2) + "px," + cur.y.toFixed(2) + "px) scale(1.02)";
      logo.style.setProperty("--sx", (3 - cur.x * 0.18).toFixed(2));
      logo.style.setProperty("--sy", (4 - cur.y * 0.25).toFixed(2));
    }
    requestAnimationFrame(loop);
  }
  if (!reduce) requestAnimationFrame(loop);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const fall = document.getElementById("nightfall");
  document.querySelectorAll("[data-enter]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      fall.classList.add("is-on");
      ISB.store.set("isb-arrive", true, true);
      setTimeout(() => {
        location.href = a.getAttribute("href");
      }, reduce ? 50 : 1700);
    })
  );

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      fall.classList.remove("is-on");
      ISB.resetNight();
    }
  });
})();
