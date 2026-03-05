# Generate a self-signed certificate for MSIX sideload signing
#
# This certificate is for sideloading only (not needed for Store submission).
# The certificate must be installed on each target device's Trusted People store.
#
# For production sideloading, consider buying a code-signing certificate
# from a trusted CA (DigiCert, Sectigo, etc.) instead.
#
# Usage:
#   .\scripts\generate-certificate.ps1
#   .\scripts\generate-certificate.ps1 -ExportPath ".\certs\DesktopKitchenPOS.pfx"

param(
    [string]$ExportPath = (Join-Path $PSScriptRoot ".." "certs" "DesktopKitchenPOS.pfx"),
    [string]$Subject = "CN=DesktopKitchen"
)

$ErrorActionPreference = "Stop"

# Check if certificate already exists
$existing = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $Subject }
if ($existing) {
    Write-Host "Certificate already exists:" -ForegroundColor Yellow
    Write-Host "  Subject:    $($existing.Subject)" -ForegroundColor White
    Write-Host "  Thumbprint: $($existing.Thumbprint)" -ForegroundColor White
    Write-Host "  Expires:    $($existing.NotAfter)" -ForegroundColor White
    Write-Host ""
    Write-Host "Delete it first if you want to regenerate:" -ForegroundColor Yellow
    Write-Host "  Remove-Item Cert:\CurrentUser\My\$($existing.Thumbprint)" -ForegroundColor White
    exit 0
}

Write-Host "Generating self-signed certificate..." -ForegroundColor Cyan
Write-Host "  Subject: $Subject" -ForegroundColor White

# Create certificate (valid for 3 years)
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $Subject `
    -KeyUsage DigitalSignature `
    -FriendlyName "Desktop Kitchen POS Sideload" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
    -NotAfter (Get-Date).AddYears(3)

Write-Host ""
Write-Host "Certificate created:" -ForegroundColor Green
Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
Write-Host "  Expires:    $($cert.NotAfter)" -ForegroundColor White

# Export PFX
$exportDir = Split-Path $ExportPath -Parent
if (-not (Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir | Out-Null
}

$password = Read-Host "Enter a password for the PFX file" -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath $ExportPath -Password $password | Out-Null

Write-Host ""
Write-Host "PFX exported to: $ExportPath" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: The Subject ($Subject) must match the Publisher" -ForegroundColor Yellow
Write-Host "in Package.appxmanifest. Current manifest has:" -ForegroundColor Yellow
Write-Host '  Publisher="CN=DesktopKitchen"' -ForegroundColor White
Write-Host ""
Write-Host "To install on a target device (admin PowerShell):" -ForegroundColor Yellow
Write-Host "  Import-Certificate -FilePath DesktopKitchenPOS.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople" -ForegroundColor White
Write-Host ""
Write-Host "Use this thumbprint with build-sideload.ps1:" -ForegroundColor Yellow
Write-Host "  .\scripts\build-sideload.ps1 -CertThumbprint '$($cert.Thumbprint)'" -ForegroundColor White
