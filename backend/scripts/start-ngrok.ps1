$ErrorActionPreference = 'Stop'

$backendPort = 3000
$inspectUrl = 'http://127.0.0.1:4040/api/tunnels'

Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$logDir = Join-Path $PSScriptRoot '..'
$stdoutLog = Join-Path $logDir 'ngrok.log'
$stderrLog = Join-Path $logDir 'ngrok.err.log'

Remove-Item $stdoutLog -ErrorAction SilentlyContinue
Remove-Item $stderrLog -ErrorAction SilentlyContinue

Start-Process ngrok `
  -ArgumentList @('http', $backendPort, '--log', 'stdout') `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden | Out-Null

for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-RestMethod -Uri $inspectUrl
    $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
    if ($httpsTunnel) {
      $callbackUrl = "$($httpsTunnel.public_url)/api/v1/facebook/webhook"
      Write-Output "NGROK_PUBLIC_URL=$($httpsTunnel.public_url)"
      Write-Output "FB_WEBHOOK_CALLBACK_URL=$callbackUrl"
      exit 0
    }
  } catch {
  }
}

Write-Error 'Failed to start ngrok tunnel or fetch callback URL.'
