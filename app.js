/* ============================================================
   SABLE — interactions
   No dependencies. Transform/opacity animation only.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const money = (n) => "$" + Number(n).toLocaleString("en-US");

  /* ---------- preloader ---------- */
  const loader = $("[data-loader]");
  const loaderCount = $("[data-loader-count]");
  let loaderDone = false;

  if (loader && !reduce) {
    document.body.classList.add("is-locked");
    const started = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    (function tick(now) {
      const p = clamp((now - started) / 1050, 0, 1);
      if (loaderCount) loaderCount.textContent = String(Math.round(easeOut(p) * 100)).padStart(2, "0");
      if (p < 1) requestAnimationFrame(tick);
    })(started);

    const finish = () => {
      if (loaderDone) return;
      loaderDone = true;
      if (loaderCount) loaderCount.textContent = "100";
      document.body.classList.add("is-ready");
      document.body.classList.remove("is-locked");
      loader.classList.add("is-done");
      window.setTimeout(() => loader.classList.add("is-hidden"), 1400);
    };

    window.addEventListener("load", () => window.setTimeout(finish, 420));
    window.setTimeout(finish, 3600);
  } else {
    document.body.classList.add("is-ready");
    if (loader) loader.classList.add("is-hidden");
  }

  /* ---------- nav + scroll progress + parallax ---------- */
  const nav = $("[data-nav]");
  const progressBar = $("[data-progress] span");
  const parallaxEls = $$("[data-parallax]");
  let lastY = window.scrollY;
  let rafQueued = false;

  function onFrame() {
    rafQueued = false;
    const y = window.scrollY;
    lastY = y;

    if (nav) nav.classList.toggle("is-scrolled", y > 24);

    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0) + ")";
    }

    if (!reduce) {
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0;
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        const delta = r.top + r.height / 2 - window.innerHeight / 2;
        const shift = clamp(-delta * speed, -46, 46);
        el.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      });
    }
  }

  function requestFrame() {
    if (!rafQueued) {
      rafQueued = true;
      requestAnimationFrame(onFrame);
    }
  }

  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  onFrame();

  /* ---------- reveal ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- cursor ---------- */
  const cursor = $("[data-cursor]");
  if (cursor && finePointer && !reduce) {
    document.body.classList.add("has-cursor");
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let raf = null;

    const move = (e) => {
      cx = e.clientX;
      cy = e.clientY;
      cursor.classList.add("is-live");
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = null;
          cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
        });
      }
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", () => (cursor.style.opacity = "0"));
    document.addEventListener("pointerenter", () => (cursor.style.opacity = ""));

    document.addEventListener("pointerover", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const view = t.closest('[data-cursor="view"]');
      const interactive = t.closest("a, button, input, [role='button']");
      cursor.classList.toggle("is-view", Boolean(view));
      cursor.classList.toggle("is-grow", !view && Boolean(interactive));
    });
    document.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget) {
        cursor.classList.remove("is-view", "is-grow");
      }
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$("[data-magnetic]").forEach((el) => {
      let raf = null;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = "translate(" + (x * 7).toFixed(2) + "px," + (y * 5).toFixed(2) + "px)";
        });
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- body lock ---------- */
  let locks = 0;
  function lockBody() {
    locks += 1;
    document.body.classList.add("is-locked");
  }
  function unlockBody() {
    locks = Math.max(0, locks - 1);
    if (!locks) document.body.classList.remove("is-locked");
  }

  /* ---------- toast ---------- */
  const toast = $("[data-toast]");
  const toastText = $("[data-toast-text]");
  let toastTimer = null;

  function showToast(text) {
    if (!toast) return;
    if (toastText) toastText.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 4200);
  }
  if (toast) {
    const close = $("[data-toast-close]");
    if (close) close.addEventListener("click", () => toast.classList.remove("is-on"));
  }

  /* ---------- bag ---------- */
  const bag = $("[data-bag]");
  const scrim = $("[data-scrim]");
  const bagItemsEl = $("[data-bag-items]");
  const bagCounts = $$("[data-bag-count]");
  const bagTitleCount = $(".bag__title sup");
  const bagEmpty = $("[data-bag-empty]");
  const subtotalEl = $("[data-subtotal]");
  const shipMsg = $("[data-ship-msg]");
  const shipBar = $("[data-ship-bar]");
  const FREE_SHIP = 250;

  let bagState = [];
  try {
    const raw = localStorage.getItem("sable-bag");
    bagState = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(bagState)) bagState = [];
  } catch (e) {
    bagState = [];
  }

  function saveBag() {
    try {
      localStorage.setItem("sable-bag", JSON.stringify(bagState));
    } catch (e) {
      /* storage can be unavailable — the bag still works for the session */
    }
  }

  function bagTotals() {
    return bagState.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.total += item.qty * Number(item.price);
        return acc;
      },
      { qty: 0, total: 0 }
    );
  }

  function renderBag() {
    const totals = bagTotals();

    bagCounts.forEach((el) => (el.textContent = String(totals.qty)));
    if (bagTitleCount) bagTitleCount.textContent = String(totals.qty);
    if (subtotalEl) subtotalEl.textContent = money(totals.total);

    if (bag) bag.classList.toggle("is-empty", totals.qty === 0);

    if (shipMsg) {
      if (totals.total >= FREE_SHIP) {
        shipMsg.textContent = "Complimentary shipping unlocked";
      } else {
        shipMsg.textContent = "Complimentary shipping over $250 — " + money(Math.max(0, FREE_SHIP - totals.total)) + " to go";
      }
    }
    if (shipBar) {
      shipBar.style.transform = "scaleX(" + clamp(totals.total / FREE_SHIP, 0, 1) + ")";
    }

    if (!bagItemsEl) return;
    bagItemsEl.innerHTML = bagState
      .map(
        (item, idx) => `
        <article class="bag__item">
          <img class="bag__thumb" src="${item.img}" alt="${item.name}" loading="lazy" />
          <div class="bag__item-main">
            <h3 class="bag__item-name">${item.name}</h3>
            <p class="bag__item-meta">${item.colour || "Natural"} · ${item.size}</p>
            <div class="bag__qty" aria-label="Quantity">
              <button data-qty="-" data-idx="${idx}" aria-label="Decrease quantity">−</button>
              <span>${item.qty}</span>
              <button data-qty="+" data-idx="${idx}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="bag__item-side">
            <span class="bag__item-price">${money(item.price * item.qty)}</span>
            <button class="bag__remove" data-remove data-idx="${idx}">Remove</button>
          </div>
        </article>`
      )
      .join("");
  }

  function addToBag(data) {
    const existing = bagState.find((item) => item.id === data.id && item.size === data.size);
    if (existing) {
      existing.qty += 1;
    } else {
      bagState.push(Object.assign({}, data, { qty: 1 }));
    }
    saveBag();
    renderBag();
    openBag();

    const badge = bagCounts[0];
    if (badge) {
      badge.classList.remove("bump");
      void badge.offsetWidth;
      badge.classList.add("bump");
    }
    showToast(data.name + " added — size " + data.size);
  }

  function openBag() {
    if (!bag || bag.classList.contains("is-open")) return;
    bag.classList.add("is-open");
    bag.setAttribute("aria-hidden", "false");
    if (scrim) scrim.classList.add("is-on");
    lockBody();
    window.setTimeout(() => bag.focus({ preventScroll: true }), reduce ? 0 : 500);
  }

  function closeBag() {
    if (!bag || !bag.classList.contains("is-open")) return;
    bag.classList.remove("is-open");
    bag.setAttribute("aria-hidden", "true");
    if (scrim) scrim.classList.remove("is-on");
    unlockBody();
  }

  if (bagItemsEl) {
    bagItemsEl.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest("[data-qty]");
      const removeBtn = e.target.closest("[data-remove]");
      if (qtyBtn) {
        const idx = Number(qtyBtn.dataset.idx);
        const item = bagState[idx];
        if (!item) return;
        if (qtyBtn.dataset.qty === "+") item.qty += 1;
        else item.qty -= 1;
        if (item.qty <= 0) bagState.splice(idx, 1);
        saveBag();
        renderBag();
      }
      if (removeBtn) {
        const idx = Number(removeBtn.dataset.idx);
        if (bagState[idx]) bagState.splice(idx, 1);
        saveBag();
        renderBag();
        showToast("Removed from bag");
      }
    });
  }

  renderBag();

  $$("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest(".card");
      if (!card) return;
      const img = $("img", card);
      addToBag({
        id: card.dataset.id,
        name: card.dataset.name,
        price: Number(card.dataset.price),
        colour: card.dataset.colour,
        size: btn.dataset.size || "M",
        img: img ? img.src : ""
      });
    });
  });

  const bagOpenBtn = $("[data-bag-open]");
  if (bagOpenBtn) bagOpenBtn.addEventListener("click", openBag);
  const bagCloseBtn = $("[data-bag-close]");
  if (bagCloseBtn) bagCloseBtn.addEventListener("click", closeBag);
  if (scrim) scrim.addEventListener("click", closeBag);
  const bagExplore = $("[data-bag-explore]");
  if (bagExplore) {
    bagExplore.addEventListener("click", () => {
      closeBag();
      const shop = $("#shop");
      if (shop) shop.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  }
  const checkout = $("[data-checkout]");
  if (checkout) {
    checkout.addEventListener("click", () => showToast("Demo checkout — no payment is taken"));
  }

  /* swatches */
  $$(".card__swatches").forEach((group) => {
    group.addEventListener("click", (e) => {
      const swatch = e.target.closest("span");
      if (!swatch) return;
      $$("span", group).forEach((s) => s.classList.remove("is-on"));
      swatch.classList.add("is-on");
      const card = group.closest(".card");
      if (card && swatch.dataset.colour) card.dataset.colour = swatch.dataset.colour;
    });
  });

  /* ---------- menu ---------- */
  const menu = $("[data-menu]");
  const menuOpenBtn = $("[data-menu-open]");
  const menuCloseBtn = $("[data-menu-close]");
  let menuReturn = null;

  function openMenu() {
    if (!menu) return;
    menuReturn = document.activeElement;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    if (menuOpenBtn) menuOpenBtn.setAttribute("aria-expanded", "true");
    lockBody();
    if (menuCloseBtn) window.setTimeout(() => menu.focus({ preventScroll: true }), reduce ? 0 : 300);
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    if (menuOpenBtn) menuOpenBtn.setAttribute("aria-expanded", "false");
    unlockBody();
    if (menuReturn && menuReturn.focus) menuReturn.focus({ preventScroll: true });
  }
  if (menuOpenBtn) menuOpenBtn.addEventListener("click", openMenu);
  if (menuCloseBtn) menuCloseBtn.addEventListener("click", closeMenu);
  if (menu) {
    $$("a", menu).forEach((a) =>
      a.addEventListener("click", () => {
        closeMenu();
      })
    );
  }

  /* ---------- filters ---------- */
  const filtersWrap = $("[data-filters]");
  const pill = $("[data-pill]");
  const cards = $$(".card[data-id]");
  const fillers = $$("[data-grid-filler]");
  const visibleCount = $("[data-visible-count]");

  function positionPill(btn) {
    if (!pill || !btn || !filtersWrap) return;
    pill.style.width = btn.offsetWidth + "px";
    pill.style.transform = "translateX(" + (btn.offsetLeft - 4) + "px)";
  }

  function applyFilter(name) {
    let shown = 0;
    fillers.forEach((tile) => tile.classList.toggle("is-filtered", name !== "all"));
    cards.forEach((card) => {
      const match = name === "all" || card.dataset.cat === name;
      card.classList.toggle("is-filtered", !match);
      card.classList.remove("is-entering");
      if (match) {
        card.style.setProperty("--i", String(shown));
        void card.offsetWidth;
        card.classList.add("is-entering");
        shown += 1;
      }
    });
    if (visibleCount) visibleCount.textContent = String(shown);
  }

  if (filtersWrap) {
    filtersWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      $$("[data-filter]", filtersWrap).forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      positionPill(btn);
      applyFilter(btn.dataset.filter);
    });
  }

  window.addEventListener("resize", () => {
    const active = $(".filter.is-active");
    if (active) positionPill(active);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      const active = $(".filter.is-active");
      if (active) positionPill(active);
    });
  } else {
    const active = $(".filter.is-active");
    if (active) positionPill(active);
  }

  /* ---------- search ---------- */
  const search = $("[data-search]");
  const searchInput = $("[data-search-input]");
  const searchResults = $("[data-search-results]");
  let searchReturn = null;

  const productIndex = cards.map((card) => {
    const img = $("img", card);
    return {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price),
      cat: card.dataset.cat,
      img: img ? img.src : ""
    };
  });

  const catLabel = {
    outerwear: "Outerwear",
    knitwear: "Knitwear",
    trousers: "Trousers",
    footwear: "Footwear",
    accessories: "Objects"
  };

  function renderSearch(query) {
    if (!searchResults) return;
    const q = query.trim().toLowerCase();
    const matches = productIndex.filter((p) => {
      if (!q) return true;
      return (p.name + " " + (catLabel[p.cat] || "")).toLowerCase().includes(q);
    });
    if (!matches.length) {
      searchResults.innerHTML =
        '<p class="search__empty">No pieces match “' + escapeHtml(query) + '”. Try “coat”, “knit” or “object”.</p>';
      return;
    }
    searchResults.innerHTML = matches
      .slice(0, 9)
      .map(
        (p) => `
        <button class="search__result" data-result="${p.id}">
          <img src="${p.img}" alt="" loading="lazy" />
          <span>
            <span class="search__result-name">${p.name}</span>
            <span class="search__result-meta">${catLabel[p.cat] || ""} · ${money(p.price)}</span>
          </span>
        </button>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function openSearch() {
    if (!search) return;
    searchReturn = document.activeElement;
    renderSearch(searchInput ? searchInput.value : "");
    search.classList.add("is-open");
    search.setAttribute("aria-hidden", "false");
    lockBody();
    if (searchInput) {
      window.setTimeout(() => {
        searchInput.focus({ preventScroll: true });
      }, reduce ? 0 : 420);
    }
  }
  function closeSearch() {
    if (!search || !search.classList.contains("is-open")) return;
    search.classList.remove("is-open");
    search.setAttribute("aria-hidden", "true");
    unlockBody();
    if (searchReturn && searchReturn.focus) searchReturn.focus({ preventScroll: true });
  }

  const searchOpenBtn = $("[data-search-open]");
  if (searchOpenBtn) searchOpenBtn.addEventListener("click", openSearch);
  const searchCloseBtn = $("[data-search-close]");
  if (searchCloseBtn) searchCloseBtn.addEventListener("click", closeSearch);
  if (searchInput) {
    searchInput.addEventListener("input", () => renderSearch(searchInput.value));
  }
  $$("[data-search-term]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!searchInput) return;
      searchInput.value = btn.dataset.searchTerm;
      renderSearch(searchInput.value);
      searchInput.focus({ preventScroll: true });
    });
  });
  if (searchResults) {
    searchResults.addEventListener("click", (e) => {
      const result = e.target.closest("[data-result]");
      if (!result) return;
      const card = cards.find((c) => c.dataset.id === result.dataset.result);
      closeSearch();
      if (card) {
        card.classList.remove("is-filtered");
        window.setTimeout(() => {
          card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          card.classList.add("is-flash");
          window.setTimeout(() => card.classList.remove("is-flash"), 1700);
        }, 350);
      }
    });
  }

  /* ---------- lookbook ---------- */
  const look = $("[data-look]");
  const lookImg = $("[data-look-img]");
  const lookNum = $("[data-look-num]");
  const lookCap = $("[data-look-cap]");
  const lookCount = $("[data-look-count]");
  const lookList = $("[data-look-list]");
  const lookFrame = $(".look__frame");
  let lookIndex = 0;
  let lookReturn = null;

  const looks = [
    { img: "https://images.pexels.com/photos/14330778/pexels-photo-14330778.jpeg?auto=compress&cs=tinysrgb&w=1400", cap: "The Trench, in stone" },
    { img: "https://images.pexels.com/photos/8070398/pexels-photo-8070398.jpeg?auto=compress&cs=tinysrgb&w=1400", cap: "The Lounge Set, in oat" },
    { img: "https://images.pexels.com/photos/38290948/pexels-photo-38290948.jpeg?auto=compress&cs=tinysrgb&w=1400", cap: "The Suit, in vermilion" },
    { img: "https://images.pexels.com/photos/15968866/pexels-photo-15968866.jpeg?auto=compress&cs=tinysrgb&w=1400", cap: "The Overcoat, in ink" }
  ];
  looks.forEach((l) => {
    const im = new Image();
    im.src = l.img;
  });

  function renderLook(animate) {
    const l = looks[lookIndex];
    if (!l) return;
    if (lookNum) lookNum.textContent = "Look " + String(lookIndex + 1).padStart(2, "0");
    if (lookCap) lookCap.textContent = l.cap;
    if (lookCount) lookCount.textContent = String(lookIndex + 1).padStart(2, "0") + " / " + String(looks.length).padStart(2, "0");
    if (lookList) lookList.textContent = String(lookIndex + 1).padStart(2, "0") + " — " + String(looks.length).padStart(2, "0");

    if (!lookImg) return;
    if (!animate || reduce) {
      lookImg.src = l.img;
      lookImg.alt = "Sable AW26 — " + l.cap;
      return;
    }
    if (lookFrame) lookFrame.classList.add("is-switching");
    window.setTimeout(() => {
      lookImg.src = l.img;
      lookImg.alt = "Sable AW26 — " + l.cap;
      if (lookFrame) lookFrame.classList.remove("is-switching");
    }, 260);
  }

  function openLook() {
    if (!look) return;
    lookReturn = document.activeElement;
    renderLook(false);
    look.classList.add("is-open");
    look.setAttribute("aria-hidden", "false");
    lockBody();
    window.setTimeout(() => look.focus({ preventScroll: true }), reduce ? 0 : 450);
  }
  function closeLook() {
    if (!look || !look.classList.contains("is-open")) return;
    look.classList.remove("is-open");
    look.setAttribute("aria-hidden", "true");
    unlockBody();
    if (lookReturn && lookReturn.focus) lookReturn.focus({ preventScroll: true });
  }
  function stepLook(dir) {
    lookIndex = (lookIndex + dir + looks.length) % looks.length;
    renderLook(true);
  }

  $$("[data-lookbook-open]").forEach((btn) => btn.addEventListener("click", openLook));
  const lookCloseBtn = $("[data-look-close]");
  if (lookCloseBtn) lookCloseBtn.addEventListener("click", closeLook);
  const lookPrev = $("[data-look-prev]");
  const lookNext = $("[data-look-next]");
  if (lookPrev) lookPrev.addEventListener("click", () => stepLook(-1));
  if (lookNext) lookNext.addEventListener("click", () => stepLook(1));

  /* ---------- anatomy figure ---------- */
  const fig = $("[data-fig]");
  if (fig) {
    const layers = $$(".layer", fig);
    const readout = $("[data-fig-readout]", fig);
    const toggles = $$("[data-fig-toggle]");
    const restPos = {
      shell: [190, 120],
      canvas: [194, 124],
      lining: [198, 128]
    };
    const openPos = {
      shell: [228, 8],
      canvas: [144, 92],
      lining: [60, 176]
    };
    const order = ["shell", "canvas", "lining"];
    let exploded = false;

    function nameOf(layer) {
      return layer.classList.contains("layer--shell") ? "shell" : layer.classList.contains("layer--canvas") ? "canvas" : "lining";
    }

    function setLayerPositions(open) {
      order.forEach((name, i) => {
        const layer = layers.find((l) => nameOf(l) === name);
        if (!layer) return;
        const pos = (open ? openPos : restPos)[name];
        layer.style.transitionDelay = (open ? i * 0.07 : (order.length - 1 - i) * 0.05) + "s";
        layer.style.transform = "translate(" + pos[0] + "px," + pos[1] + "px) scale(0.82)";
      });
    }

    setLayerPositions(false);

    function setExploded(next) {
      exploded = next;
      fig.classList.toggle("is-open", exploded);
      setLayerPositions(exploded);
      toggles.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(exploded));
        const label = btn.querySelector(".btn__text");
        if (label) label.textContent = exploded ? "Put it back" : "Take it apart";
      });
      if (readout) {
        readout.textContent = exploded
          ? "01 — Shell / 02 — Canvas / 03 — Lining"
          : "01 — Outer shell · 480g virgin wool";
      }
    }

    toggles.forEach((btn) => {
      btn.addEventListener("click", () => setExploded(!exploded));
    });

    layers.forEach((layer) => {
      layer.style.cursor = "pointer";
      layer.addEventListener("pointerenter", () => {
        if (!readout) return;
        readout.textContent = layer.dataset.readout || "";
      });
      layer.addEventListener("pointerleave", () => {
        if (!readout) return;
        readout.textContent = exploded
          ? "01 — Shell / 02 — Canvas / 03 — Lining"
          : "01 — Outer shell · 480g virgin wool";
      });
    });

    if (finePointer && !reduce) {
      let tiltRaf = null;
      fig.addEventListener("pointermove", (e) => {
        if (tiltRaf) cancelAnimationFrame(tiltRaf);
        const r = fig.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tiltRaf = requestAnimationFrame(() => {
          fig.style.transform =
            "perspective(1400px) rotateX(" + (-py * 3.4).toFixed(2) + "deg) rotateY(" + (px * 4.2).toFixed(2) + "deg)";
        });
      });
      fig.addEventListener("pointerleave", () => {
        fig.style.transform = "";
      });
    }
  }

  /* ---------- newsletter ---------- */
  const subscribe = $("[data-subscribe]");
  if (subscribe) {
    const input = $("input[type='email']", subscribe);
    const msg = $("[data-sub-msg]", subscribe);
    const done = $("[data-sub-done]", subscribe);

    subscribe.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!input) return;
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!valid) {
        input.setAttribute("aria-invalid", "true");
        if (msg) msg.textContent = "Please enter a valid email address.";
        input.focus({ preventScroll: true });
        return;
      }

      input.removeAttribute("aria-invalid");
      if (msg) msg.textContent = "";
      subscribe.classList.add("is-done");
      if (done) done.setAttribute("aria-hidden", "false");
      showToast("Welcome — the first letter is on its way");
    });

    if (input) {
      input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        if (msg) msg.textContent = "";
      });
    }
  }

  /* ---------- quotes ---------- */
  const quotesWrap = $("[data-quotes]");
  if (quotesWrap) {
    const quotes = $$(".quote", quotesWrap);
    const dots = $$("[data-quote]", quotesWrap);
    const indexEl = $("[data-quote-index]", quotesWrap);
    let active = 0;
    let timer = null;
    let paused = false;

    function showQuote(n) {
      active = (n + quotes.length) % quotes.length;
      quotes.forEach((q, i) => q.classList.toggle("is-active", i === active));
      dots.forEach((d, i) => {
        d.classList.toggle("is-active", i === active);
        d.setAttribute("aria-pressed", String(i === active));
      });
      if (indexEl) indexEl.textContent = String(active + 1).padStart(2, "0");
    }

    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(() => {
        if (!paused && !document.hidden) showQuote(active + 1);
      }, 7000);
    }

    dots.forEach((dot, i) =>
      dot.addEventListener("click", () => {
        showQuote(i);
        schedule();
      })
    );
    quotesWrap.addEventListener("pointerenter", () => (paused = true));
    quotesWrap.addEventListener("pointerleave", () => (paused = false));

    showQuote(0);
    schedule();
  }

  /* ---------- footer clock ---------- */
  const clock = $("[data-clock]");
  if (clock) {
    const tick = () => {
      try {
        const time = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Lisbon",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date());
        clock.textContent = "Porto — " + time;
      } catch (e) {
        clock.textContent = "Porto, Portugal";
      }
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- back to top ---------- */
  const toTop = $("[data-to-top]");
  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (look && look.classList.contains("is-open")) return closeLook();
      if (search && search.classList.contains("is-open")) return closeSearch();
      if (bag && bag.classList.contains("is-open")) return closeBag();
      if (menu && menu.classList.contains("is-open")) return closeMenu();
    }

    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    }

    if (look && look.classList.contains("is-open")) {
      if (e.key === "ArrowRight") stepLook(1);
      if (e.key === "ArrowLeft") stepLook(-1);
    }
  });

  /* ---------- anchor offset ---------- */
  document.documentElement.style.setProperty("--nav-offset", (nav ? nav.offsetHeight : 78) + "px");
})();
