<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/db-config.php';

$category = trim($_GET['category'] ?? '');
$city = trim($_GET['city'] ?? '');
$state = trim($_GET['state'] ?? 'MN');
$type = trim($_GET['type'] ?? '');

$allowedTypes = ['residential', 'commercial'];

if ($type !== '' && !in_array($type, $allowedTypes, true)) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid business type.'
    ]);

    exit;
}

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
        businesses.business_type
    FROM businesses
    INNER JOIN business_categories
        ON businesses.id = business_categories.business_id
    INNER JOIN categories
        ON categories.id = business_categories.category_id
";

$params = [];

if ($city !== '') {
    $sql .= "
        INNER JOIN business_service_areas
            ON businesses.id = business_service_areas.business_id
    ";
}

$sql .= "
    WHERE businesses.active = 1
      AND categories.active = 1
";

if ($category !== '') {
    $sql .= " AND categories.slug = :category";
    $params['category'] = $category;
}

if ($city !== '') {
    $sql .= "
        AND business_service_areas.city = :city
        AND business_service_areas.state = :state
    ";

    $params['city'] = $city;
    $params['state'] = $state;
}

if ($type !== '') {
    $sql .= "
        AND (
            businesses.business_type = :business_type
            OR businesses.business_type = 'both'
        )
    ";

    $params['business_type'] = $type;
}

$sql .= " ORDER BY businesses.business_name";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$businesses = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'count' => count($businesses),
    'businesses' => $businesses
], JSON_PRETTY_PRINT);