const partnerGrid = document.getElementById("partnerGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const searchSummary = document.getElementById("searchSummary");


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

  if (!type || type === "unknown") {
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


/*
 * Eric's database may contain:
 *
 * dirtylittleautodetails.com
 *
 * instead of:
 *
 * https://dirtylittleautodetails.com
 *
 * Without a protocol, the browser treats the URL as
 * relative to the Braggins website.
 */
function normalizeWebsiteUrl(url) {
  if (!url) {
    return "";
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://")
  ) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}


function formatPhoneLink(phone) {
  if (!phone) {
    return "";
  }

  return phone.replace(/[^\d+]/g, "");
}


/* =========================================================
   BUILD BUSINESS CARD
========================================================= */

function buildCard(business) {
  const websiteUrl = normalizeWebsiteUrl(
    business.website
  );

  const websiteLink = websiteUrl
    ? `
      <a
        href="${websiteUrl}"
        target="_blank"
        rel="noopener noreferrer"
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

  const phoneNumber = business.phone
    ? `
      <p class="business-phone">
        ${business.phone}
      </p>
    `
    : "";

  const phoneLink = business.phone
    ? `
      <a
        class="mobile-call-button"
        href="tel:${formatPhoneLink(business.phone)}"
      >
        Call
      </a>
    `
    : "";

  const formattedType = formatBusinessType(
    business.business_type
  );

  const typeMarkup = formattedType
    ? `
      <div class="tags">
        <span>
          ${formattedType}
        </span>
      </div>
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

      ${phoneNumber}

      <p class="summary">
        ${business.description || "Trusted SBR network business."}
      </p>

      ${typeMarkup}

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
  partnerGrid.innerHTML = list
    .map(buildCard)
    .join("");

  resultCount.textContent =
    `${list.length} trusted ${list.length === 1 ? "match" : "matches"}`;

  emptyState.hidden =
    list.length !== 0;
}


/* =========================================================
   LOAD RESULTS
========================================================= */

async function loadResults() {
  const params =
    new URLSearchParams(window.location.search);

  const category =
    params.get("category") || "";

  const city =
    params.get("city") || "";

  const state =
    params.get("state") || "";

  const summaryParts = [];

  if (category) {
    summaryParts.push(
      category.replace(/-/g, " ")
    );
  }

  if (city) {
    summaryParts.push(city);
  }

  searchSummary.textContent =
    summaryParts.length
      ? `Showing trusted matches for ${summaryParts.join(" • ")}`
      : "Showing trusted SBR businesses.";

  try {
    const response = await fetch(
      `api/businesses.php?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load businesses."
      );
    }

    renderBusinesses(
      data.businesses
    );

  } catch (error) {
    console.error(
      "Results load error:",
      error
    );

    resultCount.textContent =
      "Unable to load businesses.";

    partnerGrid.innerHTML = "";

    emptyState.hidden = false;
  }
}


/* =========================================================
   INITIALIZE
========================================================= */

loadResults();