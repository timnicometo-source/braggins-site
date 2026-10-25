<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/db-config.php';


/* =========================================================
   SEARCH PARAMETERS
========================================================= */

$category =
    trim($_GET['category'] ?? '');

$city =
    trim($_GET['city'] ?? '');

$state =
    trim($_GET['state'] ?? 'MN');


/* =========================================================
   BASE QUERY
========================================================= */

$sql = "
    SELECT DISTINCT
        businesses.id,
        businesses.business_name,
        businesses.slug,
        businesses.description,
        businesses.email,
        businesses.phone,
        businesses.website,
        businesses.address,
        businesses.city,
        businesses.state,
        businesses.zip,

        categories.id AS category_id,
        categories.category_name,
        categories.slug AS category_slug,

        parent_categories.id AS parent_category_id,
        parent_categories.category_name AS parent_category_name,
        parent_categories.slug AS parent_category_slug

    FROM businesses

    INNER JOIN business_categories
        ON businesses.id =
           business_categories.business_id

    INNER JOIN categories
        ON categories.id =
           business_categories.category_id

    LEFT JOIN categories AS parent_categories
        ON categories.parent_id =
           parent_categories.id
";


$params = [];


/* =========================================================
   SERVICE AREA JOIN
   Only needed when city search is used
========================================================= */

if ($city !== '') {

    $sql .= "
        INNER JOIN business_service_areas
            ON businesses.id =
               business_service_areas.business_id
    ";
}


/* =========================================================
   ACTIVE BUSINESSES / CATEGORIES ONLY
========================================================= */

$sql .= "
    WHERE businesses.active = 1
      AND categories.active = 1
";


/* =========================================================
   CATEGORY FILTER
========================================================= */

if ($category !== '') {

    $sql .= "
        AND categories.slug = :category
    ";

    $params['category'] =
        $category;
}


/* =========================================================
   CITY / SERVICE AREA FILTER
========================================================= */

if ($city !== '') {

    $sql .= "
        AND business_service_areas.city = :city
        AND business_service_areas.state = :state
    ";

    $params['city'] =
        $city;

    $params['state'] =
        $state;
}


/* =========================================================
   SORTING
========================================================= */

$sql .= "
    ORDER BY
        COALESCE(
            parent_categories.category_name,
            categories.category_name
        ),
        categories.category_name,
        businesses.business_name
";


/* =========================================================
   EXECUTE
========================================================= */

$stmt =
    $pdo->prepare($sql);

$stmt->execute($params);

$businesses =
    $stmt->fetchAll();


/* =========================================================
   RESPONSE
========================================================= */

echo json_encode(
    [
        'success' => true,
        'count' => count($businesses),
        'businesses' => $businesses
    ],
    JSON_PRETTY_PRINT |
    JSON_UNESCAPED_SLASHES
);