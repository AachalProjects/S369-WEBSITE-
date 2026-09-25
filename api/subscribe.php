<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok'=>false,'message'=>'Method not allowed'],405);
$in=json_input(); $email=clean((string)($in['email']??''),180);
if(!filter_var($email,FILTER_VALIDATE_EMAIL)) respond(['ok'=>false,'message'=>'Enter a valid email address.'],422);
file_put_contents(__DIR__.'/../private/subscribers.ndjson',json_encode(['created_at'=>date(DATE_ATOM),'email'=>$email]).PHP_EOL,FILE_APPEND|LOCK_EX);
respond(['ok'=>true,'message'=>'You are on the S369 list.']);
