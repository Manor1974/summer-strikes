<?php
// =====================================================================
// /lm/summer-strikes-receiver.php
// =====================================================================
// Accepts JSON POSTs from the Summer Strikes app (summer.manorlanes.com)
// containing newly-registered bowlers. Writes them to
// /lm/data/summer-strikes-pending.json so FRONTDESK1's poller can pick them
// up and create Conqueror FBT records.
//
// Same shared-secret pattern as lane-availability-receiver.php and
// conqueror-receiver.php — the Summer Strikes app sends the password via
// the FBT_RECEIVER_PASSWORD env var; this script checks it matches
// SS_API_PASSWORD below.
//
// Expected POST body:
// {
//   "password": "...",
//   "bowlers": [
//     {
//       "bowler_id": "1000",                  // 4-digit zero-padded
//       "first_name": "Emma",
//       "last_name": "Russo",
//       "nickname": "Emma",                   // what overhead shows
//       "age": 8,
//       "kind": "child",                      // "child" or "adult"
//       "is_active": "Yes",
//       "registration_date": "2026-05-28",
//       "notes": "Summer Strikes 2026 kid (age 8)"
//     }
//   ]
// }
//
// On success:
//   - Merges into /lm/data/summer-strikes-pending.json keyed by bowler_id
//   - Pending entries already in the file are updated (idempotent) so the
//     Summer Strikes app can safely re-send.
//   - Returns { "ok": true, "queued": N, "total_pending": M }
//
// Idempotency: keyed by bowler_id. Resending the same bowler is a no-op
// after the FBT poller has picked them up (it moves processed entries to
// /lm/data/summer-strikes-processed.json — see PowerShell script).
// =====================================================================

define('SS_API_PASSWORD', 'Manor1974LaneZ');                       // matches FBT_RECEIVER_PASSWORD on Vercel
define('PENDING_FILE',   __DIR__ . '/data/summer-strikes-pending.json');
define('PROCESSED_FILE', __DIR__ . '/data/summer-strikes-processed.json');

// Surface fatal errors as JSON for easier debugging from the app side
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode([
            'error'   => 'PHP fatal',
            'message' => $err['message'],
            'file'    => basename($err['file']),
            'line'    => $err['line'],
        ]);
    }
});

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

$raw = file_get_contents('php://input');
// Strip UTF-8 BOM if a client added one
if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);

$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid JSON']);
    exit;
}

if (($body['password'] ?? '') !== SS_API_PASSWORD) {
    http_response_code(401);
    echo json_encode(['error' => 'auth']);
    exit;
}

$bowlers = $body['bowlers'] ?? null;
if (!is_array($bowlers) || count($bowlers) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'missing bowlers array']);
    exit;
}

// Validate + normalize each bowler
$normalized = [];
foreach ($bowlers as $b) {
    if (
        empty($b['bowler_id']) ||
        empty($b['first_name']) ||
        !isset($b['kind']) ||
        !in_array($b['kind'], ['child', 'adult'], true)
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'each bowler needs bowler_id, first_name, kind=child|adult']);
        exit;
    }
    $normalized[] = [
        'bowler_id'         => (string)$b['bowler_id'],
        'first_name'        => trim((string)$b['first_name']),
        'last_name'         => trim((string)($b['last_name'] ?? '')),
        'nickname'          => trim((string)($b['nickname'] ?? $b['first_name'])),
        'age'               => (int)($b['age'] ?? 0),
        'kind'              => (string)$b['kind'],
        'is_active'         => (string)($b['is_active'] ?? 'Yes'),
        'registration_date' => (string)($b['registration_date'] ?? date('Y-m-d')),
        'notes'             => (string)($b['notes'] ?? ''),
        'queued_at'         => gmdate('c'),
    ];
}

@mkdir(dirname(PENDING_FILE), 0775, true);

// Merge into existing pending (keyed by bowler_id so re-POSTs overwrite)
$existing = [];
if (file_exists(PENDING_FILE)) {
    $existing = json_decode(file_get_contents(PENDING_FILE), true) ?: [];
}
$byId = [];
foreach ($existing as $b) {
    if (!empty($b['bowler_id'])) $byId[(string)$b['bowler_id']] = $b;
}
foreach ($normalized as $b) {
    $byId[$b['bowler_id']] = $b;
}

$out = array_values($byId);
// Sort by bowler_id for human-friendly viewing
usort($out, function ($a, $b) {
    return ((int)$a['bowler_id']) <=> ((int)$b['bowler_id']);
});

$tmp = PENDING_FILE . '.tmp.' . uniqid();
file_put_contents($tmp, json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
rename($tmp, PENDING_FILE);

echo json_encode([
    'ok'             => true,
    'queued'         => count($normalized),
    'total_pending'  => count($out),
    'written'        => basename(PENDING_FILE),
]);
