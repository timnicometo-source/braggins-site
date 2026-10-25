const partnerGrid =
  document.getElementById("partnerGrid");

const resultCount =
  document.getElementById("resultCount");

const emptyState =
  document.getElementById("emptyState");

const searchSummary =
  document.getElementById("searchSummary");


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name) {
  if (!name) {
    return "";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}


function formatCityStateZip(business) {
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


function normalizeWebsiteUrl(url) {
  if (!url) {
    return "";
  }

  const cleanUrl = url.trim();

  if (!cleanUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  return `https://${cleanUrl}`;
}


function formatPhoneLink(phone) {
  if (!phone) {
    return "";
  }

  return phone.replace(/[^\d+]/g, "");
}


/* =========================================================
   BUSINESS CARD
========================================================= */

function buildCard(business) {

  const websiteUrl =
    normalizeWebsiteUrl(
      business.website
    );


  const websiteLink =
    websiteUrl
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


  const emailLink =
    business.email
      ? `
        <a
          href="mailto:${business.email}"
        >
          Email
        </a>
      `
      : "";


  const phoneNumber =
    business.phone
      ? `
        <p class="business-phone">
          ${business.phone}
        </p>
      `
      : "";


  const callButton =
    business.phone
      ? `
        <a
          class="mobile-call-button"
          href="tel:${formatPhoneLink(
            business.phone
          )}"
        >
          Call
        </a>
      `
      : "";


  const streetAddress =
    business.address
      ? `
        <p class="business-address">
          ${business.address}
        </p>
      `
      : "";


  const cityStateZip =
    formatCityStateZip(business);


  const cityStateZipMarkup =
    cityStateZip
      ? `
        <p class="location">
          ${cityStateZip}
        </p>
      `
      : "";


  return `
    <article class="partner-card">

      <div class="card-top">

        <div class="logo-bubble">
          ${getInitials(
            business.business_name
          )}
        </div>

        <span class="tag">
          SBR Recommended
        </span>

      </div>


      <h3>
        ${business.business_name}
      </h3>


      <div class="business-location">
        ${streetAddress}
        ${cityStateZipMarkup}
      </div>


      ${phoneNumber}


      <p class="summary">
        ${
          business.description ||
          "Trusted SBR network business."
        }
      </p>


      <div class="card-actions">
        ${websiteLink}
        ${emailLink}
        ${callButton}
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

  if (!Array.isArray(list)) {
    list = [];
  }

  partnerGrid.innerHTML =
    list
      .map(buildCard)
      .join("");


  if (resultCount) {
    resultCount.textContent =
      `${list.length} trusted ${
        list.length === 1
          ? "match"
          : "matches"
      }`;
  }


  if (emptyState) {
    emptyState.hidden =
      list.length !== 0;
  }
}


/* =========================================================
   LOAD RESULTS
========================================================= */

async function loadResults() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  /*
   * Remove obsolete residential/commercial filter
   * from older saved URLs.
   */
  params.delete("type");


  const category =
    params.get("category") || "";

  const city =
    params.get("city") || "";


  const summaryParts = [];


  if (category) {
    summaryParts.push(
      category
        .replace(/-/g, " ")
        .replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        )
    );
  }


  if (city) {
    summaryParts.push(city);
  }


  if (searchSummary) {
    searchSummary.textContent =
      summaryParts.length
        ? `Showing trusted matches for ${summaryParts.join(
            " • "
          )}`
        : "Showing trusted SBR businesses.";
  }


  try {

    const response =
      await fetch(
        `/api/businesses.php?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {
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
   INITIALIZE
========================================================= */

loadResults();