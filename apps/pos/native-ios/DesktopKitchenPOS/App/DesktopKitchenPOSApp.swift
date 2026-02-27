import SwiftUI

@main
struct DesktopKitchenPOSApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .task { await loadBranding() }
        }
    }

    private func loadBranding() async {
        do {
            let branding = try await BrandingService.getBranding()
            if let hex = branding.primaryColor {
                await MainActor.run {
                    AppColors.applyBranding(hex: hex)
                }
            }
        } catch {
            // Branding fetch failed — keep default colors
        }
    }
}
