<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/db-config.php';

$categorySlug = $_GET['category'] ?? '';

$categorySlug = trim($categorySlug);

if ($categorySlug === '') {
    http_response_code(400);
    exit('Missing category.');
}

$sql = "
    SELECT
        businesses.id,
        businesses.business_name,
        businesses.city,
        businesses.state,
        businesses.business_type,
        categories.category_name
    FROM businesses
    INNER JOIN business_categories
        ON businesses.id = business_categories.business_id
    INNER JOIN categories
        ON categories.id = business_categories.category_id
    WHERE businesses.active = 1
      AND categories.active = 1
      AND categories.slug = :category_slug
    ORDER BY businesses.business_name
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    'category_slug' => $categorySlug
]);

$businesses = $stmt->fetchAll();

$categoryName = $businesses[0]['category_name'] ?? 'Category';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($categoryName) ?> | Braggins</title>
</head>
<body>

    <h1><?= htmlspecialchars($categoryName) ?></h1>

    <?php if (!$businesses): ?>

        <p>No businesses found.</p>

    <?php else: ?>

        <?php foreach ($businesses as $business): ?>

            <article>
                <h2>
                    <?= htmlspecialchars($business['business_name']) ?>
                </h2>

                <p>
                    <?= htmlspecialchars($business['city']) ?>,
                    <?= htmlspecialchars($business['state']) ?>
                </p>

                <p>
                    Type:
                    <?= htmlspecialchars($business['business_type']) ?>
                </p>
            </article>

        <?php endforeach; ?>

    <?php endif; ?>

</body>
</html>