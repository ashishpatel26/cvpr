(function () {
  let YEARS = [];
  const state = { year: "all", cat: null, q: "" };

  const $ = (s) => document.querySelector(s);
  const yearsEl = $("#years"), catlistEl = $("#catlist"), resultsEl = $("#results");
  const viewTitleEl = $("#viewTitle"), viewDescEl = $("#viewDesc"), viewMetaEl = $("#viewMeta");
  const searchEl = $("#search"), rangeEl = $("#mastheadRange");

  // theme
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("cvpr-theme");
  root.dataset.theme = savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("cvpr-theme", root.dataset.theme);
  });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const yearRange = () => `${YEARS[0].year}–${YEARS[YEARS.length - 1].year}`;
  const inScope = () => state.year === "all" ? YEARS : YEARS.filter(y => y.year === state.year);

  function merged() {
    const map = new Map(), order = [];
    for (const y of inScope()) {
      for (const c of y.categories) {
        if (!map.has(c.name)) { map.set(c.name, { name: c.name, desc: c.desc, papers: [] }); order.push(c.name); }
        const b = map.get(c.name);
        if (!b.desc && c.desc) b.desc = c.desc;
        for (const p of c.papers) b.papers.push({ ...p, year: y.year });
      }
    }
    return order.map(n => map.get(n));
  }

  function renderYears() {
    let html = `<button class="year-btn ${state.year === "all" ? "active" : ""}" data-year="all">ALL</button>`;
    html += YEARS.map(y => `<button class="year-btn ${state.year === y.year ? "active" : ""}" data-year="${y.year}">’${y.year.slice(2)}</button>`).join("");
    yearsEl.innerHTML = html;
    yearsEl.querySelectorAll(".year-btn").forEach(b =>
      b.addEventListener("click", () => { state.year = b.dataset.year; state.cat = null; renderAll(); }));
  }

  function renderCats() {
    const cats = merged();
    const q = state.q.toLowerCase();
    const visible = cats.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.papers.some(p => (p.title || "").toLowerCase().includes(q)));
    const total = cats.reduce((s, c) => s + c.papers.length, 0);

    let html = `<button class="cat-btn ${state.cat === null ? "active" : ""}" data-cat="">All categories<span class="count">${total}</span></button>`;
    html += visible.map(c =>
      `<button class="cat-btn ${state.cat === c.name ? "active" : ""} ${c.papers.length ? "" : "empty"}" data-cat="${esc(c.name)}">${esc(c.name)}<span class="count">${c.papers.length}</span></button>`
    ).join("");
    catlistEl.innerHTML = html;
    catlistEl.querySelectorAll(".cat-btn").forEach(b =>
      b.addEventListener("click", () => { state.cat = b.dataset.cat || null; renderMain(); renderCats(); }));
  }

  function paperRow(p, showYear) {
    const links = [];
    if (p.paper) links.push(`<a href="${esc(p.paper)}" target="_blank" rel="noopener">Paper</a>`);
    if (p.code) links.push(`<a href="${esc(p.code)}" target="_blank" rel="noopener">Code</a>`);
    if (p.homepage) links.push(`<a href="${esc(p.homepage)}" target="_blank" rel="noopener">Site</a>`);
    if (p.dataset) links.push(`<a href="${esc(p.dataset)}" target="_blank" rel="noopener">Data</a>`);
    if (p.demo) links.push(`<a href="${esc(p.demo)}" target="_blank" rel="noopener">Demo</a>`);
    const yearChip = showYear ? `<span class="year-chip">${p.year}</span>` : "";
    return `<li class="paper">
      <span class="paper-title">${esc(p.title || "Untitled entry")}${yearChip}</span>
      <span class="paper-links">${links.join("") || '<span class="nolink">no links</span>'}</span>
    </li>`;
  }

  function renderMain() {
    const cats = merged();
    const q = state.q.toLowerCase();
    const showYear = state.year === "all";

    let groups = state.cat === null ? cats : cats.filter(c => c.name === state.cat);
    if (q) {
      groups = groups.map(c => {
        const nameMatch = c.name.toLowerCase().includes(q);
        return { ...c, papers: nameMatch ? c.papers : c.papers.filter(p => (p.title || "").toLowerCase().includes(q)) };
      }).filter(c => c.papers.length > 0);
    } else if (state.cat === null) {
      groups = groups.filter(c => c.papers.length > 0);
    }

    const single = state.cat !== null && groups.length === 1;
    viewTitleEl.textContent = state.cat === null ? "All categories" : state.cat;
    viewDescEl.textContent = single ? (groups[0].desc || "") : "Every open-source CVPR paper, indexed by research area and explained in plain English.";

    const totalPapers = groups.reduce((s, c) => s + c.papers.length, 0);
    viewMetaEl.innerHTML = `<b>${totalPapers}</b> paper${totalPapers === 1 ? "" : "s"} · ${groups.length} categor${groups.length === 1 ? "y" : "ies"} · ${state.year === "all" ? yearRange() : "CVPR " + state.year}`;

    if (groups.length === 0) {
      resultsEl.innerHTML = `<p class="no-results">Nothing in the index matches “${esc(state.q)}”.</p>`;
      return;
    }

    resultsEl.innerHTML = groups.map(c => `
      <section class="cat-group">
        ${single ? "" : `<div class="cat-head">
          <h3><a href="#" data-cat="${esc(c.name)}">${esc(c.name)}</a></h3>
          ${c.desc ? `<p class="cat-desc">${esc(c.desc)}</p>` : ""}
          <span class="cat-count">${c.papers.length} paper${c.papers.length === 1 ? "" : "s"}</span>
        </div>`}
        ${c.papers.length
          ? `<ol class="paper-list">${c.papers.map(p => paperRow(p, showYear)).join("")}</ol>`
          : `<p class="empty-note">No open-source papers recorded in this category yet.</p>`}
      </section>`).join("");

    resultsEl.querySelectorAll(".cat-head a").forEach(a =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        state.cat = a.dataset.cat;
        renderMain(); renderCats();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }));
  }

  function renderAll() { renderYears(); renderCats(); renderMain(); }

  let t;
  searchEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = searchEl.value.trim(); renderCats(); renderMain(); }, 120);
  });

  fetch("data.json").then(r => r.json()).then(data => {
    YEARS = data;
    rangeEl.textContent = `${yearRange()} · ${YEARS.reduce((s, y) => s + y.categories.reduce((a, c) => a + c.papers.length, 0), 0)} papers indexed`;
    renderAll();
  }).catch(err => {
    resultsEl.innerHTML = `<p class="no-results">Failed to load index: ${esc(err.message)}</p>`;
  });
})();
