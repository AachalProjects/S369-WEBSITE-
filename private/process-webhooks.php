<?php
declare(strict_types=1);
// Run with Hostinger cron: php /full/path/to/public_html/private/process-webhooks.php
$ordersDir = __DIR__ . '/orders';
$queueDir = __DIR__ . '/webhook-queue';
$doneDir = __DIR__ . '/webhook-processed';
@mkdir($ordersDir,0750,true); @mkdir($queueDir,0750,true); @mkdir($doneDir,0750,true);
function findOrderByRazorpay(string $rpOrderId, string $ordersDir): ?array {
    foreach (glob($ordersDir.'/*.json') ?: [] as $path) {
        $o=json_decode((string)file_get_contents($path),true);
        if(is_array($o) && ($o['razorpay_order_id']??'')===$rpOrderId) return [$path,$o];
    }
    return null;
}
foreach (glob($queueDir.'/*.json') ?: [] as $path) {
    $raw=(string)file_get_contents($path); $event=json_decode($raw,true);
    if(!is_array($event)){ @rename($path,$doneDir.'/'.basename($path)); continue; }
    $name=(string)($event['event']??'');
    $payment=$event['payload']['payment']['entity']??[];
    $rpOrder=(string)($payment['order_id']??'');
    if($rpOrder){
        $found=findOrderByRazorpay($rpOrder,$ordersDir);
        if($found){ [$orderPath,$order]=$found;
            if($name==='payment.captured' || $name==='order.paid'){
                $order['payment_status']='paid'; $order['status']='Order confirmed'; $order['razorpay_payment_id']=$payment['id']??($order['razorpay_payment_id']??''); $order['webhook_confirmed_at']=date(DATE_ATOM);
            } elseif($name==='payment.failed'){
                if(($order['payment_status']??'')!=='paid'){ $order['payment_status']='failed'; $order['status']='Payment failed'; }
            }
            file_put_contents($orderPath,json_encode($order,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES),LOCK_EX);
        }
    }
    @rename($path,$doneDir.'/'.basename($path));
}
