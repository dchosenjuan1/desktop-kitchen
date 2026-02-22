import SwiftUI

@Observable
final class AppState {
    var currentEmployee: Employee?
    var currentScreen: Screen = .login

    var isLoggedIn: Bool { currentEmployee != nil }

    func navigate(to screen: Screen) {
        withAnimation(.easeInOut(duration: 0.2)) {
            currentScreen = screen
        }
    }

    func logout() {
        currentEmployee = nil
        currentScreen = .login
    }

    func loginSucceeded(employee: Employee) {
        currentEmployee = employee
        // Kitchen staff go straight to kitchen display
        if employee.role == .kitchen {
            currentScreen = .kitchen
        } else {
            currentScreen = .pos
        }
    }
}

enum Screen: Sendable {
    case login
    case pos
    case kitchen
    case admin
    case reports
    case inventory
    case employees
    case menuManagement
}
