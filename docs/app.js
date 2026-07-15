(function () {
  let YEARS = [];
  let state = { year: "all", cat: null, q: "" };

  const el = (sel) => document.querySelector(sel);
  const yearsEl = el("#years");
  const catlistEl = el("#catlist");
  const resultsEl = el("#results");
  const viewTitleEl = el("#viewTitle");
  const viewMetaEl = el("#viewMeta");
  const searchEl = el("#search");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function yearsInScope() {
    return state.year === "all" ? YEARS : YEARS.filter(y => y.year === state.year);
  }

  // Build merged category list across years in scope: name -> {name, papers:[{...,year}]}
  function mergedCategories() {
    const map = new Map();
    const order = [];
    for (const y of yearsInScope()) {
      for (const c of y.categories) {
        if (!map.has(c.name)) { map.set(c.name, { name: c.name, papers: [] }); order.push(c.name); }
        const bucket = map.get(c.name);
        for (const p of c.papers) bucket.papers.push({ ...p, year: y.year });
      }
    }
    return order.map(n => map.get(n));
  }

  function matchesQuery(text) {
    if (!state.q) return true;
    return text.toLowerCase().includes(state.q.toLowerCase());
  }

  function renderYearButtons() {
    const allBtn = `<button class="year-btn ${state.year === "all" ? "active" : ""}" data-year="all">All years</button>`;
    const btns = YEARS.map(y =>
      `<button class="year-btn ${state.year === y.year ? "active" : ""}" data-year="${y.year}">${y.year}</button>`
    ).join("");
    yearsEl.innerHTML = allBtn + btns;
    yearsEl.querySelectorAll(".year-btn").forEach(b => {
      b.addEventListener("click", () => {
        state.year = b.dataset.year;
        state.cat = null;
        renderAll();
      });
    });
  }

  function renderCatList() {
    const cats = mergedCategories();
    const q = state.q.toLowerCase();
    const visible = cats.filter(c => {
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      return c.papers.some(p => (p.title || "").toLowerCase().includes(q));
    });

    const allActive = state.cat === null ? "active" : "";
    let html = `<button class="cat-btn ${allActive}" data-cat="">All categories<span class="count">${cats.reduce((s, c) => s + c.papers.length, 0)}</span></button>`;
    html += visible.map(c => {
      const active = state.cat === c.name ? "active" : "";
      const empty = c.papers.length === 0 ? "empty" : "";
      return `<button class="cat-btn ${active} ${empty}" data-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}<span class="count">${c.papers.length}</span></button>`;
    }).join("");
    catlistEl.innerHTML = html;
    catlistEl.querySelectorAll(".cat-btn").forEach(b => {
      b.addEventListener("click", () => {
        state.cat = b.dataset.cat || null;
        renderMain();
        renderCatList();
      });
    });
  }

  function paperCard(p) {
    const links = [];
    if (p.paper) links.push(`<a href="${escapeHtml(p.paper)}" target="_blank" rel="noopener">Paper</a>`);
    if (p.code) links.push(`<a href="${escapeHtml(p.code)}" target="_blank" rel="noopener">Code</a>`);
    if (p.homepage) links.push(`<a href="${escapeHtml(p.homepage)}" target="_blank" rel="noopener">Homepage</a>`);
    if (p.project) links.push(`<a href="${escapeHtml(p.project)}" target="_blank" rel="noopener">Project</a>`);
    if (p.dataset) links.push(`<a href="${escapeHtml(p.dataset)}" target="_blank" rel="noopener">Dataset</a>`);
    return `<div class="card">
      <h4>${escapeHtml(p.title || "(untitled)")}</h4>
      <div class="links">${links.join("")}</div>
    </div>`;
  }

  function renderMain() {
    const cats = mergedCategories();
    const q = state.q.toLowerCase();

    let groups = state.cat === null ? cats : cats.filter(c => c.name === state.cat);

    if (q) {
      groups = groups
        .map(c => {
          const nameMatch = c.name.toLowerCase().includes(q);
          const papers = nameMatch ? c.papers : c.papers.filter(p => (p.title || "").toLowerCase().includes(q));
          return { name: c.name, papers };
        })
        .filter(c => c.papers.length > 0);
    }

    viewTitleEl.textContent = state.cat === null ? "All categories" : state.cat;
    const totalPapers = groups.reduce((s, c) => s + c.papers.length, 0);
    viewMetaEl.textContent = `${totalPapers} paper${totalPapers === 1 ? "" : "s"} · scope: ${state.year === "all" ? "2019–2025" : state.year}`;

    if (groups.length === 0) {
      resultsEl.innerHTML = `<p class="empty-msg">No results.</p>`;
      return;
    }

    resultsEl.innerHTML = groups.map(c => {
      if (c.papers.length === 0) {
        return `<div class="cat-group"><h3>${escapeHtml(c.name)}</h3><p class="empty-msg">No papers listed yet for this category.</p></div>`;
      }
      return `<div class="cat-group">
        <h3>${escapeHtml(c.name)}</h3>
        <div class="papers">${c.papers.map(paperCard).join("")}</div>
      </div>`;
    }).join("");
  }

  function renderAll() {
    renderYearButtons();
    renderCatList();
    renderMain();
  }

  searchEl.addEventListener("input", () => {
    state.q = searchEl.value;
    renderCatList();
    renderMain();
  });

  fetch("data.json")
    .then(r => r.json())
    .then(data => {
      YEARS = data;
      renderAll();
    })
    .catch(err => {
      resultsEl.innerHTML = `<p class="empty-msg">Failed to load data.json: ${escapeHtml(err.message)}</p>`;
    });
})();
