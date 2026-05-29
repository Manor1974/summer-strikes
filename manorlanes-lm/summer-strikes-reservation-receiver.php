<?php
// =====================================================================
// /lm/summer-strikes-reservation-receiver.php
// =====================================================================
// Accepts JSON POSTs from the Summer Strikes app when an admin confirms
// a lane reservation. Writes them to
// /lm/data/summer-strikes-reservations-pending.json so a FRONTDESK1
// PowerShell script can pick them up and write them into Conqueror's
// RsrvHdr/RsrvBody tables.
//
// Shared-secret authenticated; same password pattern as the other
// receivers (lane-availability-receiver, conqueror-receiver,
// summer-strikes-receiver).
//
// Expected POST body:
// {
//   "password": "...",
//   "reservation": {
//     "id":              "<our reservation cuid>",
//     "reservation_date":"2026-06-15",   // YYYY-MM-DD
//     "start_time":      "18:00",        // HH:MM 24h ET
//     "lane_number":     14,             // 1-24
//     "party_size":      6,
//     "family_code":     "5252FH",
//     "first_name":      "Brian",
//     "last_name":       "Russo",
//     "email":           "...",
//     "phone":           "+17165550101",
//     "notes":           "bumpers for the 4yo"
//   }
// }
//
// Returns:
//   200 { "ok": true, "queued": "<id>", "total_pending": N }
//   401 / 400 / 500 otherwise.
//
// Idempotency: keyed by reservation id. Re-POSTs overwrite — safe when
// the Summer Strikes app retries an unconfirmed request.
// =====================================================================

define('SS_RSRV_API_PASSWORD', 'Manor1974LaneZ');
define('PENDING_FILE',   __DIR__ . '/data/summer-strikes-reservations-pending.json');
define('PROCESSED_FILE', __DIR__ . '/data/summer-strikes-reservations-processed.json');

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
if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);

$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid JSON']);
    exit;
}

if (($body['password'] ?? '') !== SS_RSRV_API_PASSWORD) {
    http_response_code(401);
    echo json_encode(['error' => 'auth']);
    exit;
}

$r = $body['reservation'] ?? null;
if (!is_array($r)) {
    http_response_code(400);
    echo json_encode(['error' => 'missing reservation object']);
    exit;
}

$required = ['id', 'reservation_date', 'start_time', 'lane_number', 'party_size', 'first_name'];
foreach ($required as $key) {
    if (!isset($r[$key]) || $r[$key] === '' || $r[$key] === null) {
        http_response_code(400);
        echo json_encode(['error' => "missing required field: $key"]);
        exit;
    }
}

// Normalize + clamp
$normalized = [
    'id'               => (string)$r['id'],
    'reservation_date' => (string)$r['reservation_date'],
    'start_time'       => (string)$r['start_time'],
    'lane_number'      => max(1, min(24, (int)$r['lane_number'])),
    'party_size'       => max(1, min(24, (int)$r['party_size'])),
    'family_code'      => (string)($r['family_code'] ?? ''),
    'first_name'       => trim((string)($r['first_name'] ?? '')),
    'last_name'        => trim((string)($r['last_name'] ?? '')),
    'email'            => trim((string)($r['email'] ?? '')),
    'phone'            => trim((string)($r['phone'] ?? '')),
    'notes'            => trim((string)($r['notes'] ?? '')),
    'queued_at'        => gmdate('c'),
];

@mkdir(dirname(PENDING_FILE), 0775, true);

// Merge into existing pending
$existing = [];
if (file_exists(PENDING_FILE)) {
    $existing = json_decode(file_get_contents(PENDING_FILE), true) ?: [];
}
$byId = [];
foreach ($existing as $row) {
    if (!empty($row['id'])) $byId[$row['id']] = $row;
}
$byId[$normalized['id']] = $normalized;

$out = array_values($byId);
usort($out, function ($a, $b) {
    return strcmp($a['reservation_date'].$a['start_time'], $b['reservation_date'].$b['start_time']);
});

$tmp = PENDING_FILE . '.tmp.' . uniqid();
file_put_contents($tmp, json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
rename($tmp, PENDING_FILE);

echo json_encode([
    'ok'             => true,
    'queued'         => $normalized['id'],
    'total_pending'  => count($out),
    'written'        => basename(PENDING_FILE),
]);
