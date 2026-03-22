$ErrorActionPreference = 'Stop'

$inspectUrl = 'http://127.0.0.1:4040/api/tunnels'
$response = Invoke-RestMethod -Uri $inspectUrl
$httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1

if (-not $httpsTunnel) {
  throw 'No HTTPS ngrok tunnel is running.'
}

$callbackUrl = "$($httpsTunnel.public_url)/api/v1/facebook/webhook"
Write-Output "NGROK_PUBLIC_URL=$($httpsTunnel.public_url)"
Write-Output "FB_WEBHOOK_CALLBACK_URL=$callbackUrl"
