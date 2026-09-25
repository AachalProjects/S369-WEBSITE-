<?php
declare(strict_types=1);
// Fast webhook ingress: verify -> persist -> return 200. Process later via cron.
$c = require __DIR__ . '/../private/config.php';
$raw = (string)file_get_contents('php://input');
$sig = (string)($_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '');
$eventId = (string)($_SERVER['HTTP_X_RAZORPAY_EVENT_ID'] ?? '');
$secret = (string)($c['razorpay_webhook_secret'] ?? '');
if (!$raw || !$sig || !$eventId || !$secret || str_contains($secret,'PASTE_')) { http_response_code(400); exit('invalid'); }
$expected = hash_hmac('sha256', $raw, $secret);
if (!hash_equals($expected, $sig)) { http_response_code(401); exit('signature'); }
$safe = preg_replace('/[^A-Za-z0-9_-]/','',$eventId);
$processed = __DIR__ . '/../private/webhook-processed/' . $safe . '.json';
$queued = __DIR__ . '/../private/webhook-queue/' . $safe . '.json';
if (is_file($processed) || is_file($queued)) { http_response_code(200); exit('ok'); }
file_put_contents($queued, $raw, LOCK_EX);
http_response_code(200); echo 'ok';
