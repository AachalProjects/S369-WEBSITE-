<?php
require __DIR__ . '/lib.php';
$c = cfg();
respond([
  'ok'=>true,
  'razorpay_enabled'=>$c['razorpay_enabled'],
  'razorpay_key_id'=>$c['razorpay_enabled'] ? $c['razorpay_key_id'] : '',
  'shipping_flat'=>$c['shipping_flat'],
  'whatsapp_number'=>$c['whatsapp_number'],
]);
