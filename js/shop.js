(function () {
  const app = document.getElementById("app");
  const page = document.body.dataset.page;
  const t = (k) => ISB.t(k);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const steps = (n) =>
    '<ol class="steps">' +
    [1, 2, 3].map((i) => '<li' + (i === n ? ' aria-current="step"' : "") + "><b>" + i + "</b>" + t("step." + i) + "</li>").join("") +
    "</ol>";

  /* Product detail */
  const view = { opt: 0, qty: 1, image: 0 };

  function gallery(p) {
    const im = p.images;
    if (im.main) return [im.main];
    return [im.on, im.off, im.detail, im.life].filter(Boolean);
  }

  function renderProduct() {
    const id = new URLSearchParams(location.search).get("id");
    const p = ISB.product(id);
    if (!p) {
      app.innerHTML = '<div class="container"><div class="empty"><p>' + t("p.notFound") + '</p><a class="btn" href="index.html#explore">' + t("c.browse") + "</a></div></div>";
      return;
    }
    document.title = "ISABELLINE | " + ISB.l(p.name);
    const imgs = gallery(p);
    const set = ISB.optionSet(p);
    const limited = p.group === "limited";
    const specs = limited
      ? [[t("p.notes"), ISB.l(p.notes)], [t("p.burn"), t("p.burnValue")], [t("p.ingredients"), t("p.ingredientsValue")]]
      : [[p.group === "event" ? t("p.contents") : t("p.notes"), ISB.l(p.notes)]];
    const backHash = p.group === "limited" ? "#explore" : p.group === "scent" ? "#scent" : "#event";
    const related = ISB.products.filter((r) => r.group === p.group && r.id !== p.id).slice(0, 3);

    app.innerHTML =
      '<div class="container">' +
      '<p class="crumb"><a class="back" href="index.html' + backHash + '"><span class="arrow">←</span> ' + t("p.back") + "</a></p>" +
      '<div class="grid pd">' +
      '<div class="pd__gallery">' +
      '<div class="pd__main"><img id="mainImg" src="' + ISB.img(imgs[view.image] || imgs[0]) + '" alt="' + esc(ISB.l(p.name)) + '"></div>' +
      (imgs.length > 1
        ? '<div class="pd__thumbs">' +
          imgs.map((f, i) => '<button class="pd__thumb" type="button" data-i="' + i + '" aria-current="' + (i === view.image) + '"><img src="' + ISB.img(f) + '" alt=""></button>').join("") +
          "</div>"
        : "") +
      "</div>" +
      '<div class="pd__info">' +
      '<p class="pd__label">' + t("p.limited") + " / " + p.no + "</p>" +
      '<h1 class="serif pd__name">' + ISB.l(p.name) + "</h1>" +
      '<p class="pd__price" id="price">' + ISB.won(ISB.unitPrice(p, view.opt)) + "</p>" +
      '<p class="pd__desc">' + ISB.l(p.desc) + "</p>" +
      (set
        ? '<div class="pd__field"><span class="field-label">' + ISB.l(set.label) + '</span><div class="choices">' +
          set.values.map((v, i) => '<button class="btn opt" type="button" data-opt="' + i + '" aria-pressed="' + (i === view.opt) + '">' + ISB.l(v) + (v.add ? " +" + ISB.won(v.add) : "") + "</button>").join("") +
          "</div></div>"
        : "") +
      '<div class="pd__field"><span class="field-label">' + t("p.qty") + '</span>' +
      '<div class="btn qty"><button type="button" data-q="-1" aria-label="-">−</button><output id="qty">' + view.qty + '</output><button type="button" data-q="1" aria-label="+">+</button></div></div>' +
      '<div class="pd__actions">' +
      '<button class="btn btn--solid btn--wide" type="button" id="addBtn">' + t("p.add") + "</button>" +
      '<button class="btn btn--wide" type="button" id="buyBtn">' + t("p.buy") + "</button>" +
      "</div>" +
      '<ul class="specs">' + specs.map((s) => "<li><span>" + s[0] + "</span><span>" + s[1] + "</span></li>").join("") + "</ul>" +
      "</div></div></div>" +
      (p.story && p.images.life
        ? '<section class="story"><img src="' + ISB.img(p.images.life) + '" alt="" loading="lazy"><p>' + ISB.l(p.story) + "</p></section>"
        : "") +
      (related.length
        ? '<section class="related"><div class="container"><h2 class="serif">' + t("p.related") + '</h2><div class="related__list dimlist">' +
          related
            .map(
              (r) =>
                '<a class="rcard" href="product.html?id=' + r.id + '"><div class="rcard__img"><img src="' + ISB.img(r.images.on || r.images.main) + '" alt="' + esc(ISB.l(r.name)) + '" loading="lazy"></div>' +
                '<div class="caption"><span class="caption__no">' + r.no + '</span><span class="caption__name">' + ISB.l(r.name) + '</span><span class="caption__price">' + ISB.won(r.price) + "</span></div></a>"
            )
            .join("") +
          "</div></div></section>"
        : "");

    app.querySelectorAll(".pd__thumb").forEach((b) =>
      b.addEventListener("click", () => {
        view.image = Number(b.dataset.i);
        const img = document.getElementById("mainImg");
        img.style.opacity = 0;
        setTimeout(() => {
          img.src = ISB.img(imgs[view.image]);
          img.style.opacity = 1;
        }, 200);
        app.querySelectorAll(".pd__thumb").forEach((x) => x.setAttribute("aria-current", x === b));
      })
    );
    app.querySelectorAll("[data-opt]").forEach((b) =>
      b.addEventListener("click", () => {
        view.opt = Number(b.dataset.opt);
        app.querySelectorAll("[data-opt]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        document.getElementById("price").textContent = ISB.won(ISB.unitPrice(p, view.opt));
      })
    );
    app.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        view.qty = Math.max(1, Math.min(9, view.qty + Number(b.dataset.q)));
        document.getElementById("qty").textContent = view.qty;
      })
    );
    document.getElementById("addBtn").addEventListener("click", () => {
      ISB.cart.add(p.id, set ? view.opt : 0, view.qty);
      ISB.toast(t("p.added"), t("p.viewCart"), "cart.html");
    });
    document.getElementById("buyBtn").addEventListener("click", () => {
      ISB.cart.add(p.id, set ? view.opt : 0, view.qty);
      location.href = "checkout.html";
    });
  }

  /* Cart */
  function summary(withItems, buttonHtml) {
    const s = ISB.cart.totals();
    const items = withItems
      ? '<ul class="summary__items">' +
        ISB.cart
          .items()
          .map((i) => {
            const p = ISB.product(i.id);
            if (!p) return "";
            const opt = ISB.optionName(p, i.opt);
            return "<li><span>" + ISB.l(p.name) + (opt ? ", " + opt : "") + " x " + i.qty + "</span><span>" + ISB.won(ISB.unitPrice(p, i.opt) * i.qty) + "</span></li>";
          })
          .join("") +
        "</ul>"
      : "";
    return (
      '<aside class="summary"><h2 class="serif">' + (withItems ? t("co.yourOrder") : t("c.summary")) + "</h2>" + items +
      "<dl><dt>" + t("c.subtotal") + "</dt><dd>" + ISB.won(s.subtotal) + "</dd>" +
      "<dt>" + t("c.shipping") + "</dt><dd>" + (s.shipping ? ISB.won(s.shipping) : t("c.free")) + "</dd>" +
      '<dt class="is-total">' + t("c.total") + '</dt><dd class="is-total">' + ISB.won(s.total) + "</dd></dl>" +
      buttonHtml +
      '<p class="summary__note">' + t("c.freeNote") + "</p></aside>"
    );
  }

  function renderCart() {
    const items = ISB.cart.items();
    let html = '<div class="container">' + steps(1) + '<h1 class="serif page-title">' + t("c.title") + "</h1>";
    if (!items.length) {
      html += '<div class="grid"><div class="empty"><p>' + t("c.empty") + '</p><a class="btn" href="index.html#explore"><span>' + t("c.browse") + '</span><span class="arrow">→</span></a></div></div></div>';
      app.innerHTML = html;
      return;
    }
    html +=
      '<div class="grid cart"><ul class="cart__list">' +
      items
        .map((i, n) => {
          const p = ISB.product(i.id);
          if (!p) return "";
          const opt = ISB.optionName(p, i.opt);
          return (
            '<li class="line"><a class="line__img" href="product.html?id=' + p.id + '"><img src="' + ISB.img(p.images.on || p.images.main) + '" alt=""></a>' +
            '<div><a class="line__name tlink" href="product.html?id=' + p.id + '">' + ISB.l(p.name) + "</a>" +
            '<p class="line__opt">' + (opt || "&nbsp;") + "</p>" +
            '<div class="btn qty"><button type="button" data-n="' + n + '" data-q="-1" aria-label="-">−</button><output>' + i.qty + '</output><button type="button" data-n="' + n + '" data-q="1" aria-label="+">+</button></div></div>' +
            '<div class="line__side"><span class="line__price">' + ISB.won(ISB.unitPrice(p, i.opt) * i.qty) + '</span><button class="line__remove" type="button" data-remove="' + n + '">' + t("c.remove") + "</button></div></li>"
          );
        })
        .join("") +
      "</ul>" +
      summary(false, '<a class="btn btn--solid btn--wide" href="checkout.html">' + t("c.checkout") + "</a>") +
      "</div></div>";
    app.innerHTML = html;

    app.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        const list = ISB.cart.items();
        const it = list[Number(b.dataset.n)];
        it.qty = Math.max(1, Math.min(9, it.qty + Number(b.dataset.q)));
        ISB.cart.save(list);
        renderCart();
      })
    );
    app.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => {
        const list = ISB.cart.items();
        list.splice(Number(b.dataset.remove), 1);
        ISB.cart.save(list);
        renderCart();
      })
    );
  }

  /* Checkout */
  const form = { name: "", phone: "", address: "", email: "", pay: 0 };

  function renderCheckout() {
    if (!ISB.cart.items().length) {
      location.replace("cart.html");
      return;
    }
    const input = (key, type, auto) =>
      '<label class="input" data-key="' + key + '"><span>' + t("co." + key) + '</span><input name="' + key + '" type="' + type + '" autocomplete="' + auto + '" value="' + esc(form[key]) + '" required><p class="input__error">' + t("co.required") + "</p></label>";
    app.innerHTML =
      '<div class="container">' + steps(2) + '<h1 class="serif page-title">' + t("co.title") + "</h1>" +
      '<div class="grid cart"><form class="form" id="coForm" novalidate>' +
      "<fieldset><legend>" + t("co.shipping") + "</legend>" +
      '<div class="form__row">' + input("name", "text", "name") + input("phone", "tel", "tel") + "</div>" +
      input("address", "text", "street-address") + input("email", "email", "email") +
      "</fieldset>" +
      "<fieldset><legend>" + t("co.payment") + '</legend><div class="pay">' +
      ["co.card", "co.bank", "co.simple"].map((k, i) => '<button class="btn opt" type="button" data-pay="' + i + '" aria-pressed="' + (i === form.pay) + '">' + t(k) + "</button>").join("") +
      '</div><p class="demo-note" style="margin-top:20px">' + t("co.demo") + "</p></fieldset>" +
      "</form>" +
      summary(true, '<button class="btn btn--solid btn--wide" type="submit" form="coForm">' + t("co.place") + "</button>") +
      "</div></div>";

    app.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("input", () => {
        form[inp.name] = inp.value;
        inp.closest(".input").classList.remove("is-error");
      })
    );
    app.querySelectorAll("[data-pay]").forEach((b) =>
      b.addEventListener("click", () => {
        form.pay = Number(b.dataset.pay);
        app.querySelectorAll("[data-pay]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      })
    );
    document.getElementById("coForm").addEventListener("submit", (e) => {
      e.preventDefault();
      let first = null;
      app.querySelectorAll(".input").forEach((l) => {
        const inp = l.querySelector("input");
        const bad = !inp.value.trim() || (inp.type === "email" && !/^\S+@\S+\.\S+$/.test(inp.value));
        l.classList.toggle("is-error", bad);
        if (bad && !first) first = inp;
      });
      if (first) {
        first.focus();
        return;
      }
      const order = {
        no: "ISB-1031-" + String(Math.floor(1000 + Math.random() * 9000)),
        items: ISB.cart.items(),
        totals: ISB.cart.totals()
      };
      ISB.store.set("isb-order", order);
      ISB.cart.save([]);
      location.href = "complete.html";
    });
  }

  /* Complete */
  function renderComplete() {
    const order = ISB.store.get("isb-order", null);
    app.innerHTML =
      '<div class="container">' + steps(3) + "</div>" +
      '<section class="done"><h1 class="serif">' + t("done.title") + "</h1>" +
      '<p class="done__placed">' + t("done.placed") + "</p>" +
      (order ? '<p class="done__no">' + t("done.no") + " " + order.no + " / " + ISB.won(order.totals.total) + "</p>" : "") +
      '<p class="done__line">' + t("done.line") + "</p>" +
      '<a class="btn" href="index.html"><span>' + t("done.continue") + '</span><span class="arrow">→</span></a></section>';
  }

  const renderers = { product: renderProduct, cart: renderCart, checkout: renderCheckout, complete: renderComplete };
  const render = renderers[page] || (() => {});
  ISB.onReady(render);
  ISB.onLang(render);
})();
