const mobileToggle = document.getElementById("mobileToggle");
const siteNav = document.getElementById("siteNav");

if (mobileToggle && siteNav) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");

    mobileToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });
}


/* =========================================================
   SEARCH ELEMENTS
========================================================= */

const searchForm =
  document.getElementById("searchForm");

const categoryFilter =
  document.getElementById("categoryFilter");

const cityFilter =
  document.getElementById("cityFilter");


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {
  if (!categoryFilter) {
    return;
  }

  try {
    const response =
      await fetch("/api/categories.php");

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.groups)
    ) {
      throw new Error(
        "Unable to load categories."
      );
    }


    /*
     * Keep the first/default option:
     *
     * Choose a service
     */

    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }


    /*
     * Build grouped category dropdown.
     */

    data.groups.forEach(group => {
      const optgroup =
        document.createElement("optgroup");

      optgroup.label =
        group.group;


      group.categories.forEach(category => {
        const option =
          document.createElement("option");

        option.value =
          category.slug;

        option.textContent =
          category.name;

        optgroup.appendChild(option);
      });


      categoryFilter.appendChild(optgroup);
    });

  } catch (error) {
    console.error(
      "Category load error:",
      error
    );
  }
}


/* =========================================================
   SEARCH FORM
========================================================= */

if (searchForm) {
  searchForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();


      const category =
        categoryFilter?.value || "";

      const city =
        cityFilter?.value.trim() || "";


      const params =
        new URLSearchParams();


      if (category) {
        params.set(
          "category",
          category
        );
      }


      if (city) {
        params.set(
          "city",
          city
        );

        /*
         * The public search is currently
         * centered on Minnesota.
         *
         * We can revisit this later because
         * the SBR database also contains WI
         * businesses.
         */
        params.set(
          "state",
          "MN"
        );
      }


      const queryString =
        params.toString();


      if (queryString) {
        window.location.href =
          `/results.html?${queryString}`;
      } else {
        window.location.href =
          "/results.html";
      }
    }
  );
}


/* =========================================================
   INITIALIZE
========================================================= */

loadCategories();