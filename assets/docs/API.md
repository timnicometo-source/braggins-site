# SBR Group Members API

A read-only JSON API for membership data: memberships with their owner, company and representatives
(including photos and logos), and the business category list used in the membership forms.

- **Base URL:** `https://members.joinsbrgroup.com/api/v1`
- **Format:** JSON (UTF-8). All endpoints are `GET`.
- **Authentication:** an API key, which you get from the SBR Group administrator.

The data includes names, emails and phone numbers of members. Treat the key and the data as
confidential: keep the key out of source control and client-side code, and call the API from a
server.

---

## Authentication

Send your key on every request in one of these headers:

```
Authorization: Bearer sbr_your_key_here
```
or
```
X-Api-Key: sbr_your_key_here
```

A missing, unknown or revoked key returns `401 Unauthorized`:

```json
{ "error": "Unauthorized" }
```

Keys can be revoked at any time by the administrator. If yours stops working, ask for a new one.

## Rate limit

120 requests per minute per IP address. Beyond that you get `429 Too Many Requests`
(`{ "error": "Rate limit exceeded" }`). Wait a minute and retry. For bulk reads, page through
`/memberships` once rather than requesting each membership individually.

## Errors

| Status | Meaning | Body |
|--------|---------|------|
| 400 | Bad parameter (`page` is not a positive integer, or `updated_since` is not a valid date) | `{ "error": "Invalid page" }` / `{ "error": "Invalid updated_since" }` |
| 401 | Missing, unknown or revoked key | `{ "error": "Unauthorized" }` |
| 404 | Membership id does not exist | `{ "error": "Not found" }` |
| 429 | Rate limit exceeded | `{ "error": "Rate limit exceeded" }` |

---

## Endpoints

### `GET /memberships`

Returns memberships ordered by id, 100 per page.

**Query parameters (all optional)**

| Parameter | Description |
|-----------|-------------|
| `page` | Page number, starting at 1 (default 1). |
| `status` | Only memberships with this status (see [values](#membership-values)). |
| `chapter_id` | Only memberships in this chapter. |
| `updated_since` | ISO 8601 date or time (e.g. `2026-10-01` or `2026-10-01T12:00:00Z`). Only memberships changed at or after this moment. |

**Response**

```json
{
  "memberships": [ { "...": "see Membership object" } ],
  "meta": { "page": 1, "per_page": 100, "total_pages": 7, "total_count": 642 }
}
```

An empty result is `"memberships": []` with `total_count` 0 (not an error). Asking for a page past
the end also returns an empty list.

### `GET /memberships/:id`

Returns one membership: `{ "membership": { ... } }`. `404` if the id doesn't exist.

### `GET /categories`

Returns the business categories in the same order as the dropdowns on the membership forms:
top-level categories alphabetically by name, each with its sub-categories alphabetically by name.
Deleted categories are not included.

```json
{
  "categories": [
    {
      "id": 12,
      "name": "Automotive",
      "description": "Cars and trucks",
      "non_profit": false,
      "sub_categories": [
        { "id": 40, "name": "Repair", "description": null, "non_profit": false }
      ]
    }
  ]
}
```

A membership's `business_category_id` matches a top-level category `id`, and
`business_sub_category_id` matches an `id` inside that category's `sub_categories` (or is `null`).

---

## Objects

### Membership

```json
{
  "id": 87,
  "status": "active",
  "membership_type": "standard",
  "chapter_id": 3,
  "business_category_id": 12,
  "business_sub_category_id": 40,
  "remaining_months": 5,
  "join_date": "2026-03-01",
  "current_start_date": "2026-03-01",
  "pause_date": null,
  "pause_date_stop": null,
  "cancel_date": null,
  "created_at": "2026-03-01T15:04:05.000Z",
  "updated_at": "2026-10-02T09:30:11.000Z",
  "owner_type": "User",
  "owner": { "...": "User object, or Company object when owner_type is Company" },
  "company": { "...": "Company object, or null if the company was removed" },
  "representatives": [ { "...": "User object" } ]
}
```

- `owner_type` is `"User"` or `"Company"`, and `owner` has that object's shape.
- `representatives` are the people on the membership (the owner is usually one of them).
- Dates (`join_date` etc.) are `YYYY-MM-DD`; timestamps (`created_at`, `updated_at`) are ISO 8601 UTC.
- `remaining_months` counts down monthly; `0` is the last month of service and `-1` means the
  membership has expired. It can be `null`.

### User

```json
{
  "id": 301,
  "first_name": "Ann",
  "last_name": "Owner",
  "email": "ann@example.com",
  "email_alternate": null,
  "phone_number": "612-555-0101",
  "permission_level": "member",
  "status": "active",
  "tumbler": true,
  "nt_popl": false,
  "card_holder": false,
  "name_tag": false,
  "profile_image_url": "https://members.joinsbrgroup.com/rails/active_storage/blobs/redirect/.../ann.png"
}
```

`tumbler`, `nt_popl`, `card_holder` and `name_tag` are booleans tracking which welcome items the
member has received. `profile_image_url` is `null` when there is no photo.

### Company

```json
{
  "id": 55,
  "company_name": "Acme Plumbing",
  "owner_name": "Ann Owner",
  "address": "100 Pipe Ave",
  "city": "Minneapolis",
  "state": "MN",
  "zip_code": "55402",
  "country": "US",
  "business_email": "info@acme.test",
  "business_phone": "612-555-1000",
  "website": "https://acme.test",
  "description": "Plumbing for everyone.",
  "logo_url": "https://members.joinsbrgroup.com/rails/active_storage/blobs/redirect/.../logo.png"
}
```

`logo_url` is `null` when there is no logo. Any other field can be `null` if it was never filled in.

### Photos and logos

`profile_image_url` and `logo_url` are absolute links you can use directly in an `<img>` tag or
download. The links are signed and hard to guess, so they work **without** the API key. Anyone who
has a link can open that image, so don't publish them. Always read the URL fresh from the API
rather than storing it long-term; link formats can change.

### Membership values

Values you will see in the data (the set may grow, so don't treat these as exhaustive):

| Field | Values |
|-------|--------|
| `status` | `active`, `host-hold`, `pending`, `paused`, `paid-waiting`, `cancelled` |
| `membership_type` | `front_office`, `charter`, `standard`, `charter_non_profit`, `standard_non_profit` |
| `permission_level` | `member`, `host`, `regional_trainer`, `front_office`, `super_admin` |

`front_office` memberships are the staff membership that office users sign in through, not
paying chapter members. You will usually want to exclude them.

---

## Examples

### curl

```bash
export SBR_API_KEY="sbr_your_key_here"
BASE="https://members.joinsbrgroup.com/api/v1"

# Categories in dropdown order
curl -s -H "Authorization: Bearer $SBR_API_KEY" "$BASE/categories"

# Active memberships in one chapter, first page
curl -s -H "Authorization: Bearer $SBR_API_KEY" "$BASE/memberships?status=active&chapter_id=3"

# One membership
curl -s -H "X-Api-Key: $SBR_API_KEY" "$BASE/memberships/87"

# Everything changed since a date
curl -s -H "Authorization: Bearer $SBR_API_KEY" "$BASE/memberships?updated_since=2026-10-01T00:00:00Z"
```

### Ruby: read every page

```ruby
require "net/http"
require "json"

BASE = "https://members.joinsbrgroup.com/api/v1"
KEY  = ENV.fetch("SBR_API_KEY")

def get(path, params = {})
  uri = URI("#{BASE}#{path}")
  uri.query = URI.encode_www_form(params) unless params.empty?
  request = Net::HTTP::Get.new(uri, "Authorization" => "Bearer #{KEY}")
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
  raise "API error #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)
  JSON.parse(response.body)
end

memberships = []
page = 1
loop do
  body = get("/memberships", status: "active", page: page)
  memberships.concat(body["memberships"])
  break if page >= body["meta"]["total_pages"]
  page += 1
end
puts "#{memberships.length} active memberships"
```

### Python: read every page

```python
import os, requests

BASE = "https://members.joinsbrgroup.com/api/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['SBR_API_KEY']}"}

memberships, page = [], 1
while True:
    r = requests.get(f"{BASE}/memberships", headers=HEADERS,
                     params={"status": "active", "page": page}, timeout=30)
    r.raise_for_status()
    body = r.json()
    memberships += body["memberships"]
    if page >= body["meta"]["total_pages"]:
        break
    page += 1
print(len(memberships), "active memberships")
```

### JavaScript (Node 18+): one membership

```js
const BASE = "https://members.joinsbrgroup.com/api/v1";

const res = await fetch(`${BASE}/memberships/87`, {
  headers: { Authorization: `Bearer ${process.env.SBR_API_KEY}` },
});
if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
const { membership } = await res.json();
console.log(membership.company?.company_name, membership.representatives.length);
```

---

## Tips

- **Keeping a copy in sync:** do one full read, remember the time you started it, and on later runs
  request `?updated_since=<that time>`. The API doesn't report deletions, so do an occasional full
  read to catch memberships that were removed.
- **Joining categories:** fetch `/categories` once and look up `business_category_id` /
  `business_sub_category_id` locally instead of calling the API per membership.
- **Be careful with nulls:** most fields can be `null`; `company` can be `null`; `representatives`
  can be empty.
- **Timeouts and retries:** set a client timeout (30s is plenty). On `429` or a `5xx`, wait and retry
  with a backoff rather than retrying immediately.

## Support

Questions, a lost or leaked key, or a request for additional fields: contact the SBR Group
administrator. If a key may have been exposed, tell them right away so it can be revoked.
