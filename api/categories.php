<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/db-config.php';

header('Content-Type: application/json; charset=utf-8');

try {

    /*
    |--------------------------------------------------------------------------
    | Return only categories that currently have active businesses
    |--------------------------------------------------------------------------
    */

    $sql = "
        SELECT
            c.id,
            c.category_name,
            c.slug,
            c.parent_id,

            p.id AS parent_id_lookup,
            p.category_name AS parent_name,
            p.slug AS parent_slug,

            COUNT(DISTINCT bc.business_id) AS business_count

        FROM categories c

        INNER JOIN business_categories bc
            ON bc.category_id = c.id

        INNER JOIN businesses b
            ON b.id = bc.business_id
            AND b.active = 1

        LEFT JOIN categories p
            ON p.id = c.parent_id

        WHERE c.active = 1

        GROUP BY
            c.id,
            c.category_name,
            c.slug,
            c.parent_id,
            p.id,
            p.category_name,
            p.slug

        ORDER BY
            COALESCE(p.category_name, c.category_name),
            CASE
                WHEN c.parent_id IS NULL THEN 0
                ELSE 1
            END,
            c.category_name
    ";

    $stmt = $pdo->query($sql);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $groups = [];

    foreach ($rows as $row) {

        $isTopLevel =
            $row['parent_id'] === null;

        if ($isTopLevel) {

            $groupName =
                $row['category_name'];

            $groupSlug =
                $row['slug'];

        } else {

            $groupName =
                $row['parent_name'];

            $groupSlug =
                $row['parent_slug'];
        }

        if (!isset($groups[$groupName])) {

            $groups[$groupName] = [
                'group' => $groupName,
                'group_slug' => $groupSlug,
                'categories' => []
            ];
        }

        $groups[$groupName]['categories'][] = [
            'id' => (int) $row['id'],
            'name' => $row['category_name'],
            'slug' => $row['slug'],
            'business_count' =>
                (int) $row['business_count'],
            'is_top_level' =>
                $isTopLevel
        ];
    }

    $result =
        array_values($groups);

    echo json_encode(
        [
            'success' => true,
            'group_count' => count($result),
            'groups' => $result
        ],
        JSON_PRETTY_PRINT
        | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'error' => 'Unable to load categories.'
        ],
        JSON_PRETTY_PRINT
    );
}