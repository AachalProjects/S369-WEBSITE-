<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok'=>false,'message'=>'Method not allowed'],405);
$in=json_input(); $id=clean((string)($in['order_id']??''),80); $phone=preg_replace('/\D+/','',(string)($in['phone']??''));
$order=load_order($id);
if(!$order || ($order['customer']['phone']??'') !== $phone) respond(['ok'=>false,'message'=>'Order not found. Check the order ID and phone number.'],404);
respond(['ok'=>true,'order'=>[
 'id'=>$order['id'],'created_at'=>$order['created_at'],'status'=>$order['status'],'payment_method'=>$order['payment_method'],
 'payment_status'=>$order['payment_status'],'items'=>$order['items'],'subtotal'=>$order['subtotal'],'shipping'=>$order['shipping'],'total'=>$order['total']
]]);
