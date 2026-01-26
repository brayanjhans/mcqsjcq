<?php
// Simple PHP Reverse Proxy to Localhost:3000
// Bypasses Apache/Nginx static file handling issues

$upstream = 'http://127.0.0.1:3000';
$request_uri = $_SERVER['REQUEST_URI'];

// Init Curl
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $upstream . $request_uri);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true); // Include headers

// Pass POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Pass Headers
$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// Output Headers
http_response_code($http_code);
$header_text = substr($response, 0, $header_size);
$body = substr($response, $header_size);

foreach (explode("\r\n", $header_text) as $i => $line) {
    if ($i === 0 || empty($line)) continue;
    header($line);
}

// Output Body
echo $body;
?>
