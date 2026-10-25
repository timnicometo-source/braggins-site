(() => {

  const partnersGrid =
    document.getElementById("partnerGrid");

  const partnersCount =
    document.getElementById("partnerCount");

  const partnersEmptyState =
    document.getElementById("partnerEmptyState");


  /* =========================================================
     HELPERS
  ========================================================= */

  function getPartnerInitials(name) {
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


  function formatPartnerLocation(business) {
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


  function normalizePartnerWebsite(url) {
    if (!url) {
      return "";
    }

    const cleanUrl =
      url.trim();

    if (!cleanUrl) {
      return "";
    }

    if (
      /^https?:\/\//i.test(cleanUrl)
    ) {
      return cleanUrl;
    }

    return `https://${cleanUrl}`;
  }


  function formatPartnerPhoneLink(phone) {
    if (!phone) {
      return "";
    }

    return phone.replace(
      /[^\d+]/g,
      ""
    );
  }


  /* =========================================================
     BUILD CARD
  ========================================================= */

  function buildPartnerCard(business) {

    const websiteUrl =
      normalizePartnerWebsite(
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


    const callButton =
      business.phone
        ? `
          <a
            class="mobile-call-button"
            href="tel:${formatPartnerPhoneLink(
              business.phone
            )}"
          >
            Call
          </a>
        `
        : "";


    const addressMarkup =
      business.address
        ? `
          <p class="business-address">
            ${business.address}
          </p>
        `
        : "";


    const location =
      formatPartnerLocation(business);


    const locationMarkup =
      location
        ? `
          <p class="location">
            ${location}
          </p>
        `
        : "";


    const phoneMarkup =
      business.phone
        ? `
          <p class="business-phone">
            ${business.phone}
          </p>
        `
        : "";


    return `
      <article class="partner-card">

        <div class="card-top">

          <div class="logo-bubble">
            ${getPartnerInitials(
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
          ${addressMarkup}
          ${locationMarkup}
        </div>


        ${phoneMarkup}


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
     RENDER PARTNERS
  ========================================================= */

  function renderPartners(list) {

    if (!partnersGrid) {
      return;
    }


    if (!Array.isArray(list)) {
      list = [];
    }


    list.sort((a, b) =>
      (a.business_name || "")
        .localeCompare(
          b.business_name || ""
        )
    );


    partnersGrid.innerHTML =
      list
        .map(buildPartnerCard)
        .join("");


    if (partnersCount) {
      partnersCount.textContent =
        `${list.length} ${
          list.length === 1
            ? "partner"
            : "partners"
        }`;
    }


    if (partnersEmptyState) {
      partnersEmptyState.hidden =
        list.length !== 0;
    }
  }


  /* =========================================================
     LOAD PARTNERS
  ========================================================= */

  async function loadPartners() {

    try {

      const response =
        await fetch(
          "/api/businesses.php"
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success ||
        !Array.isArray(data.businesses)
      ) {
        throw new Error(
          data.message ||
          "Unable to load partners."
        );
      }


      renderPartners(
        data.businesses
      );

    } catch (error) {

      console.error(
        "Partner load error:",
        error
      );


      if (partnersCount) {
        partnersCount.textContent =
          "Unable to load partners.";
      }


      if (partnersGrid) {
        partnersGrid.innerHTML =
          "";
      }


      if (partnersEmptyState) {
        partnersEmptyState.hidden =
          false;
      }
    }
  }


  /* =========================================================
     INITIALIZE
  ========================================================= */

  loadPartners();

})();