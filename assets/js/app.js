(function () {
  "use strict";

  var LANGS = ["th", "en", "zh"];
  var LANG_LABELS = { th: "ไทย", en: "EN", zh: "中文" };
  var state = {
    lang: localStorage.getItem("kt-lang") || "th",
    search: "",
    category: "all",
    tags: [],
    minPrice: null,
    maxPrice: null,
    filtersOpen: false
  };

  function t(field) {
    if (!field) return "";
    return field[state.lang] || field.en || field.th || "";
  }

  function minVariantPrice(item) {
    return Math.min.apply(null, item.variants.map(function (v) { return v.price; }));
  }
  function maxVariantPrice(item) {
    return Math.max.apply(null, item.variants.map(function (v) { return v.price; }));
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ---------------- Rendering ----------------

  function renderHeader() {
    document.getElementById("brand-name").textContent = t(RESTAURANT.name);
    document.getElementById("brand-tagline").textContent = t(RESTAURANT.tagline);
    document.title = t(RESTAURANT.name) + " · Menu";

    var switchWrap = document.getElementById("lang-switch");
    switchWrap.innerHTML = "";
    LANGS.forEach(function (lang) {
      var btn = el("button", {
        class: lang === state.lang ? "active" : "",
        "aria-pressed": lang === state.lang ? "true" : "false",
        onclick: function () {
          state.lang = lang;
          localStorage.setItem("kt-lang", lang);
          renderAll();
        }
      }, [LANG_LABELS[lang]]);
      switchWrap.appendChild(btn);
    });
  }

  function renderCategoryNav() {
    var nav = document.getElementById("category-nav");
    nav.innerHTML = "";
    var allBtn = el("button", {
      class: state.category === "all" ? "active" : "",
      onclick: function () { state.category = "all"; renderAll(); }
    }, [i18nUi("allCategories")]);
    nav.appendChild(allBtn);

    CATEGORIES.forEach(function (cat) {
      var btn = el("button", {
        class: state.category === cat.id ? "active" : "",
        onclick: function () { state.category = cat.id; renderAll(); }
      }, [cat.icon + " " + t(cat.name)]);
      nav.appendChild(btn);
    });
  }

  var UI_STRINGS = {
    searchPlaceholder: { th: "ค้นหาเมนู...", en: "Search menu...", zh: "搜索菜单..." },
    allCategories: { th: "ทั้งหมด", en: "All", zh: "全部" },
    filters: { th: "ตัวกรอง", en: "Filters", zh: "筛选" },
    priceRange: { th: "ช่วงราคา", en: "Price Range", zh: "价格区间" },
    tagsLabel: { th: "แท็ก", en: "Tags", zh: "标签" },
    clearFilters: { th: "ล้างตัวกรอง", en: "Clear filters", zh: "清除筛选" },
    min: { th: "ต่ำสุด", en: "Min", zh: "最低" },
    max: { th: "สูงสุด", en: "Max", zh: "最高" },
    noResults: { th: "ไม่พบเมนูที่ค้นหา ลองปรับตัวกรองดูนะ", en: "No dishes match your search. Try adjusting the filters.", zh: "没有找到符合条件的菜品，试试调整筛选条件。" },
    baht: { th: "บาท", en: "THB", zh: "泰铢" },
    contact: { th: "ติดต่อร้าน", en: "Contact", zh: "联系我们" },
    branches: { th: "สาขาทั้งหมด", en: "Branches", zh: "分店" },
    scanNote: { th: "สแกนเพื่อดูเมนูนี้อีกครั้ง", en: "Scan to view this menu again", zh: "扫码再次查看本菜单" }
  };
  function i18nUi(key) { return t(UI_STRINGS[key]); }

  function renderControls() {
    var searchInput = document.getElementById("search-input");
    searchInput.placeholder = i18nUi("searchPlaceholder");
    searchInput.value = state.search;

    document.getElementById("filter-toggle-label").textContent = i18nUi("filters");
    document.getElementById("filter-toggle").classList.toggle("active", state.filtersOpen);
    document.getElementById("advanced-filters").classList.toggle("open", state.filtersOpen);

    document.getElementById("price-range-title").textContent = i18nUi("priceRange");
    document.getElementById("tags-title").textContent = i18nUi("tagsLabel");
    document.getElementById("clear-filters-btn").textContent = i18nUi("clearFilters");
    document.getElementById("min-price").placeholder = i18nUi("min");
    document.getElementById("max-price").placeholder = i18nUi("max");
    document.getElementById("min-price").value = state.minPrice == null ? "" : state.minPrice;
    document.getElementById("max-price").value = state.maxPrice == null ? "" : state.maxPrice;

    var tagWrap = document.getElementById("tag-filters");
    tagWrap.innerHTML = "";
    Object.keys(TAGS).forEach(function (tagId) {
      var active = state.tags.indexOf(tagId) !== -1;
      var chip = el("button", {
        class: "chip" + (active ? " active" : ""),
        onclick: function () {
          var idx = state.tags.indexOf(tagId);
          if (idx === -1) state.tags.push(tagId); else state.tags.splice(idx, 1);
          renderAll();
        }
      }, [t(TAGS[tagId])]);
      tagWrap.appendChild(chip);
    });
  }

  function itemMatches(item) {
    var s = state.search.trim().toLowerCase();
    if (s) {
      var haystack = [t(item.name), item.name.th, item.name.en, item.name.zh, t(item.desc)]
        .join(" ").toLowerCase();
      if (haystack.indexOf(s) === -1) return false;
    }
    if (state.category !== "all" && item.category !== state.category) return false;
    if (state.tags.length) {
      var hasAll = state.tags.every(function (tg) { return item.tags.indexOf(tg) !== -1; });
      if (!hasAll) return false;
    }
    var lo = minVariantPrice(item), hi = maxVariantPrice(item);
    if (state.minPrice != null && hi < state.minPrice) return false;
    if (state.maxPrice != null && lo > state.maxPrice) return false;
    return true;
  }

  function badgeFor(tagId) {
    if (tagId === "recommended") return { cls: "recommended", label: t(TAGS.recommended) };
    if (tagId === "bestseller") return { cls: "bestseller", label: t(TAGS.bestseller) };
    if (tagId === "new") return { cls: "new", label: t(TAGS.new) };
    return null;
  }

  function renderItemCard(item) {
    var badges = ["recommended", "bestseller", "new"]
      .filter(function (tg) { return item.tags.indexOf(tg) !== -1; })
      .map(badgeFor).filter(Boolean);

    var imgWrap;
    if (item.img) {
      imgWrap = el("div", { class: "item-card__img-wrap" }, [
        el("img", { src: item.img, alt: t(item.name), loading: "lazy" })
      ]);
    } else {
      imgWrap = el("div", { class: "item-card__img-wrap no-img" }, [document.createTextNode("🥤")]);
    }
    var badgeWrap = el("div", { class: "item-badges" },
      badges.map(function (b) { return el("span", { class: "badge " + b.cls }, [b.label]); }));
    imgWrap.appendChild(badgeWrap);

    var lo = minVariantPrice(item), hi = maxVariantPrice(item);
    var priceText = lo === hi ? ("฿" + lo) : ("฿" + lo + " - " + hi);

    var tagSpans = item.tags
      .filter(function (tg) { return TAGS[tg]; })
      .slice(0, 3)
      .map(function (tg) { return el("span", {}, [t(TAGS[tg])]); });

    var card = el("div", { class: "item-card", onclick: function () { openModal(item); } }, [
      imgWrap,
      el("div", { class: "item-card__body" }, [
        el("h3", { class: "item-card__name" }, [t(item.name)]),
        item.desc && t(item.desc) ? el("p", { class: "item-card__desc" }, [t(item.desc)]) : null,
        tagSpans.length ? el("div", { class: "item-card__tags" }, tagSpans) : null,
        el("div", { class: "item-card__price" }, [
          priceText,
          el("span", { class: "unit" }, [i18nUi("baht")])
        ]),
        item.variants.length > 1
          ? el("div", { class: "item-card__variants" }, [item.variants.length + " " + (state.lang === "th" ? "ขนาด/ตัวเลือก" : state.lang === "zh" ? "种规格" : "sizes")])
          : null
      ])
    ]);
    return card;
  }

  function renderMenu() {
    var main = document.getElementById("menu-content");
    main.innerHTML = "";

    var cats = state.category === "all" ? CATEGORIES : CATEGORIES.filter(function (c) { return c.id === state.category; });
    var anyResult = false;

    cats.forEach(function (cat) {
      var items = ITEMS.filter(function (it) { return it.category === cat.id; }).filter(itemMatches);
      if (!items.length) return;
      anyResult = true;
      var section = el("section", { class: "category-section", id: "cat-" + cat.id }, [
        el("div", { class: "category-section__title" }, [
          el("span", { class: "icon" }, [cat.icon]),
          el("h2", {}, [t(cat.name)])
        ]),
        el("div", { class: "item-grid" }, items.map(renderItemCard))
      ]);
      main.appendChild(section);
    });

    if (!anyResult) {
      main.appendChild(el("div", { class: "empty-state" }, [
        el("div", { class: "emoji" }, ["🔍"]),
        el("p", {}, [i18nUi("noResults")])
      ]));
    }
  }

  function renderFooter() {
    document.getElementById("footer-contact-title").textContent = i18nUi("contact");
    document.getElementById("footer-branches-title").textContent = i18nUi("branches");
    document.getElementById("footer-phone").textContent = RESTAURANT.phone;
    document.getElementById("footer-phone").href = "tel:" + RESTAURANT.phone.replace(/-/g, "");
    document.getElementById("footer-fb").textContent = RESTAURANT.facebook;
    document.getElementById("footer-line").textContent = RESTAURANT.social;

    var branchList = document.getElementById("footer-branches");
    branchList.innerHTML = "";
    RESTAURANT.branches.forEach(function (b) {
      branchList.appendChild(el("li", {}, [t(b)]));
    });
  }

  // ---------------- Modal ----------------
  function openModal(item) {
    var backdrop = document.getElementById("modal-backdrop");
    var body = document.getElementById("modal-inner");
    body.innerHTML = "";

    if (item.img) {
      body.appendChild(el("img", { class: "modal__img", src: item.img, alt: t(item.name) }));
    }
    var content = el("div", { class: "modal__body" }, [
      el("button", { class: "modal__close", onclick: closeModal, "aria-label": "close" }, ["✕"]),
      el("h2", { class: "modal__name" }, [t(item.name)]),
      t(item.desc) ? el("p", { class: "modal__desc" }, [t(item.desc)]) : null,
      el("div", { class: "modal__variants" }, item.variants.map(function (v) {
        return el("div", { class: "modal__variant-row" }, [
          el("span", {}, [t(v.label)]),
          el("b", {}, ["฿" + v.price])
        ]);
      })),
      el("div", { class: "item-card__tags" }, item.tags.filter(function (tg) { return TAGS[tg]; }).map(function (tg) {
        return el("span", {}, [t(TAGS[tg])]);
      }))
    ]);
    body.appendChild(content);
    backdrop.classList.add("open");
  }
  function closeModal() {
    document.getElementById("modal-backdrop").classList.remove("open");
  }

  // ---------------- Wire up static controls ----------------
  function wireControls() {
    document.getElementById("search-input").addEventListener("input", function (e) {
      state.search = e.target.value;
      renderMenu();
    });
    document.getElementById("filter-toggle").addEventListener("click", function () {
      state.filtersOpen = !state.filtersOpen;
      renderControls();
    });
    document.getElementById("min-price").addEventListener("input", function (e) {
      state.minPrice = e.target.value === "" ? null : Number(e.target.value);
      renderMenu();
    });
    document.getElementById("max-price").addEventListener("input", function (e) {
      state.maxPrice = e.target.value === "" ? null : Number(e.target.value);
      renderMenu();
    });
    document.getElementById("clear-filters-btn").addEventListener("click", function () {
      state.tags = [];
      state.minPrice = null;
      state.maxPrice = null;
      state.search = "";
      document.getElementById("search-input").value = "";
      renderAll();
    });
    document.getElementById("modal-backdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  function renderAll() {
    document.documentElement.lang = state.lang;
    renderHeader();
    renderCategoryNav();
    renderControls();
    renderMenu();
    renderFooter();
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireControls();
    renderAll();
  });
})();
