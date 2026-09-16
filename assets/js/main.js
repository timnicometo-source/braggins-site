const mobileToggle = document.getElementById("mobileToggle");
const siteNav = document.getElementById("siteNav");

if (mobileToggle && siteNav) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const partnerGrid = document.getElementById("partnerGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function buildCard(partner) {
  const tags = partner.tags.map(tag => `<span>${tag}</span>`).join("");

  return `
    <article class="partner-card" data-category="${partner.category}">
      <div class="card-top">
        <div class="logo-bubble">${getInitials(partner.name)}</div>
        <span class="tag">SBR Recommended</span>
      </div>

      <p class="category">${partner.category}</p>
      <h3>${partner.name}</h3>
      <p class="location">${partner.location}</p>
      <p class="summary">${partner.summary}</p>

      <div class="tags">${tags}</div>

      <div class="recommendation">
        <strong>Why SBR recommends them</strong>
        ${partner.recommendation}
      </div>

      <div class="card-actions">
        <a href="${partner.website}" target="_blank" rel="noopener">Website</a>
        <a href="mailto:${partner.email}">Email</a>
      </div>
    </article>
  `;
}

function renderPartners(list) {
  if (!partnerGrid || !window.SBR_PARTNERS) return;

  partnerGrid.innerHTML = list.map(buildCard).join("");

  if (resultCount) {
    resultCount.textContent = `${list.length} trusted ${list.length === 1 ? "match" : "matches"}`;
  }

  if (emptyState) {
    emptyState.hidden = list.length !== 0;
  }
}

function populateCategories() {
  if (!categoryFilter || !window.SBR_PARTNERS) return;

  const categories = [...new Set(window.SBR_PARTNERS.map(partner => partner.category))].sort();

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function filterPartners() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const category = categoryFilter?.value || "";

  const filtered = window.SBR_PARTNERS.filter(partner => {
    const searchText = [
      partner.name,
      partner.category,
      partner.location,
      partner.summary,
      partner.recommendation,
      ...partner.tags
    ].join(" ").toLowerCase();

    const matchesQuery = !query || searchText.includes(query);
    const matchesCategory = !category || partner.category === category;

    return matchesQuery && matchesCategory;
  });

  renderPartners(filtered);
}

if (window.SBR_PARTNERS && partnerGrid) {
  populateCategories();
  renderPartners(window.SBR_PARTNERS);
}

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    filterPartners();
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", filterPartners);
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", filterPartners);
}

document.querySelectorAll("[data-chip]").forEach(chip => {
  chip.addEventListener("click", () => {
    if (searchInput) searchInput.value = chip.dataset.chip;
    filterPartners();
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
