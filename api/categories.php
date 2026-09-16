<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/db-config.php';

$sql = "
    SELECT
        id,
        category_name,
        slug
    FROM categories
    WHERE active = 1
    ORDER BY category_name
";

$stmt = $pdo->query($sql);
$categories = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'count' => count($categories),
    'categories' => $categories
], JSON_PRETTY_PRINT);