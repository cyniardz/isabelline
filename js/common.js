(function () {
  const root = document.documentElement.dataset.root || "./";
  const store = {
    get(key, fallback, session) {
      try {
        const raw = (session ? sessionStorage : localStorage).getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value, session) {
      try {
        (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
    remove(key, session) {
      try {
        (session ? sessionStorage : localStorage).removeItem(key);
      } catch (e) {}
    }
  };

  const ISB = {
    root,
    lang: store.get("isb-lang", "ko"),
    copy: null,
    products: [],
    readyFns: [],
    langFns: [],
    store,

    t(key) {
      const table = this.copy && this.copy[this.lang];
      return (table && table[key]) || (this.copy && this.copy.en[key]) || key;
    },
    l(obj) {
      if (!obj) return "";
      return obj[this.lang] || obj.en || "";
    },
    won(n) {
      return "₩" + Number(n).toLocaleString("en-US");
    },
    product(id) {
      return this.products.find((p) => p.id === id);
    },
    img(file) {
      return file ? root + "assets/images/products/" + file : "";
    },
    optionSet(p) {
      return p && p.options ? this.copy.optionSets[p.options] : null;
    },
    unitPrice(p, opt) {
      const set = this.optionSet(p);
      const add = set && set.values[opt] ? set.values[opt].add : 0;
      return p.price + add;
    },
    optionName(p, opt) {
      const set = this.optionSet(p);
      return set && set.values[opt] ? this.l(set.values[opt]) : "";
    },

    onReady(fn) {
      this.copy ? fn() : this.readyFns.push(fn);
    },
    onLang(fn) {
      this.langFns.push(fn);
    },
    setLang(lang) {
      this.lang = lang;
      store.set("isb-lang", lang);
      this.apply();
      this.langFns.forEach((fn) => fn());
    },
    apply() {
      document.documentElement.lang = this.lang === "ko" ? "ko" : "en";
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.innerHTML = this.t(el.dataset.i18n);
      });
      document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        el.setAttribute("aria-label", this.t(el.dataset.i18nAria));
      });
      document.querySelectorAll(".lang span").forEach((s) => {
        s.classList.toggle("is-on", s.dataset.lang === this.lang);
      });
    },

    cart: {
      items() {
        return store.get("isb-cart", []);
      },
      save(items) {
        store.set("isb-cart", items);
        ISB.updateCount();
      },
      add(id, opt, qty) {
        const items = this.items();
        const found = items.find((i) => i.id === id && i.opt === opt);
        if (found) found.qty += qty;
        else items.push({ id, opt, qty });
        this.save(items);
      },
      count() {
        return this.items().reduce((s, i) => s + i.qty, 0);
      },
      totals() {
        const subtotal = this.items().reduce((s, i) => {
          const p = ISB.product(i.id);
          return p ? s + ISB.unitPrice(p, i.opt) * i.qty : s;
        }, 0);
        const shipping = subtotal === 0 || subtotal >= 50000 ? 0 : 3000;
        return { subtotal, shipping, total: subtotal + shipping };
      }
    },
    updateCount() {
      const n = this.cart.count();
      document.querySelectorAll(".cart-count").forEach((el) => {
        el.textContent = n ? n : "";
      });
    },

    toast(msg, linkText, href) {
      let el = document.querySelector(".toast");
      if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        el.setAttribute("role", "status");
        document.body.appendChild(el);
      }
      el.innerHTML = "<span></span>" + (linkText ? '<a href="' + href + '"></a>' : "");
      el.querySelector("span").textContent = msg;
      if (linkText) el.querySelector("a").textContent = linkText;
      el.classList.add("is-show");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("is-show"), 3200);
    },

    nightState() {
      return store.get("isb-night", { entered: false, scene: "hero", hero: [], explore: [] }, true);
    },
    saveNight(state) {
      store.set("isb-night", state, true);
    },
    resetNight() {
      store.remove("isb-night", true);
    },

    renderNav(type) {
      const night = type === "night";
      const base = night ? root + "night/" : root;
      const menu = night
        ? [["nav.limited", base + "index.html#explore"], ["nav.scent", base + "index.html#scent"]]
        : [["nav.about", "#about"], ["nav.collection", "#collection"], ["nav.night", "#night"]];
      const header = document.createElement("header");
      header.className = "nav";
      header.innerHTML =
        '<div class="container grid">' +
        '<a class="nav__logo" href="' + (night ? base + "index.html#top" : "#top") + '">ISABELLINE</a>' +
        '<nav class="nav__menu dimlist">' +
        '<button class="lang" type="button" aria-label="Language"><span data-lang="ko">KR</span> / <span data-lang="en">EN</span></button>' +
        menu.map((m) => '<a href="' + m[1] + '" data-i18n="' + m[0] + '"></a>').join("") +
        "</nav>" +
        '<div class="nav__util dimlist">' +
        (night ? '<a href="' + base + 'cart.html"><span data-i18n="nav.cart"></span> <span class="cart-count"></span></a>' : "") +
        "</div></div>";
      if (!night) header.querySelector(".nav__util").remove();
      document.body.prepend(header);
      header.querySelector(".lang").addEventListener("click", () => {
        this.setLang(this.lang === "en" ? "ko" : "en");
      });
    },

    renderFooter() {
      const footer = document.createElement("footer");
      footer.className = "footer";
      footer.innerHTML =
        '<div class="container grid">' +
        '<div class="footer__brand"><div class="footer__logo">ISABELLINE</div><p class="footer__tag" data-i18n="f.tag"></p></div>' +
        '<div class="footer__cols">' +
        '<ul><li><a class="tlink" href="#" data-i18n="f.instagram"></a></li><li><a class="tlink" href="#" data-i18n="f.contact"></a></li></ul>' +
        '<ul><li><a class="tlink" href="#" data-i18n="f.shipping"></a></li><li><a class="tlink" href="#" data-i18n="f.returns"></a></li></ul>' +
        '<ul><li><a class="tlink" href="#" data-i18n="f.terms"></a></li><li><a class="tlink" href="#" data-i18n="f.privacy"></a></li></ul>' +
        "</div>" +
        '<p class="footer__note" data-i18n="f.note"></p>' +
        "</div>";
      const slot = document.querySelector("[data-footer]");
      (slot || document.body).appendChild(footer);
    },

    async load() {
      const [copy, products] = await Promise.all([
        fetch(root + "data/copy.json").then((r) => r.json()),
        fetch(root + "data/products.json").then((r) => r.json())
      ]);
      this.copy = copy;
      this.products = products;
      this.apply();
      this.updateCount();
      this.readyFns.forEach((fn) => fn());
      this.readyFns = [];
    }
  };

  window.ISB = ISB;

  document.addEventListener("DOMContentLoaded", () => {
    const type = document.body.classList.contains("night") ? "night" : "basic";
    if (!document.body.hasAttribute("data-no-nav")) ISB.renderNav(type);
    if (!document.body.hasAttribute("data-no-footer")) ISB.renderFooter();
    ISB.load().catch(() => {
      document.body.insertAdjacentHTML(
        "afterbegin",
        '<p style="position:fixed;top:0;left:0;right:0;z-index:99;padding:12px;background:#5C120F;color:#F3EEE3;font:13px Inter,sans-serif;text-align:center">Data could not load. Open this folder with a local server (VS Code Live Server).</p>'
      );
    });
  });
})();
