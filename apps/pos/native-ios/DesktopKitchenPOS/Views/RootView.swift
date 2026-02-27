import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            switch appState.currentScreen {
            case .login:
                LoginScreen()
            case .pos:
                POSScreen()
            case .kitchen:
                KitchenScreen()
            case .admin:
                AdminPanel()
            case .reports:
                ReportsScreen()
            case .inventory:
                InventoryScreen()
            case .employees:
                EmployeeScreen()
            case .menuManagement:
                MenuManagementScreen()
            case .kiosk:
                KioskScreen()
            }
        }
        .preferredColorScheme(.dark)
    }
}
