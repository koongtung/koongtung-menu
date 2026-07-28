(function () {
  "use strict";

  var GH_OWNER = "koongtung";
  var GH_REPO = "koongtung-menu";
  var GH_BRANCH = "main";
  var DATA_PATH = "assets/data/menu-data.json";
  var IMG_DIR = "assets/img/dishes";
  var API = "https://api.github.com";

  var TOKEN_KEY = "kt-admin-token";
  var token = localStorage.getItem(TOKEN_KEY) || "";

  var data = null;       // {restaurant, categories, tags, items}
  var dataSha = null;    // current file sha, needed to commit updates
  var editingId = null;  // item id being edited, or "__new__"

  // ---------------- GitHub API helpers ----------------

  function ghHeaders() {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = "";
    bytes.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    var binary = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function ghGetFile(path) {
    return fetch(API + "/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + path + "?ref=" + GH_BRANCH, {
      headers: ghHeaders()
    }).then(function (res) {
      if (!res.ok) throw new Error("GitHub API " + res.status + " (" + path + ")");
      return res.json();
    });
  }

  function ghPutFile(path, base64Content, message, sha) {
    var body = { message: message, content: base64Content, branch: GH_BRANCH };
    if (sha) body.sha = sha;
    return fetch(API + "/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + path, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders()),
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (j) { throw new Error(j.message || ("GitHub API " + res.status)); });
      return res.json();
    });
  }

  function verifyToken() {
    return fetch(API + "/repos/" + GH_OWNER + "/" + GH_REPO, { headers: ghHeaders() })
      .then(function (res) {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      });
  }

  // ---------------- Toast ----------------
  function toast(msg, isError) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = "toast"; }, 3200);
  }

  // ---------------- Auth flow ----------------
  function showLogin(errorMsg) {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("admin-app").style.display = "none";
    var err = document.getElementById("login-error");
    if (errorMsg) { err.textContent = errorMsg; err.classList.add("show"); }
    else { err.classList.remove("show"); }
  }

  function showApp() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin-app").style.display = "block";
  }

  function tryLogin(inputToken) {
    var btn = document.getElementById("login-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>กำลังตรวจสอบ...';
    token = inputToken.trim();
    verifyToken()
      .then(function () {
        localStorage.setItem(TOKEN_KEY, token);
        showApp();
        return loadData();
      })
      .then(function () { renderList(); })
      .catch(function () {
        token = "";
        showLogin("โทเคนไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง repository นี้ กรุณาตรวจสอบอีกครั้ง");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "เข้าสู่ระบบ";
      });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    token = "";
    data = null;
    showLogin();
  }

  // ---------------- Data load/save ----------------
  function loadData() {
    return ghGetFile(DATA_PATH).then(function (file) {
      dataSha = file.sha;
      data = JSON.parse(base64ToUtf8(file.content));
    });
  }

  function saveData(commitMessage) {
    // re-fetch sha right before writing to minimize conflict window
    return ghGetFile(DATA_PATH).then(function (file) {
      var json = JSON.stringify(data, null, 2);
      return ghPutFile(DATA_PATH, utf8ToBase64(json), commitMessage, file.sha);
    }).then(function (result) {
      dataSha = result.content.sha;
    });
  }

  // ---------------- Rendering: item list ----------------
  function money(item) {
    var prices = item.variants.map(function (v) { return v.price; });
    var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    return lo === hi ? ("฿" + lo) : ("฿" + lo + "-" + hi);
  }

  function renderList() {
    var main = document.getElementById("admin-list");
    main.innerHTML = "";
    var q = (document.getElementById("admin-search").value || "").trim().toLowerCase();

    data.categories.forEach(function (cat) {
      var items = data.items.filter(function (it) { return it.category === cat.id; });
      if (q) {
        items = items.filter(function (it) {
          return (it.name.th + " " + it.name.en + " " + it.name.zh).toLowerCase().indexOf(q) !== -1;
        });
      }
      if (!items.length) return;

      var block = document.createElement("div");
      block.className = "admin-category-block";
      var h2 = document.createElement("h2");
      h2.textContent = cat.icon + " " + cat.name.th + " / " + cat.name.en;
      block.appendChild(h2);

      items.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "admin-item-row";

        var imgHtml;
        if (item.img) {
          imgHtml = document.createElement("img");
          imgHtml.src = item.img + "?v=" + Date.now() % 100000;
        } else {
          imgHtml = document.createElement("div");
          imgHtml.className = "no-img";
          imgHtml.textContent = "🥤";
        }
        row.appendChild(imgHtml);

        var info = document.createElement("div");
        info.className = "info";
        info.innerHTML = '<div class="name">' + escapeHtml(item.name.th) + " / " + escapeHtml(item.name.en) +
          '</div><div class="price">' + money(item) + "</div>";
        row.appendChild(info);

        var actions = document.createElement("div");
        actions.className = "actions";
        var editBtn = document.createElement("button");
        editBtn.textContent = "✏️ แก้ไข";
        editBtn.onclick = function () { openEdit(item.id); };
        var delBtn = document.createElement("button");
        delBtn.textContent = "🗑️";
        delBtn.onclick = function () { deleteItem(item.id); };
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        row.appendChild(actions);

        block.appendChild(row);
      });

      main.appendChild(block);
    });

    if (!main.children.length) {
      main.innerHTML = '<div class="empty-note">ไม่พบเมนูที่ค้นหา</div>';
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------------- Edit modal ----------------
  function blankItem() {
    return {
      id: "", category: data.categories[0].id,
      name: { th: "", en: "", zh: "" },
      desc: { th: "", en: "", zh: "" },
      img: "", tags: [],
      variants: [{ label: { th: "จาน", en: "plate", zh: "份" }, price: 0 }]
    };
  }

  function slugify(s) {
    return (s || "item").toLowerCase()
      .replace(/[^a-z0-9฀-๿]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item";
  }

  function uniqueId(base) {
    var id = base, n = 2;
    var existing = data.items.map(function (i) { return i.id; });
    while (existing.indexOf(id) !== -1) { id = base + "-" + n; n++; }
    return id;
  }

  // ---------------- Category manager ----------------
  function itemCountForCategory(catId) {
    return data.items.filter(function (i) { return i.category === catId; }).length;
  }

  function openCategoryManager() {
    renderCategoryRows();
    document.getElementById("category-modal-backdrop").classList.add("open");
  }

  function closeCategoryManager() {
    document.getElementById("category-modal-backdrop").classList.remove("open");
  }

  function categoryRowEl(cat) {
    var row = document.createElement("div");
    row.className = "category-row";
    row.dataset.id = cat.id;
    var count = itemCountForCategory(cat.id);
    row.innerHTML =
      '<input class="c-icon" data-f="icon" value="' + escapeHtml(cat.icon || "") + '" placeholder="🍤">' +
      '<input class="c-name" data-f="th" value="' + escapeHtml(cat.name.th) + '" placeholder="ชื่อไทย">' +
      '<input class="c-name" data-f="en" value="' + escapeHtml(cat.name.en) + '" placeholder="English">' +
      '<input class="c-name" data-f="zh" value="' + escapeHtml(cat.name.zh) + '" placeholder="中文">' +
      '<button type="button" class="c-delete" title="ลบหมวดหมู่">✕</button>' +
      '<div class="c-count">' + count + ' เมนูในหมวดนี้' + (count > 0 ? " — ต้องย้ายเมนูออกก่อนจึงจะลบได้" : "") + '</div>';
    var delBtn = row.querySelector(".c-delete");
    delBtn.disabled = count > 0;
    delBtn.onclick = function () { row.remove(); };
    return row;
  }

  function renderCategoryRows() {
    var wrap = document.getElementById("category-rows");
    wrap.innerHTML = "";
    data.categories.forEach(function (cat) { wrap.appendChild(categoryRowEl(cat)); });
  }

  function addCategoryRow() {
    var wrap = document.getElementById("category-rows");
    wrap.appendChild(categoryRowEl({ id: "__new__" + Date.now(), icon: "🍽️", name: { th: "", en: "", zh: "" } }));
  }

  function saveCategories() {
    var rows = Array.prototype.slice.call(document.querySelectorAll("#category-rows .category-row"));
    var newCategories = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var nameTh = row.querySelector('[data-f="th"]').value.trim();
      var nameEn = row.querySelector('[data-f="en"]').value.trim();
      var nameZh = row.querySelector('[data-f="zh"]').value.trim();
      var icon = row.querySelector('[data-f="icon"]').value.trim() || "🍽️";
      if (!nameTh && !nameEn) continue; // skip empty rows
      var origId = row.dataset.id;
      var isNewRow = origId.indexOf("__new__") === 0;
      var id = isNewRow ? uniqueCategoryId(slugify(nameEn || nameTh), newCategories) : origId;
      newCategories.push({ id: id, icon: icon, name: { th: nameTh, en: nameEn || nameTh, zh: nameZh || nameEn || nameTh } });
    }
    if (!newCategories.length) { toast("ต้องมีอย่างน้อย 1 หมวดหมู่", true); return; }

    var btn = document.getElementById("c-save-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>กำลังบันทึก...';

    data.categories = newCategories;
    saveData("Update categories")
      .then(function () {
        toast("บันทึกหมวดหมู่เรียบร้อย");
        closeCategoryManager();
        renderList();
      })
      .catch(function (err) {
        toast("บันทึกไม่สำเร็จ: " + err.message, true);
        return loadData().then(renderList);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "บันทึกหมวดหมู่";
      });
  }

  function uniqueCategoryId(base, alreadyAdded) {
    var existing = data.categories.map(function (c) { return c.id; }).concat(alreadyAdded.map(function (c) { return c.id; }));
    var id = base, n = 2;
    while (existing.indexOf(id) !== -1) { id = base + "-" + n; n++; }
    return id;
  }

  var pendingImageDataUrl = null; // {base64, filename} set when a new image is chosen but not yet saved

  function openEdit(itemId) {
    editingId = itemId;
    pendingImageDataUrl = null;
    var item = itemId === "__new__" ? blankItem() : JSON.parse(JSON.stringify(data.items.filter(function (i) { return i.id === itemId; })[0]));

    document.getElementById("edit-title").textContent = itemId === "__new__" ? "เพิ่มเมนูใหม่" : "แก้ไขเมนู";

    var catSelect = document.getElementById("f-category");
    catSelect.innerHTML = "";
    data.categories.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.icon + " " + c.name.th;
      if (c.id === item.category) opt.selected = true;
      catSelect.appendChild(opt);
    });

    ["th", "en", "zh"].forEach(function (lang) {
      document.getElementById("f-name-" + lang).value = item.name[lang] || "";
      document.getElementById("f-desc-" + lang).value = item.desc ? (item.desc[lang] || "") : "";
    });

    var imgPreview = document.getElementById("f-img-preview");
    if (item.img) {
      imgPreview.innerHTML = '<img src="' + item.img + '?v=' + Date.now() + '">';
    } else {
      imgPreview.innerHTML = '<div class="no-img">🥤</div>';
    }

    var tagWrap = document.getElementById("f-tags");
    tagWrap.innerHTML = "";
    Object.keys(data.tags).forEach(function (tagId) {
      var label = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = tagId;
      cb.checked = item.tags.indexOf(tagId) !== -1;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(data.tags[tagId].th));
      tagWrap.appendChild(label);
    });

    renderVariantRows(item.variants);

    document.getElementById("edit-form").dataset.itemId = itemId;
    document.getElementById("edit-form").dataset.originalName = item.name.en || item.name.th;
    document.getElementById("modal-backdrop").classList.add("open");
    document.getElementById("f-delete-btn").style.display = itemId === "__new__" ? "none" : "inline-block";
  }

  function renderVariantRows(variants) {
    var wrap = document.getElementById("f-variants");
    wrap.innerHTML = "";
    variants.forEach(function (v) { wrap.appendChild(variantRowEl(v)); });
  }

  function variantRowEl(v) {
    v = v || { label: { th: "", en: "", zh: "" }, price: 0 };
    var row = document.createElement("div");
    row.className = "variant-row";
    row.innerHTML =
      '<input class="v-label" data-lang="th" placeholder="ป้ายกำกับ (ไทย) เช่น S/M/L" value="' + escapeHtml(v.label.th) + '">' +
      '<input class="v-label" data-lang="en" placeholder="label (EN)" value="' + escapeHtml(v.label.en) + '">' +
      '<input class="v-label" data-lang="zh" placeholder="标签 (中文)" value="' + escapeHtml(v.label.zh) + '">' +
      '<input class="v-price" type="number" min="0" placeholder="ราคา" value="' + v.price + '">' +
      '<button type="button" title="ลบตัวเลือกนี้">✕</button>';
    row.querySelector("button").onclick = function () { row.remove(); };
    return row;
  }

  function closeEdit() {
    document.getElementById("modal-backdrop").classList.remove("open");
    editingId = null;
    pendingImageDataUrl = null;
  }

  function collectFormItem() {
    var itemId = document.getElementById("edit-form").dataset.itemId;
    var original = itemId === "__new__" ? blankItem() : data.items.filter(function (i) { return i.id === itemId; })[0];

    var name = {
      th: document.getElementById("f-name-th").value.trim(),
      en: document.getElementById("f-name-en").value.trim(),
      zh: document.getElementById("f-name-zh").value.trim()
    };
    var desc = {
      th: document.getElementById("f-desc-th").value.trim(),
      en: document.getElementById("f-desc-en").value.trim(),
      zh: document.getElementById("f-desc-zh").value.trim()
    };
    var category = document.getElementById("f-category").value;
    var tags = Array.prototype.slice.call(document.querySelectorAll("#f-tags input:checked")).map(function (cb) { return cb.value; });

    var variants = Array.prototype.slice.call(document.querySelectorAll("#f-variants .variant-row")).map(function (row) {
      var inputs = row.querySelectorAll("input.v-label");
      return {
        label: { th: inputs[0].value.trim(), en: inputs[1].value.trim(), zh: inputs[2].value.trim() },
        price: Number(row.querySelector(".v-price").value) || 0
      };
    });

    var id = itemId === "__new__" ? uniqueId(slugify(name.en || name.th)) : itemId;

    return {
      id: id, category: category, name: name, desc: desc,
      img: original.img || "", tags: tags,
      variants: variants.length ? variants : [{ label: { th: "จาน", en: "plate", zh: "份" }, price: 0 }]
    };
  }

  function resizeImageToDataUrl(file, maxWidth) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, maxWidth / img.width);
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function onImagePicked(e) {
    var file = e.target.files[0];
    if (!file) return;
    resizeImageToDataUrl(file, 900).then(function (dataUrl) {
      pendingImageDataUrl = dataUrl;
      document.getElementById("f-img-preview").innerHTML = '<img src="' + dataUrl + '">';
    });
  }

  function saveItem() {
    if (!data) return;
    var saveBtn = document.getElementById("f-save-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span>กำลังบันทึก...';

    var item = collectFormItem();
    var isNew = document.getElementById("edit-form").dataset.itemId === "__new__";

    var imageStep = Promise.resolve();
    if (pendingImageDataUrl) {
      var base64 = pendingImageDataUrl.split(",")[1];
      var filename = item.id + ".jpg";
      var path = IMG_DIR + "/" + filename;
      imageStep = ghGetFile(path).catch(function () { return null; }).then(function (existing) {
        return ghPutFile(path, base64, "Update image for " + item.id, existing ? existing.sha : null);
      }).then(function () {
        item.img = "assets/img/dishes/" + filename;
      });
    }

    imageStep.then(function () {
      if (isNew) {
        data.items.push(item);
      } else {
        var idx = data.items.findIndex(function (i) { return i.id === item.id; });
        data.items[idx] = item;
      }
      return saveData((isNew ? "Add menu item: " : "Update menu item: ") + item.name.en || item.id);
    }).then(function () {
      toast(isNew ? "เพิ่มเมนูใหม่เรียบร้อย" : "บันทึกการแก้ไขเรียบร้อย");
      closeEdit();
      renderList();
    }).catch(function (err) {
      toast("บันทึกไม่สำเร็จ: " + err.message, true);
    }).finally(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = "บันทึก";
    });
  }

  function deleteItem(itemId) {
    var item = data.items.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return;
    if (!confirm('ลบเมนู "' + item.name.th + '" ใช่หรือไม่? การลบนี้ย้อนกลับไม่ได้จากหน้านี้')) return;

    data.items = data.items.filter(function (i) { return i.id !== itemId; });
    saveData("Delete menu item: " + item.name.en || itemId)
      .then(function () {
        toast("ลบเมนูเรียบร้อย");
        renderList();
      })
      .catch(function (err) {
        toast("ลบไม่สำเร็จ: " + err.message, true);
        return loadData().then(renderList); // resync on failure
      });
  }

  // ---------------- Wire up ----------------
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      tryLogin(document.getElementById("token-input").value);
    });
    document.getElementById("help-toggle").addEventListener("click", function () {
      document.getElementById("help-box").classList.toggle("show");
    });
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("admin-search").addEventListener("input", renderList);
    document.getElementById("add-item-btn").addEventListener("click", function () { openEdit("__new__"); });
    document.getElementById("f-add-variant").addEventListener("click", function () {
      document.getElementById("f-variants").appendChild(variantRowEl());
    });
    document.getElementById("f-image-input").addEventListener("change", onImagePicked);
    document.getElementById("edit-form").addEventListener("submit", function (e) { e.preventDefault(); saveItem(); });
    document.getElementById("f-cancel-btn").addEventListener("click", closeEdit);
    document.getElementById("f-delete-btn").addEventListener("click", function () {
      var id = document.getElementById("edit-form").dataset.itemId;
      closeEdit();
      deleteItem(id);
    });
    document.getElementById("modal-backdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeEdit();
    });

    document.getElementById("manage-categories-btn").addEventListener("click", openCategoryManager);
    document.getElementById("c-add-category").addEventListener("click", addCategoryRow);
    document.getElementById("c-save-btn").addEventListener("click", saveCategories);
    document.getElementById("c-cancel-btn").addEventListener("click", closeCategoryManager);
    document.getElementById("category-modal-backdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeCategoryManager();
    });

    if (token) {
      showApp();
      verifyToken()
        .then(loadData)
        .then(renderList)
        .catch(function () { logout(); showLogin("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"); });
    } else {
      showLogin();
    }
  });
})();
