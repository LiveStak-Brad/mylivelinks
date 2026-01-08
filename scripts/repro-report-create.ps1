param(
  [Parameter(Mandatory=$false)][string]$BaseUrl = "http://localhost:3000",
  [Parameter(Mandatory=$true)][string]$AccessToken,
  [Parameter(Mandatory=$false)][string]$ReportedUserId = "",
  [Parameter(Mandatory=$false)][string]$ReportType = "chat",
  [Parameter(Mandatory=$false)][string]$ReportReason = "spam"
)

$uri = "$BaseUrl/api/reports/create"
$body = @{
  report_type = $ReportType
  reported_user_id = $(if ($ReportedUserId -ne "") { $ReportedUserId } else { $null })
  report_reason = $ReportReason
  report_details = "repro script"
  context_details = "{\"surface\":\"repro-report-create.ps1\",\"ts\":\"$([DateTime]::UtcNow.ToString('o'))\"}"
} | ConvertTo-Json -Depth 8

Write-Host "POST $uri"

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $AccessToken" }
  Write-Host "SUCCESS" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 10
} catch {
  Write-Host "FAILED" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $text = $reader.ReadToEnd()
    Write-Host $text
  } else {
    Write-Host $_
  }
}
