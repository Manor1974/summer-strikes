<?php
// =====================================================================
// /lm/summer-strikes-reservation-processed.php
// =====================================================================
// FRONTDESK1's PowerShell writer pings this AFTER a successful Conqueror
// INSERT to ack the reservation. We:
//   1. Remove it from summer-strikes-reservations-pending.json
//   2. Append it to summer-strikes-reservations-processed.json
//      (with the Conqueror IdRsrv / ReservationKey it landed as)
//
// The Summer Strikes app polls /lm/data/summer-strikes-reservations-processed.json
// to flip the reservation row to status=COMPLETED (or we mark via a
// separate ack to the app — see the writer script).
//
// Expected POST body:
// {
//   "password": "...",
//   "id":             "<our reservation cuid>",
//   "conqueror_id_rsrv": 1234,         // RsrvHdr.ID
//   "conqueror_key":     "W6093",      // RsrvHdr.ReservationKey (if present)
//   "wrote_at":       "2026-06-15T18:00:00-04:00"
// }
// =====================================================================

define('SS_RSRV_API_PASSWORD', 'Manor1974LaneZ');
define('PENDING_FILE',   __DIR__ . '/data/summer-strikes-reservations-pending.json');
define('PROCESSED_FILE', __DIR__ . '/data/summer-strikes-reservations-processed.json');

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => 'PHP fatal', 'message' => $err['message']]);
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

$id = (string)($body['id'] ?? '');
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'missing id']);
    exit;
}

// Pull from pending
$pendingRow = null;
$pending = [];
if (file_exists(PENDING_FILE)) {
    $pending = json_decode(file_get_contents(PENDING_FILE), true) ?: [];
}
$remaining = [];
foreach ($pending as $row) {
    if (($row['id'] ?? '') === $id) {
        $pendingRow = $row;
    } else {
        $remaining[] = $row;
    }
}

// Append to processed
$processed = [];
if (file_exists(PROCESSED_FILE)) {
    $processed = json_decode(file_get_contents(PROCESSED_FILE), true) ?: [];
}
$processed[] = array_merge($pendingRow ?? ['id' => $id], [
    'conqueror_id_rsrv' => (int)($body['conqueror_id_rsrv'] ?? 0),
    'conqueror_key'     => (string)($body['conqueror_key'] ?? ''),
    'wrote_at'          => (string)($body['wrote_at'] ?? gmdate('c')),
    'processed_at'      => gmdate('c'),
]);
// Cap processed log size — keep most recent 500
if (count($processed) > 500) $processed = array_slice($processed, -500);

@mkdir(dirname(PENDING_FILE), 0775, true);
@mkdir(dirname(PROCESSED_FILE), 0775, true);
$tmpA = PENDING_FILE . '.tmp.' . uniqid();
file_put_contents($tmpA, json_encode($remaining, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
rename($tmpA, PENDING_FILE);

$tmpB = PROCESSED_FILE . '.tmp.' . uniqid();
file_put_contents($tmpB, json_encode($processed, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
rename($tmpB, PROCESSED_FILE);

echo json_encode([
    'ok'                => true,
    'id'                => $id,
    'pending_remaining' => count($remaining),
    'processed_total'   => count($processed),
]);
