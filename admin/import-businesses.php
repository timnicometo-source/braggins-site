<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Braggins Temporary Business CSV Importer
|--------------------------------------------------------------------------
|
| Expected CSV columns:
|
| business_name
| description
| contact_name
| email
| phone
| website
| address
| city
| state
| zip
| business_type
| categories
| service_cities
| active
|
| Multiple categories and service cities should be separated with ;
|
| IMPORTANT:
| This is a temporary administrative import tool.
| Remove it from the live site when the production import is complete.
|
*/

require_once dirname(__DIR__, 2) . '/db-config.php';


/*
|--------------------------------------------------------------------------
| Helper functions
|--------------------------------------------------------------------------
*/

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}


function create_slug(string $value): string
{
    $value = trim($value);

    if ($value === '') {
        return '';
    }

    $value = strtolower($value);

    $value = preg_replace('/[^a-z0-9]+/', '-', $value);

    $value = trim((string) $value, '-');

    return $value;
}


function split_semicolon_list(string $value): array
{
    if (trim($value) === '') {
        return [];
    }

    $items = array_map('trim', explode(';', $value));

    $items = array_filter(
        $items,
        static fn(string $item): bool => $item !== ''
    );

    return array_values(array_unique($items));
}


function normalize_business_type(string $value): string
{
    $value = strtolower(trim($value));

    $allowed = [
        'residential',
        'commercial',
        'both'
    ];

    if (!in_array($value, $allowed, true)) {
        return 'both';
    }

    return $value;
}


function normalize_active(string $value): int
{
    $value = strtolower(trim($value));

    if (
        $value === '0' ||
        $value === 'false' ||
        $value === 'no' ||
        $value === 'inactive'
    ) {
        return 0;
    }

    return 1;
}


/*
|--------------------------------------------------------------------------
| Required CSV headers
|--------------------------------------------------------------------------
*/

$requiredHeaders = [
    'business_name',
    'description',
    'contact_name',
    'email',
    'phone',
    'website',
    'address',
    'city',
    'state',
    'zip',
    'business_type',
    'categories',
    'service_cities',
    'active'
];


/*
|--------------------------------------------------------------------------
| Page state
|--------------------------------------------------------------------------
*/

$messages = [];
$errors = [];
$importSummary = [];

$totalRows = 0;
$successfulRows = 0;
$failedRows = 0;
$newBusinesses = 0;
$updatedBusinesses = 0;
$newCategories = 0;


/*
|--------------------------------------------------------------------------
| Handle uploaded CSV
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (
        !isset($_FILES['csv_file']) ||
        $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK
    ) {
        $errors[] = 'Please choose a valid CSV file.';
    } else {

        $uploadedFile = $_FILES['csv_file']['tmp_name'];

        if (!is_uploaded_file($uploadedFile)) {
            $errors[] = 'The uploaded file could not be verified.';
        } else {

            $handle = fopen($uploadedFile, 'r');

            if ($handle === false) {
                $errors[] = 'Unable to open the uploaded CSV file.';
            } else {

                /*
                |--------------------------------------------------------------------------
                | Read CSV header row
                |--------------------------------------------------------------------------
                */

                $headers = fgetcsv($handle);

                if ($headers === false) {
                    $errors[] = 'The CSV file appears to be empty.';
                } else {

                    /*
                     * Remove UTF-8 BOM from first column if Excel added one.
                     */
                    $headers[0] = preg_replace(
                        '/^\xEF\xBB\xBF/',
                        '',
                        (string) $headers[0]
                    );

                    $headers = array_map(
                        static fn($header): string =>
                            strtolower(trim((string) $header)),
                        $headers
                    );


                    /*
                    |--------------------------------------------------------------------------
                    | Validate required headers
                    |--------------------------------------------------------------------------
                    */

                    $missingHeaders = array_diff(
                        $requiredHeaders,
                        $headers
                    );

                    if ($missingHeaders) {

                        $errors[] =
                            'Missing required CSV columns: ' .
                            implode(', ', $missingHeaders);

                    } else {

                        /*
                        |--------------------------------------------------------------------------
                        | Prepared statements
                        |--------------------------------------------------------------------------
                        */

                        $findBusiness = $pdo->prepare("
                            SELECT id
                            FROM businesses
                            WHERE slug = :slug
                            LIMIT 1
                        ");


                        $insertBusiness = $pdo->prepare("
                            INSERT INTO businesses (
                                business_name,
                                slug,
                                description,
                                contact_name,
                                email,
                                phone,
                                website,
                                address,
                                city,
                                state,
                                zip,
                                business_type,
                                active
                            )
                            VALUES (
                                :business_name,
                                :slug,
                                :description,
                                :contact_name,
                                :email,
                                :phone,
                                :website,
                                :address,
                                :city,
                                :state,
                                :zip,
                                :business_type,
                                :active
                            )
                        ");


                        $updateBusiness = $pdo->prepare("
                            UPDATE businesses
                            SET
                                business_name = :business_name,
                                description = :description,
                                contact_name = :contact_name,
                                email = :email,
                                phone = :phone,
                                website = :website,
                                address = :address,
                                city = :city,
                                state = :state,
                                zip = :zip,
                                business_type = :business_type,
                                active = :active
                            WHERE id = :id
                        ");


                        $findCategory = $pdo->prepare("
                            SELECT id
                            FROM categories
                            WHERE slug = :slug
                            LIMIT 1
                        ");


                        $insertCategory = $pdo->prepare("
                            INSERT INTO categories (
                                category_name,
                                slug,
                                active
                            )
                            VALUES (
                                :category_name,
                                :slug,
                                1
                            )
                        ");


                        $deleteBusinessCategories = $pdo->prepare("
                            DELETE FROM business_categories
                            WHERE business_id = :business_id
                        ");


                        $insertBusinessCategory = $pdo->prepare("
                            INSERT IGNORE INTO business_categories (
                                business_id,
                                category_id
                            )
                            VALUES (
                                :business_id,
                                :category_id
                            )
                        ");


                        $deleteServiceAreas = $pdo->prepare("
                            DELETE FROM business_service_areas
                            WHERE business_id = :business_id
                        ");


                        $insertServiceArea = $pdo->prepare("
                            INSERT IGNORE INTO business_service_areas (
                                business_id,
                                city,
                                state
                            )
                            VALUES (
                                :business_id,
                                :city,
                                :state
                            )
                        ");


                        /*
                        |--------------------------------------------------------------------------
                        | Process each CSV row
                        |--------------------------------------------------------------------------
                        */

                        $rowNumber = 1;

                        while (($row = fgetcsv($handle)) !== false) {

                            $rowNumber++;

                            /*
                             * Ignore completely empty rows.
                             */
                            if (
                                count(
                                    array_filter(
                                        $row,
                                        static fn($value): bool =>
                                            trim((string) $value) !== ''
                                    )
                                ) === 0
                            ) {
                                continue;
                            }

                            $totalRows++;


                            /*
                             * Pad short rows so array_combine does not fail.
                             */
                            if (count($row) < count($headers)) {
                                $row = array_pad(
                                    $row,
                                    count($headers),
                                    ''
                                );
                            }


                            /*
                             * Ignore any unexpected extra columns.
                             */
                            if (count($row) > count($headers)) {
                                $row = array_slice(
                                    $row,
                                    0,
                                    count($headers)
                                );
                            }


                            $data = array_combine(
                                $headers,
                                $row
                            );


                            if ($data === false) {

                                $failedRows++;

                                $importSummary[] = [
                                    'row' => $rowNumber,
                                    'business' => '',
                                    'status' => 'Failed',
                                    'message' => 'CSV columns could not be read.'
                                ];

                                continue;
                            }


                            /*
                            |--------------------------------------------------------------------------
                            | Normalize row
                            |--------------------------------------------------------------------------
                            */

                            $businessName =
                                trim((string) $data['business_name']);

                            $slug =
                                create_slug($businessName);

                            $state =
                                strtoupper(
                                    trim((string) $data['state'])
                                );

                            if ($state === '') {
                                $state = 'MN';
                            }

                            $businessType =
                                normalize_business_type(
                                    (string) $data['business_type']
                                );

                            $active =
                                normalize_active(
                                    (string) $data['active']
                                );

                            $categories =
                                split_semicolon_list(
                                    (string) $data['categories']
                                );

                            $serviceCities =
                                split_semicolon_list(
                                    (string) $data['service_cities']
                                );


                            /*
                            |--------------------------------------------------------------------------
                            | Validate row
                            |--------------------------------------------------------------------------
                            */

                            if ($businessName === '') {

                                $failedRows++;

                                $importSummary[] = [
                                    'row' => $rowNumber,
                                    'business' => '',
                                    'status' => 'Failed',
                                    'message' => 'Business name is required.'
                                ];

                                continue;
                            }


                            if ($slug === '') {

                                $failedRows++;

                                $importSummary[] = [
                                    'row' => $rowNumber,
                                    'business' => $businessName,
                                    'status' => 'Failed',
                                    'message' => 'Unable to generate business slug.'
                                ];

                                continue;
                            }


                            /*
                            |--------------------------------------------------------------------------
                            | Import row transaction
                            |--------------------------------------------------------------------------
                            */

                            try {

                                $pdo->beginTransaction();


                                /*
                                |--------------------------------------------------------------------------
                                | Find or create business
                                |--------------------------------------------------------------------------
                                */

                                $findBusiness->execute([
                                    'slug' => $slug
                                ]);

                                $existingBusiness =
                                    $findBusiness->fetch();


                                $businessValues = [
                                    'business_name' =>
                                        $businessName,

                                    'description' =>
                                        trim((string) $data['description']),

                                    'contact_name' =>
                                        trim((string) $data['contact_name']),

                                    'email' =>
                                        trim((string) $data['email']),

                                    'phone' =>
                                        trim((string) $data['phone']),

                                    'website' =>
                                        trim((string) $data['website']),

                                    'address' =>
                                        trim((string) $data['address']),

                                    'city' =>
                                        trim((string) $data['city']),

                                    'state' =>
                                        $state,

                                    'zip' =>
                                        trim((string) $data['zip']),

                                    'business_type' =>
                                        $businessType,

                                    'active' =>
                                        $active
                                ];


                                if ($existingBusiness) {

                                    $businessId =
                                        (int) $existingBusiness['id'];

                                    $updateBusiness->execute(
                                        $businessValues + [
                                            'id' => $businessId
                                        ]
                                    );

                                    $updatedBusinesses++;

                                    $businessAction =
                                        'Updated';

                                } else {

                                    $insertBusiness->execute(
                                        $businessValues + [
                                            'slug' => $slug
                                        ]
                                    );

                                    $businessId =
                                        (int) $pdo->lastInsertId();

                                    $newBusinesses++;

                                    $businessAction =
                                        'Added';
                                }


                                /*
                                |--------------------------------------------------------------------------
                                | Replace business category relationships
                                |--------------------------------------------------------------------------
                                */

                                $deleteBusinessCategories->execute([
                                    'business_id' =>
                                        $businessId
                                ]);


                                foreach ($categories as $categoryName) {

                                    $categorySlug =
                                        create_slug($categoryName);

                                    if ($categorySlug === '') {
                                        continue;
                                    }


                                    $findCategory->execute([
                                        'slug' =>
                                            $categorySlug
                                    ]);

                                    $category =
                                        $findCategory->fetch();


                                    if ($category) {

                                        $categoryId =
                                            (int) $category['id'];

                                    } else {

                                        $insertCategory->execute([
                                            'category_name' =>
                                                $categoryName,

                                            'slug' =>
                                                $categorySlug
                                        ]);

                                        $categoryId =
                                            (int) $pdo->lastInsertId();

                                        $newCategories++;
                                    }


                                    $insertBusinessCategory->execute([
                                        'business_id' =>
                                            $businessId,

                                        'category_id' =>
                                            $categoryId
                                    ]);
                                }


                                /*
                                |--------------------------------------------------------------------------
                                | Replace service areas
                                |--------------------------------------------------------------------------
                                */

                                $deleteServiceAreas->execute([
                                    'business_id' =>
                                        $businessId
                                ]);


                                foreach ($serviceCities as $serviceCity) {

                                    $insertServiceArea->execute([
                                        'business_id' =>
                                            $businessId,

                                        'city' =>
                                            $serviceCity,

                                        'state' =>
                                            $state
                                    ]);
                                }


                                /*
                                |--------------------------------------------------------------------------
                                | Commit row
                                |--------------------------------------------------------------------------
                                */

                                $pdo->commit();

                                $successfulRows++;

                                $importSummary[] = [
                                    'row' =>
                                        $rowNumber,

                                    'business' =>
                                        $businessName,

                                    'status' =>
                                        'Success',

                                    'message' =>
                                        $businessAction
                                ];


                            } catch (Throwable $e) {

                                if ($pdo->inTransaction()) {
                                    $pdo->rollBack();
                                }

                                $failedRows++;

                                $importSummary[] = [
                                    'row' =>
                                        $rowNumber,

                                    'business' =>
                                        $businessName,

                                    'status' =>
                                        'Failed',

                                    'message' =>
                                        $e->getMessage()
                                ];
                            }
                        }


                        $messages[] =
                            'Import completed.';
                    }
                }

                fclose($handle);
            }
        }
    }
}

?>
<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Braggins Business Import
    </title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 40px 20px;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background:
                #f5f7fa;

            color:
                #18202f;
        }

        .container {
            width: min(1100px, 100%);

            margin: 0 auto;
        }

        .panel {
            background: white;

            border:
                1px solid #dce2ea;

            border-radius: 18px;

            padding: 28px;

            margin-bottom: 24px;

            box-shadow:
                0 10px 30px rgba(0, 0, 0, 0.06);
        }

        h1,
        h2 {
            margin-top: 0;
        }

        h1 {
            font-size: 2rem;
        }

        p {
            line-height: 1.6;
        }

        .notice {
            background:
                #ecfdf5;

            border:
                1px solid #a7f3d0;

            color:
                #065f46;

            padding: 14px 16px;

            border-radius: 10px;

            margin-bottom: 14px;
        }

        .error {
            background:
                #fef2f2;

            border:
                1px solid #fecaca;

            color:
                #991b1b;

            padding: 14px 16px;

            border-radius: 10px;

            margin-bottom: 14px;
        }

        .warning {
            background:
                #fff7ed;

            border:
                1px solid #fed7aa;

            color:
                #9a3412;

            padding: 14px 16px;

            border-radius: 10px;

            margin-bottom: 18px;
        }

        input[type="file"] {
            display: block;

            width: 100%;

            margin:
                18px 0;

            padding: 14px;

            border:
                1px solid #cbd5e1;

            border-radius: 10px;

            background:
                #f8fafc;
        }

        button {
            border: 0;

            border-radius: 10px;

            padding:
                13px 22px;

            background:
                #0f766e;

            color: white;

            font-size: 1rem;

            font-weight: 700;

            cursor: pointer;
        }

        button:hover {
            background:
                #0b5f59;
        }

        .summary-grid {
            display: grid;

            grid-template-columns:
                repeat(5, 1fr);

            gap: 12px;

            margin-top: 20px;
        }

        .summary-card {
            padding: 18px;

            border-radius: 12px;

            background:
                #f8fafc;

            border:
                1px solid #e2e8f0;
        }

        .summary-card strong {
            display: block;

            font-size:
                1.7rem;

            margin-top: 6px;
        }

        table {
            width: 100%;

            border-collapse:
                collapse;

            margin-top: 20px;
        }

        th,
        td {
            padding:
                10px 12px;

            border-bottom:
                1px solid #e2e8f0;

            text-align: left;

            vertical-align: top;
        }

        th {
            background:
                #f8fafc;
        }

        .status-success {
            color:
                #047857;

            font-weight: 700;
        }

        .status-failed {
            color:
                #b91c1c;

            font-weight: 700;
        }

        code {
            padding:
                2px 6px;

            border-radius: 5px;

            background:
                #eef2f7;
        }

        @media (max-width: 760px) {

            .summary-grid {
                grid-template-columns:
                    1fr 1fr;
            }

            table {
                display: block;

                overflow-x: auto;
            }
        }

    </style>

</head>


<body>

<div class="container">


    <div class="panel">

        <h1>
            Braggins Business CSV Import
        </h1>

        <p>
            Upload a CSV exported from the Braggins business spreadsheet.
            Businesses, categories, category relationships, and service
            areas will be created automatically.
        </p>

        <div class="warning">
            <strong>Temporary administrative tool:</strong>
            remove this file from the live website when the import process
            is complete.
        </div>


        <?php foreach ($messages as $message): ?>

            <div class="notice">
                <?= escape($message) ?>
            </div>

        <?php endforeach; ?>


        <?php foreach ($errors as $error): ?>

            <div class="error">
                <?= escape($error) ?>
            </div>

        <?php endforeach; ?>


        <form
            method="post"
            enctype="multipart/form-data"
        >

            <label for="csv_file">
                <strong>
                    Select CSV file
                </strong>
            </label>

            <input
                id="csv_file"
                name="csv_file"
                type="file"
                accept=".csv,text/csv"
                required
            >

            <button type="submit">
                Import Businesses
            </button>

        </form>

    </div>


    <?php if ($totalRows > 0): ?>

        <div class="panel">

            <h2>
                Import Summary
            </h2>


            <div class="summary-grid">

                <div class="summary-card">
                    Rows processed
                    <strong>
                        <?= $totalRows ?>
                    </strong>
                </div>

                <div class="summary-card">
                    Successful
                    <strong>
                        <?= $successfulRows ?>
                    </strong>
                </div>

                <div class="summary-card">
                    Failed
                    <strong>
                        <?= $failedRows ?>
                    </strong>
                </div>

                <div class="summary-card">
                    New businesses
                    <strong>
                        <?= $newBusinesses ?>
                    </strong>
                </div>

                <div class="summary-card">
                    Updated businesses
                    <strong>
                        <?= $updatedBusinesses ?>
                    </strong>
                </div>

            </div>


            <?php if ($newCategories > 0): ?>

                <p>
                    <strong>
                        New categories created:
                    </strong>

                    <?= $newCategories ?>
                </p>

            <?php endif; ?>


            <table>

                <thead>

                    <tr>
                        <th>CSV Row</th>
                        <th>Business</th>
                        <th>Status</th>
                        <th>Result</th>
                    </tr>

                </thead>


                <tbody>

                <?php foreach ($importSummary as $result): ?>

                    <tr>

                        <td>
                            <?= escape((string) $result['row']) ?>
                        </td>

                        <td>
                            <?= escape($result['business']) ?>
                        </td>

                        <td
                            class="<?= $result['status'] === 'Success'
                                ? 'status-success'
                                : 'status-failed'
                            ?>"
                        >
                            <?= escape($result['status']) ?>
                        </td>

                        <td>
                            <?= escape($result['message']) ?>
                        </td>

                    </tr>

                <?php endforeach; ?>

                </tbody>

            </table>

        </div>

    <?php endif; ?>


    <div class="panel">

        <h2>
            Expected CSV format
        </h2>

        <p>
            The CSV must contain these columns:
        </p>

        <p>
            <code>business_name</code>,
            <code>description</code>,
            <code>contact_name</code>,
            <code>email</code>,
            <code>phone</code>,
            <code>website</code>,
            <code>address</code>,
            <code>city</code>,
            <code>state</code>,
            <code>zip</code>,
            <code>business_type</code>,
            <code>categories</code>,
            <code>service_cities</code>,
            <code>active</code>
        </p>

        <p>
            Multiple categories and service cities should be separated
            with semicolons.
        </p>

        <p>
            Example:
        </p>

        <p>
            <code>
                Plumbing; Drain Cleaning
            </code>
        </p>

        <p>
            <code>
                Rochester; Byron; Stewartville
            </code>
        </p>

    </div>

</div>

</body>

</html>