# Build MSIX package for sideloading (direct install on POS devices)
#
# Prerequisites:
#   1. Run scripts/generate-certificate.ps1 first (one-time)
#   2. Install the certificate on target devices
#
# Usage:
#   .\scripts\build-sideload.ps1
#   .\scripts\build-sideload.ps1 -CertThumbprint "ABC123..."
#   .\scripts\build-sideload.ps1 -Arch arm64

param(
    [string]$CertThumbprint = "",
    [ValidateSet("x64", "arm64")]
    [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Join-Path $PSScriptRoot ".." "DesktopKitchenPOS"
$ProjectFile = Join-Path $ProjectDir "DesktopKitchenPOS.csproj"

# Try to find certificate if not provided
if (-not $CertThumbprint) {
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*DesktopKitchen*" } | Select-Object -First 1
    if ($cert) {
        $CertThumbprint = $cert.Thumbprint
        Write-Host "Found certificate: $($cert.Subject) ($CertThumbprint)" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: No certificate found. Run scripts/generate-certificate.ps1 first." -ForegroundColor Red
        Write-Host "  Or pass -CertThumbprint 'YOUR_THUMBPRINT'" -ForegroundColor Yellow
        exit 1
    }
}

$rid = "win-$($Arch.ToLower())"

Write-Host "Desktop Kitchen POS - Sideload Build" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Architecture: $Arch" -ForegroundColor White
Write-Host "  Certificate:  $CertThumbprint" -ForegroundColor White

Write-Host "`nCleaning..." -ForegroundColor Yellow
dotnet clean $ProjectFile -c Sideload 2>$null

Write-Host "`nBuilding sideload package..." -ForegroundColor Cyan
dotnet publish $ProjectFile `
    -c Sideload `
    -r $rid `
    -p:Platform=$Arch `
    -p:GenerateAppxPackageOnBuild=true `
    -p:AppxPackageSigningEnabled=true `
    -p:PackageCertificateThumbprint=$CertThumbprint `
    -p:AppxBundle=Never

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}

# Find output
$packagesDir = Join-Path $ProjectDir "AppPackages"
if (Test-Path $packagesDir) {
    Write-Host "`nBuild output:" -ForegroundColor Green
    Get-ChildItem -Path $packagesDir -Recurse -Include *.msix | ForEach-Object {
        $size = "{0:N2} MB" -f ($_.Length / 1MB)
        Write-Host "  $($_.FullName) ($size)" -ForegroundColor White
    }
    Write-Host "`nInstall on a device:" -ForegroundColor Yellow
    Write-Host "  1. Install the certificate on the target device (Trusted People store)" -ForegroundColor White
    Write-Host "  2. Double-click the .msix file to install" -ForegroundColor White
    Write-Host "  Or use PowerShell: Add-AppPackage -Path <path-to-msix>" -ForegroundColor White
} else {
    Write-Host "WARNING: AppPackages directory not found" -ForegroundColor Yellow
}
