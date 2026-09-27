<?php
// S369 server configuration. Keep this file server-side only.
$razorpayKeyId = getenv('RAZORPAY_KEY_ID') ?: 'PASTE_RAZORPAY_KEY_ID_HERE';
$razorpayKeySecret = getenv('RAZORPAY_KEY_SECRET') ?: 'PASTE_RAZORPAY_KEY_SECRET_HERE';
$razorpayWebhookSecret = getenv('RAZORPAY_WEBHOOK_SECRET') ?: 'PASTE_RAZORPAY_WEBHOOK_SECRET_HERE';

return [
    'store_name' => 'S369 Perfume',
    'currency' => 'INR',
    'razorpay_key_id' => $razorpayKeyId,
    'razorpay_key_secret' => $razorpayKeySecret,
    'razorpay_enabled' => !str_contains($razorpayKeyId, 'PASTE_') && !str_contains($razorpayKeySecret, 'PASTE_'),
    'razorpay_webhook_secret' => $razorpayWebhookSecret,
    'cod_enabled' => false,
    'shipping_flat' => 0,
    'whatsapp_number' => getenv('S369_WHATSAPP') ?: '',
    'support_email' => getenv('S369_SUPPORT_EMAIL') ?: '',
    'products' => [
        'alpha-9' => 'Alpha 9',
        'cool-tides' => 'Cool Tides',
        'wild-crest' => 'Wild Crest',
        'crimson-musk' => 'Crimson Musk',
        'night-quartz' => 'Night Quartz',
        'midnight-blues' => 'Midnight Blues',
    ],
    'sizes' => [
        '30ml' => ['price' => 399, 'mrp' => 799],
        '50ml' => ['price' => 899, 'mrp' => 1599],
        '100ml' => ['price' => 1499, 'mrp' => 2999],
    ],
];
