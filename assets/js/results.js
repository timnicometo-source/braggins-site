const partnerGrid = document.getElementById("partnerGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const searchSummary = document.getElementById("searchSummary");

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

function renderBusinesses(list) {
  partnerGrid.innerHTML = list
    .map(buildCard)
    .join("");

  resultCount.textContent =
    `${list.length} trusted ${list.length === 1 ? "match" : "matches"}`;

  emptyState.hidden = list.length !== 0;
}

async function loadResults() {
  const params = new URLSearchParams(window.location.search);

  const category = params.get("category") || "";
  const city = params.get("city") || "";
  const state = params.get("state") || "";
  const type = params.get("type") || "";

  const summaryParts = [];

  if (category) {
    summaryParts.push(category.replace(/-/g, " "));
  }

  if (city) {
    summaryParts.push(city);
  }

  if (type) {
    summaryParts.push(type);
  }

  searchSummary.textContent = summaryParts.length
    ? `Showing trusted matches for ${summaryParts.join(" • ")}`
    : "Showing trusted SBR businesses.";

  try {
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
    console.error("Results load error:", error);

    resultCount.textContent =
      "Unable to load businesses.";

    partnerGrid.innerHTML = "";

    emptyState.hidden = false;
  }
}

loadResults();