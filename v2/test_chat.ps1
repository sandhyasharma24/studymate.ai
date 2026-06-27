$ErrorActionPreference = 'Stop'
$response = curl.exe -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d "{\`"email\`":\`"student@example.com\`",\`"password\`":\`"demo123\`"}"
Write-Host "Login response: $response"
$token = ($response | ConvertFrom-Json).accessToken
Write-Host "Token: $token"
$chatResponse = curl.exe -s -X POST http://localhost:8080/api/v1/chat/sessions -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\`"title\`":\`"My Chat\`",\`"pdfId\`":null}"
Write-Host "Chat response: $chatResponse"
