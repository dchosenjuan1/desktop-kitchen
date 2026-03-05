# Build MSIX package for Microsoft Store submission
#
# The Store signs the package for you — no local certificate needed.
# Upload the generated .msixupload to Partner Center.
#
# Usage:
#   .\scripts\build-store.ps1
#   .\scripts\build-store.ps1 -Arch arm64    # ARM64 only
#   .\scripts\build-store.ps1 -Arch all      # x64 + arm64

param(
    [ValidateSet("x64", "arm64", "all")]
    [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Join-Path $PSScriptRoot ".." "DesktopKitchenPOS"
$ProjectFile = Join-Path $ProjectDir "DesktopKitchenPOS.csproj"

function Build-Platform {
    param([string]$Platform, [string]$Rid)

    Write-Host "`nBuilding Store package for $Platform..." -ForegroundColor Cyan

    dotnet publish $ProjectFile `
        -c Store `
        -r $Rid `
        -p:Platform=$Platform `
        -p:GenerateAppxPackageOnBuild=true `
        -p:AppxPackageSigningEnabled=false `
        -p:AppxBundle=Never

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed for $Platform" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Desktop Kitchen POS - Store Build" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Clean first
Write-Host "`nCleaning..." -ForegroundColor Yellow
dotnet clean $ProjectFile -c Store 2>$null

if ($Arch -eq "all") {
    Build-Platform -Platform "x64" -Rid "win-x64"
    Build-Platform -Platform "ARM64" -Rid "win-arm64"
} else {
    $rid = "win-$($Arch.ToLower())"
    Build-Platform -Platform $Arch -Rid $rid
}

# Find output
$packagesDir = Join-Path $ProjectDir "AppPackages"
if (Test-Path $packagesDir) {
    Write-Host "`nBuild output:" -ForegroundColor Green
    Get-ChildItem -Path $packagesDir -Recurse -Include *.msix,*.msixupload | ForEach-Object {
        $size = "{0:N2} MB" -f ($_.Length / 1MB)
        Write-Host "  $($_.Name) ($size)" -ForegroundColor White
    }
    Write-Host "`nUpload to Partner Center:" -ForegroundColor Yellow
    Write-Host "  https://partner.microsoft.com/dashboard" -ForegroundColor White
} else {
    Write-Host "WARNING: AppPackages directory not found" -ForegroundColor Yellow
}
