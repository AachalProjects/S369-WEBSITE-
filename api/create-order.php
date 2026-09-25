<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok'=>false,'message'=>'Method not allowed'],405);
$in = json_input();
$customer = validate_customer((array)($in['customer'] ?? []));
$cart = normalize_cart((array)($in['items'] ?? []));
$orderId = new_order_id();
$rp = razorpay_request('POST','/orders',[
    'amount'=>$cart['total'] * 100,
    'currency'=>'INR',
    'receipt'=>$orderId,
    'notes'=>['store_order_id'=>$orderId,'customer_phone'=>$customer['phone']],
]);
$order = [
    'id'=>$orderId,'created_at'=>date(DATE_ATOM),'status'=>'Payment pending','payment_method'=>'online',
    'payment_status'=>'pending','razorpay_order_id'=>$rp['id'] ?? '',
    'customer'=>$customer,'items'=>$cart['items'],'subtotal'=>$cart['subtotal'],'shipping'=>$cart['shipping'],'total'=>$cart['total']
];
save_order($order);
$c=cfg();
respond(['ok'=>true,'store_order_id'=>$orderId,'razorpay_order_id'=>$order['razorpay_order_id'],'amount'=>$cart['total']*100,'currency'=>'INR','key_id'=>$c['razorpay_key_id']]);
