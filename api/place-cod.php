<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok'=>false,'message'=>'Method not allowed'],405);
$c=cfg(); if(!$c['cod_enabled']) respond(['ok'=>false,'message'=>'Cash on Delivery is not available.'],503);
$in=json_input();
$customer=validate_customer((array)($in['customer'] ?? []));
$cart=normalize_cart((array)($in['items'] ?? []));
$order=[
 'id'=>new_order_id(),'created_at'=>date(DATE_ATOM),'status'=>'Order received','payment_method'=>'cod','payment_status'=>'cod_pending',
 'customer'=>$customer,'items'=>$cart['items'],'subtotal'=>$cart['subtotal'],'shipping'=>$cart['shipping'],'total'=>$cart['total']
];
save_order($order);
respond(['ok'=>true,'order_id'=>$order['id'],'status'=>$order['status'],'total'=>$order['total']]);
