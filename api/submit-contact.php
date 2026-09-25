<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok'=>false,'message'=>'Method not allowed'],405);
$in=json_input();
$name=clean((string)($in['name']??''),120); $contact=clean((string)($in['contact']??''),160); $message=clean((string)($in['message']??''),1200);
if(!$name||!$contact||!$message) respond(['ok'=>false,'message'=>'Please complete all fields.'],422);
$entry=['created_at'=>date(DATE_ATOM),'name'=>$name,'contact'=>$contact,'message'=>$message];
file_put_contents(__DIR__.'/../private/contact-leads.ndjson',json_encode($entry,JSON_UNESCAPED_UNICODE).PHP_EOL,FILE_APPEND|LOCK_EX);
respond(['ok'=>true,'message'=>'Thank you. Your message has been received.']);
