const mobileToggle = document.getElementById("mobileToggle");
const siteNav = document.getElementById("siteNav");

if (mobileToggle && siteNav) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
  });
}


/* =========================================================
   SEARCH ELEMENTS
========================================================= */

const partnerGrid = document.getElementById("partnerGrid");
const searchForm = document.getElementById("searchForm");

const categoryFilter = document.getElementById("categoryFilter");
const cityFilter = document.getElementById("cityFilter");
const typeFilter = document.getElementById("typeFilter");

const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}


function formatBusinessType(type) {
  if (type === "both") {
    return "Residential & Commercial";
  }

  if (!type) {
    return "";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}


function formatLocation(business) {
  const cityState = [
    business.city,
    business.state
  ]
    .filter(Boolean)
    .join(", ");

  if (business.zip) {
    return `${cityState} ${business.zip}`.trim();
  }

  return cityState;
}


/* =========================================================
   BUILD BUSINESS CARD
========================================================= */

function buildCard(business) {
  const websiteLink = business.website
    ? `
      <a
        href="${business.website}"
        target="_blank"
        rel="noopener"
      >
        Website
      </a>
    `
    : "";

  const emailLink = business.email
    ? `
      <a href="mailto:${business.email}">
        Email
      </a>
    `
    : "";

  const phoneLink = business.phone
    ? `
      <a href="tel:${business.phone.replace(/[^\d+]/g, "")}">
        Call
      </a>
    `
    : "";

  return `
    <article class="partner-card">

      <div class="card-top">

        <div class="logo-bubble">
          ${getInitials(business.business_name)}
        </div>

        <span class="tag">
          SBR Recommended
        </span>

      </div>

      <h3>
        ${business.business_name}
      </h3>

      <p class="location">
        ${formatLocation(business)}
      </p>

      <p class="summary">
        ${business.description || "Trusted SBR network business."}
      </p>

      <div class="tags">
        <span>
          ${formatBusinessType(business.business_type)}
        </span>
      </div>

      <div class="card-actions">
        ${websiteLink}
        ${emailLink}
        ${phoneLink}
      </div>

    </article>
  `;
}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderBusinesses(list) {
  if (!partnerGrid) {
    return;
  }

  partnerGrid.innerHTML = list
    .map(buildCard)
    .join("");

  if (resultCount) {
    resultCount.textContent =
      `${list.length} trusted ${list.length === 1 ? "match" : "matches"}`;
  }

  if (emptyState) {
    emptyState.hidden = list.length !== 0;
  }
}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {
  if (!categoryFilter) {
    return;
  }

  try {
    const response = await fetch("api/categories.php");
    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.categories)
    ) {
      throw new Error("Unable to load categories.");
    }

    data.categories.forEach(category => {
      const option = document.createElement("option");

      option.value = category.slug;
      option.textContent = category.category_name;

      categoryFilter.appendChild(option);
    });

  } catch (error) {
    console.error("Category load error:", error);
  }
}


/* =========================================================
   SEARCH BUSINESSES
========================================================= */

async function searchBusinesses() {
  const category = categoryFilter?.value || "";
  const city = cityFilter?.value.trim() || "";
  const type = typeFilter?.value || "";

  const params = new URLSearchParams();


  if (category) {
    params.set("category", category);
  }


  if (city) {
    params.set("city", city);
    params.set("state", "MN");
  }


  if (type) {
    params.set("type", type);
  }


  try {

    if (resultCount) {
      resultCount.textContent = "Searching trusted partners...";
    }

    const response = await fetch(
      `api/businesses.php?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Unable to load businesses."
      );
    }

    renderBusinesses(data.businesses);

  } catch (error) {

    console.error(
      "Business search error:",
      error
    );

    if (resultCount) {
      resultCount.textContent =
        "Unable to load businesses.";
    }

    if (partnerGrid) {
      partnerGrid.innerHTML = "";
    }

    if (emptyState) {
      emptyState.hidden = false;
    }
  }
}


/* =========================================================
   SEARCH SUBMIT
========================================================= */

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();

    searchBusinesses();

    document
      .getElementById("results")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  });
}


/* =========================================================
   INITIALIZE
========================================================= */

loadCategories();