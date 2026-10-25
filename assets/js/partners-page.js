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

    if (/^https?:\/\//i.test(cleanUrl)) {
      return cleanUrl;
    }

    return `https://${cleanUrl}`;
  }


  function formatPhoneNumber(phone) {
    if (!phone) {
      return "";
    }

    const digits =
      phone.replace(/\D/g, "");

    /*
     * 11-digit US number with leading 1
     */
    if (
      digits.length === 11 &&
      digits.startsWith("1")
    ) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }


    /*
     * Standard 10-digit US number
     */
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }


    /*
     * Don't guess if the number is unusual.
     */
    return phone;
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


  function getTopLevelCategory(business) {
    return (
      business.parent_category_name ||
      business.category_name ||
      "Other"
    );
  }


  function getSpecificCategory(business) {
    /*
     * If the business is already assigned directly
     * to the top-level category, don't repeat it.
     */

    if (
      !business.parent_category_name ||
      business.parent_category_name ===
        business.category_name
    ) {
      return "";
    }

    return business.category_name || "";
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
      formatPartnerLocation(
        business
      );


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
            ${formatPhoneNumber(
              business.phone
            )}
          </p>
        `
        : "";


    const specificCategory =
      getSpecificCategory(
        business
      );


    const categoryMarkup =
      specificCategory
        ? `
          <div class="partner-category-label">
            ${specificCategory}
          </div>
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


        ${categoryMarkup}


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
     GROUP BUSINESSES
  ========================================================= */

  function groupPartners(list) {

    const groups = {};


    list.forEach(business => {

      const groupName =
        getTopLevelCategory(
          business
        );


      if (!groups[groupName]) {
        groups[groupName] = [];
      }


      groups[groupName].push(
        business
      );
    });


    return groups;
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


    const grouped =
      groupPartners(list);


    const groupNames =
      Object.keys(grouped)
        .sort((a, b) =>
          a.localeCompare(b)
        );


    partnersGrid.innerHTML =
      groupNames
        .map(groupName => {

          const businesses =
            grouped[groupName]
              .sort((a, b) =>
                (a.business_name || "")
                  .localeCompare(
                    b.business_name || ""
                  )
              );


          return `
            <section class="partner-category-section">

              <div class="partner-category-heading">

                <p class="eyebrow">
                  SBR Category
                </p>

                <h2>
                  ${groupName}
                </h2>

                <p class="partner-category-count">
                  ${businesses.length}
                  ${
                    businesses.length === 1
                      ? "business"
                      : "businesses"
                  }
                </p>

              </div>


              <div class="card-grid">

                ${businesses
                  .map(
                    buildPartnerCard
                  )
                  .join("")}

              </div>

            </section>
          `;
        })
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
        !Array.isArray(
          data.businesses
        )
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