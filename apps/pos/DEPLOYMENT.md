# Deployment Guide — Native Android & Windows Apps

Step-by-step guide for publishing the Desktop Kitchen POS app to the Google Play Store, Microsoft Store, and direct sideloading on managed POS devices.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Android — Google Play Store](#2-android--google-play-store)
3. [Android — Sideloading (APK)](#3-android--sideloading-apk)
4. [Windows — Microsoft Store](#4-windows--microsoft-store)
5. [Windows — Sideloading (MSIX)](#5-windows--sideloading-msix)
6. [Version Management](#6-version-management)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### Accounts

| Store | Cost | URL |
|-------|------|-----|
| Google Play Console | $25 one-time | [play.google.com/console/signup](https://play.google.com/console/signup) |
| Microsoft Partner Center | $19 individual / $99 company | [partner.microsoft.com/dashboard](https://partner.microsoft.com/dashboard) |

> **Company accounts** are recommended for both stores — they display your business name and are required for certain enterprise features. Company verification requires a D-U-N-S number (free to obtain, 1-5 business days for MX entities).

### Tools

| Tool | Required for | Install |
|------|-------------|---------|
| Android Studio / JDK 17 | Android builds | [developer.android.com/studio](https://developer.android.com/studio) |
| `keytool` | Keystore generation | Included with JDK |
| `adb` | APK sideloading | Included with Android Studio |
| .NET 8 SDK | Windows builds | [dotnet.microsoft.com/download](https://dotnet.microsoft.com/download/dotnet/8.0) |
| Visual Studio 2022 | Windows builds (optional) | [visualstudio.microsoft.com](https://visualstudio.microsoft.com/) |
| PowerShell 7+ | Windows build scripts | [github.com/PowerShell/PowerShell](https://github.com/PowerShell/PowerShell) |

### Privacy Policy

Both stores require a privacy policy URL. Your policy must cover:

- Data collected (loyalty customer info, order history)
- Payment processing via Stripe (no raw card data stored)
- SMS communications via Twilio (loyalty, recapture)
- Server communication (pos.desktop.kitchen)
- User rights and data deletion

Host the privacy policy at a public URL (e.g., `desktop.kitchen/privacy`).

### Store Assets

Prepare these before submitting to either store:

| Asset | Spec |
|-------|------|
| App icon | 512x512 PNG (Google) / 300x300+ PNG (Microsoft) |
| Feature graphic | 1024x500 PNG (Google Play only) |
| Screenshots — tablet | At least 2 screenshots, 1920x1200 or similar |
| Short description | 80 chars max (Google) |
| Full description | Up to 4000 chars (Google) / 10000 chars (Microsoft) |

---

## 2. Android — Google Play Store

### Step 1: Generate a Signing Keystore

The signing keystore is used to prove you are the app's author. **If you lose this file, you cannot update the app.** Back it up securely.

```bash
cd apps/pos/native-android

# Set passwords (use strong, unique passwords)
export KEYSTORE_PASSWORD="your-secure-password"
export KEY_PASSWORD="your-secure-password"

# Generate keystore
./scripts/generate-keystore.sh
```

This creates `app/keystore/release.keystore`. Store the passwords in a password manager — you'll need them for every release build.

> **Google Play App Signing**: Google offers to manage your signing key via [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756). This is strongly recommended — if you opt in, Google holds the signing key and you only need an "upload key" (which can be reset if lost). You can enroll during your first upload.

### Step 2: Build the Release AAB

```bash
cd apps/pos/native-android

export KEYSTORE_PASSWORD="your-secure-password"
export KEY_PASSWORD="your-secure-password"

./scripts/build-release.sh
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### Step 3: Create the App on Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - **App name**: Desktop Kitchen POS
   - **Default language**: Spanish (Mexico) — or English
   - **App or Game**: App
   - **Free or Paid**: Free (or Paid, depending on your model)
4. Accept the declarations and click **Create app**

### Step 4: Complete the Store Listing

Navigate to **Grow > Store presence > Main store listing**:

1. **Short description**: "Restaurant POS system for tablets — orders, kitchen, payments, reports"
2. **Full description**: Write a detailed description of features
3. **App icon**: Upload 512x512 PNG
4. **Feature graphic**: Upload 1024x500 PNG
5. **Screenshots**: Upload at least 2 tablet screenshots (10-inch)
   - Take screenshots from the app running on a tablet or emulator
   - Recommended: Login screen, POS screen, Kitchen screen, Reports screen
6. **App category**: Business > Food & Drink (or Business > Productivity)

### Step 5: Complete Required Declarations

#### Content Rating (IARC)

Navigate to **Policy and programs > App content > Content rating**:

1. Start the IARC questionnaire
2. Answer honestly — a business POS app will receive an **Everyone** rating
3. No violence, gambling, or user-generated content

#### Data Safety

Navigate to **Policy and programs > App content > Data safety**:

1. **Does your app collect or share user data?** → Yes
2. Declare:
   - **Financial info** → Payment info (processed via Stripe, not stored locally)
   - **Personal info** → Phone number (loyalty customers, optional)
   - **App activity** → Order history
3. Data is **encrypted in transit** (HTTPS)
4. Data **cannot be deleted** by user (restaurant owns the data)
5. Link to your **privacy policy URL**

#### Target Audience

- Select **18 and over** (business app, not designed for children)

#### App Access

Navigate to **Policy and programs > App content > App access**:

1. Select **All or some functionality is restricted**
2. Add instructions: "Use PIN `1234` to log in as admin. The app connects to server at pos.desktop.kitchen with tenant `demo`."
3. This lets reviewers test your app

### Step 6: Set Up Pricing & Distribution

Navigate to **Monetization > Pricing**:

1. Set your pricing model (free or paid)
2. For a POS app processing physical goods payments (food orders), you are **exempt from Play Billing** — Stripe payments are allowed

Navigate to **Reach > Countries/regions**:

1. Select the countries where the app should be available (e.g., Mexico)

### Step 7: Upload and Release

1. Navigate to **Release > Testing > Internal testing** (recommended for first upload)
2. Click **Create new release**
3. If prompted, opt in to **Google Play App Signing** (recommended)
4. Upload the `.aab` file from Step 2
5. Add **Release notes**: "Initial release — Login, POS, Kitchen Display, Reports"
6. Click **Review release** → **Start rollout to Internal testing**

#### Testing Tracks (recommended progression)

| Track | Audience | Purpose |
|-------|----------|---------|
| Internal testing | Up to 100 testers you invite | Quick validation, no review |
| Closed testing | Invite-only testers | Broader beta with store review |
| Open testing | Anyone can join | Public beta |
| Production | Everyone | Live release |

> **Tip**: Internal testing releases are available within minutes (no review). Use this to validate the build works before promoting to production.

### Step 8: Promote to Production

1. After validating on internal/closed testing:
2. Navigate to **Release > Production**
3. Click **Create new release**
4. Select the tested version from the internal track (or upload a new `.aab`)
5. Click **Review release** → **Start rollout to Production**
6. First production review takes **3-7 business days** (payment apps may take longer)

### Step 9: Post-Launch

- **Monitor**: Check the Play Console dashboard for crashes, ANRs, and reviews
- **Updates**: Build a new `.aab` (bump `versionCode` and `versionName`), upload to the production track
- **Reply to reviews**: Respond to user feedback in the Play Console

---

## 3. Android — Sideloading (APK)

For deploying directly to managed restaurant tablets without the Play Store.

### Step 1: Build the APK

```bash
cd apps/pos/native-android

export KEYSTORE_PASSWORD="your-secure-password"
export KEY_PASSWORD="your-secure-password"

./scripts/build-apk.sh
```

Output: `app/build/outputs/apk/release/app-release.apk`

### Step 2: Enable Installation on the Device

On the target tablet:

1. Go to **Settings > Security** (or **Settings > Apps > Special app access**)
2. Enable **Install unknown apps** for your file manager or browser

### Step 3: Install the APK

**Option A — USB cable:**

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

**Option B — File transfer:**

1. Copy the `.apk` to the tablet (USB, email, cloud drive, or web download)
2. Open the `.apk` file on the tablet
3. Tap **Install**

**Option C — MDM (enterprise):**

Use Samsung Knox, Microsoft Intune, or another MDM solution to push the APK to all managed devices.

### Step 4: Updates

For each update:

1. Bump `versionCode` and `versionName` in `app/build.gradle.kts`
2. Rebuild the APK
3. Reinstall on devices (same method as Step 3)

> **Tip**: For automatic updates without the Play Store, consider implementing an in-app update check that downloads new APKs from your server.

---

## 4. Windows — Microsoft Store

### Step 1: Reserve Your App Name

1. Go to [Partner Center](https://partner.microsoft.com/dashboard)
2. Navigate to **Apps and Games > New product > MSIX or PWA app**
3. Reserve the name **Desktop Kitchen POS**
4. Note the **Package Identity Name** and **Publisher** values — you'll need to update `Package.appxmanifest` to match

### Step 2: Update Package Identity

Edit `native-windows/DesktopKitchenPOS/Package.appxmanifest` to match the values from Partner Center:

```xml
<Identity
    Name="12345YourPublisher.DesktopKitchenPOS"
    Publisher="CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    Version="1.0.0.0" />
```

The `Name` and `Publisher` **must exactly match** what Partner Center assigned, or the upload will be rejected.

### Step 3: Build the Store Package

```powershell
cd apps\pos\native-windows

# Build for x64 (most Windows tablets)
.\scripts\build-store.ps1

# Or build for both x64 and ARM64
.\scripts\build-store.ps1 -Arch all
```

Output: `DesktopKitchenPOS/AppPackages/*.msixupload`

> **Note**: Do NOT sign the package for Store submission — Microsoft signs it with their certificate. The `build-store.ps1` script handles this automatically.

### Step 4: Complete the Store Listing

In Partner Center, create a new submission:

#### Properties

1. **Category**: Business > Accounting & Finance
2. **Privacy policy URL**: Your hosted privacy policy
3. **System requirements**: Minimum 4 GB RAM, 10" screen recommended

#### Age Ratings

1. Complete the **IARC questionnaire** (same as Google — business app gets "Everyone")

#### Packages

1. Upload the `.msixupload` file from Step 3

#### Store Listing

1. **Description**: Full description of the POS features
2. **Screenshots**: At least 1 screenshot (1366x768 minimum, 1920x1080 recommended)
   - Recommended: Login screen, POS screen, Kitchen screen, Reports screen
3. **App icon**: Uploaded from your package (uses the icons in `Assets/`)
4. **Search terms**: "POS", "restaurant", "point of sale", "kitchen display", "order management"

#### Notes for Certification

Add test instructions so reviewers can use the app:

```
This is a restaurant POS system. To test:
1. Launch the app
2. Enter PIN: 1234 to log in as admin
3. The app connects to our server at pos.desktop.kitchen
4. Tenant: demo

The app requires an internet connection to function.
```

### Step 5: Submit for Certification

1. Click **Submit to the Store**
2. First submission review takes **3-5 business days**
3. You'll receive an email when the app is certified (or if changes are required)

### Step 6: Post-Launch

- **Updates**: Bump the `Version` in both `.csproj` and `Package.appxmanifest`, rebuild, upload new package
- **Monitor**: Check Partner Center for crash reports, reviews, and acquisition data
- **Version format**: Use `Major.Minor.Patch.0` (e.g., `1.1.0.0`) — the fourth digit is reserved by the Store

---

## 5. Windows — Sideloading (MSIX)

For deploying directly to managed POS devices without the Microsoft Store.

### Step 1: Generate a Signing Certificate

On a Windows machine:

```powershell
cd apps\pos\native-windows
.\scripts\generate-certificate.ps1
```

This creates:
- A self-signed certificate in your personal certificate store
- A `.pfx` file exported to `certs/DesktopKitchenPOS.pfx`

Note the **thumbprint** displayed — you'll need it for building.

> **For production**: Purchase a code-signing certificate from a trusted CA (DigiCert, Sectigo, ~$200-400/year). This avoids having to install a self-signed certificate on each device.

### Step 2: Build the Sideload Package

```powershell
.\scripts\build-sideload.ps1

# Or specify the certificate explicitly
.\scripts\build-sideload.ps1 -CertThumbprint "ABC123..."

# Or build for ARM64
.\scripts\build-sideload.ps1 -Arch arm64
```

Output: `DesktopKitchenPOS/AppPackages/*.msix`

### Step 3: Install the Certificate on Target Devices

On each POS device (requires admin):

**Option A — PowerShell (recommended):**

```powershell
# Export the .cer (public key only) from the .pfx
$pfx = Get-PfxCertificate -FilePath "DesktopKitchenPOS.pfx"
Export-Certificate -Cert $pfx -FilePath "DesktopKitchenPOS.cer"

# Install on the device
Import-Certificate -FilePath "DesktopKitchenPOS.cer" -CertStoreLocation Cert:\LocalMachine\TrustedPeople
```

**Option B — Group Policy / Intune:**

Push the certificate to all managed devices via your MDM solution.

### Step 4: Install the MSIX

**Option A — Double-click:**

Copy the `.msix` file to the device and double-click it. The App Installer will handle installation.

**Option B — PowerShell:**

```powershell
Add-AppPackage -Path "DesktopKitchenPOS_1.0.0.0_x64.msix"
```

**Option C — Intune (enterprise):**

Upload the `.msix` as a Line-of-Business (LOB) app in Intune and assign it to your device group.

### Step 5: Set Up Auto-Updates (Optional)

For automatic updates without the Store:

1. Host the `.msix` and `.appinstaller` files on a web server
2. Edit `scripts/DesktopKitchenPOS.appinstaller`:
   - Update the `Uri` attributes to point to your hosted files
   - Update the `Version` to match your build
3. On each device, install via the `.appinstaller` URL:

```powershell
Add-AppPackage -AppInstallerFile "https://pos.desktop.kitchen/downloads/DesktopKitchenPOS.appinstaller"
```

The app will check for updates every 12 hours and install them automatically.

### Step 6: Updates

For each update:

1. Bump the `Version` in `.csproj` and `Package.appxmanifest`
2. Rebuild with `build-sideload.ps1`
3. Replace the `.msix` on your hosting server (the `.appinstaller` handles the rest)
4. Or manually reinstall on each device

---

## 6. Version Management

### Android

In `app/build.gradle.kts`:

```kotlin
defaultConfig {
    versionCode = 2          // Increment by 1 for each release (integer, must always increase)
    versionName = "1.1.0"   // Human-readable version string
}
```

- `versionCode` must be strictly increasing for every upload (Play Store rejects lower/equal values)
- `versionName` is displayed to users

### Windows

In `DesktopKitchenPOS.csproj`:

```xml
<Version>1.1.0</Version>
<AssemblyVersion>1.1.0.0</AssemblyVersion>
<FileVersion>1.1.0.0</FileVersion>
```

In `Package.appxmanifest`:

```xml
<Identity ... Version="1.1.0.0" />
```

- All four version fields must be updated together
- The version must be higher than the previous submission
- Format: `Major.Minor.Patch.0` (fourth digit reserved by Store)

### Versioning Strategy

Use the same version number across all three platforms (iOS, Android, Windows):

| Release | iOS | Android `versionCode` | Android `versionName` | Windows |
|---------|-----|----------------------|----------------------|---------|
| Launch  | 1.0.0 | 1 | 1.0.0 | 1.0.0.0 |
| Patch   | 1.0.1 | 2 | 1.0.1 | 1.0.1.0 |
| Feature | 1.1.0 | 3 | 1.1.0 | 1.1.0.0 |

---

## 7. Troubleshooting

### Android

| Problem | Solution |
|---------|----------|
| `Keystore was tampered with, or password was incorrect` | Check `KEYSTORE_PASSWORD` and `KEY_PASSWORD` env vars |
| Play Store rejects AAB — "version code already used" | Increment `versionCode` in `build.gradle.kts` |
| ProGuard breaks Moshi deserialization | Ensure `proguard-rules.pro` keeps model classes (already configured) |
| "App not installed" on sideloading | Enable "Install unknown apps" in device settings |
| Review rejected — "app access" | Add test PIN and server details in the App Access section |

### Windows

| Problem | Solution |
|---------|----------|
| Store rejects package — identity mismatch | Update `Package.appxmanifest` Identity to match Partner Center values |
| `Add-AppPackage` fails — "certificate not trusted" | Install the signing certificate in `Cert:\LocalMachine\TrustedPeople` |
| App crashes on launch (clean machine) | Ensure `SelfContained=true` and `WindowsAppSDKSelfContained=true` in `.csproj` |
| MSIX won't install — "sideloading not enabled" | Windows 10 2004+: enabled by default. Older: Settings > Update > For Developers > enable |
| Build fails — "Platform not supported" | Run from a Windows machine with .NET 8 SDK + Windows App SDK workload |

### Both Platforms

| Problem | Solution |
|---------|----------|
| App shows login but can't connect | Verify the device has internet access and can reach `pos.desktop.kitchen` |
| Reviewer can't log in | Add test PIN (1234) and tenant (demo) in certification notes |
| Privacy policy rejected | Ensure it covers Stripe payments, Twilio SMS, and data collection |
