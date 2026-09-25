<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function cfg(): array {
    static $c = null;
    if ($c === null) $c = require __DIR__ . '/../private/config.php';
    return $c;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function clean(string $v, int $max = 250): string {
    $v = trim(strip_tags($v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function validate_customer(array $input): array {
    $required = ['firstName','lastName','address','city','state','pin','phone','contact'];
    $out = [];
    foreach ($required as $k) {
        $out[$k] = clean((string)($input[$k] ?? ''), $k === 'address' ? 500 : 120);
        if ($out[$k] === '') respond(['ok'=>false,'message'=>'Please complete all required checkout fields.'], 422);
    }
    $out['notes'] = clean((string)($input['notes'] ?? ''), 800);
    if (!preg_match('/^[0-9]{6}$/', $out['pin'])) respond(['ok'=>false,'message'=>'Enter a valid 6-digit PIN code.'], 422);
    $phone = preg_replace('/\D+/', '', $out['phone']);
    if (strlen($phone) < 10 || strlen($phone) > 15) respond(['ok'=>false,'message'=>'Enter a valid phone number.'], 422);
    $out['phone'] = $phone;
    return $out;
}

function normalize_cart(array $items): array {
    $c = cfg(); $normalized = []; $subtotal = 0;
    foreach ($items as $item) {
        $id = (string)($item['id'] ?? '');
        $size = (string)($item['size'] ?? '');
        $qty = max(1, min(10, (int)($item['qty'] ?? 1)));
        if (!isset($c['products'][$id], $c['sizes'][$size])) continue;
        $unit = (int)$c['sizes'][$size]['price'];
        $line = $unit * $qty;
        $subtotal += $line;
        $normalized[] = [
            'id'=>$id,'name'=>$c['products'][$id],'size'=>$size,'qty'=>$qty,
            'unit_price'=>$unit,'line_total'=>$line
        ];
    }
    if (!$normalized) respond(['ok'=>false,'message'=>'Your bag is empty or invalid.'], 422);
    $shipping = (int)$c['shipping_flat'];
    return ['items'=>$normalized,'subtotal'=>$subtotal,'shipping'=>$shipping,'total'=>$subtotal+$shipping];
}

function order_path(string $id): string {
    $safe = preg_replace('/[^A-Za-z0-9_-]/', '', $id);
    return __DIR__ . '/../private/orders/' . $safe . '.json';
}

function save_order(array $order): void {
    if (!is_dir(__DIR__ . '/../private/orders')) mkdir(__DIR__ . '/../private/orders', 0750, true);
    file_put_contents(order_path($order['id']), json_encode($order, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function load_order(string $id): ?array {
    $path = order_path($id);
    if (!is_file($path)) return null;
    $data = json_decode((string)file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function new_order_id(): string {
    return 'S369-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
}

function razorpay_request(string $method, string $path, ?array $payload = null): array {
    $c = cfg();
    if (!$c['razorpay_enabled']) respond(['ok'=>false,'message'=>'Online payments are not enabled yet.'], 503);
    if (str_contains($c['razorpay_key_id'], 'PASTE_') || str_contains($c['razorpay_key_secret'], 'PASTE_')) {
        respond(['ok'=>false,'message'=>'Razorpay keys are not configured on the server.'], 503);
    }
    $ch = curl_init('https://api.razorpay.com/v1' . $path);
    $headers = ['Content-Type: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_USERPWD => $c['razorpay_key_id'] . ':' . $c['razorpay_key_secret'],
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 25,
    ]);
    if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false || $err) respond(['ok'=>false,'message'=>'Could not reach payment gateway.'], 502);
    $data = json_decode((string)$body, true);
    if ($status < 200 || $status >= 300) {
        $msg = $data['error']['description'] ?? 'Payment gateway rejected the request.';
        respond(['ok'=>false,'message'=>$msg], 502);
    }
    return is_array($data) ? $data : [];
}
