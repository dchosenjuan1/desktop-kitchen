import SwiftUI

@Observable @MainActor
final class LoginViewModel {
    var pin = ""
    var isLoading = false
    var error: String?
    var shake = false

    var dots: [Bool] {
        (0..<4).map { $0 < pin.count }
    }

    func appendDigit(_ digit: String) async -> Employee? {
        guard pin.count < 4 else { return nil }
        pin += digit
        error = nil

        guard pin.count == 4 else { return nil }

        return await attemptLogin()
    }

    func backspace() {
        guard !pin.isEmpty else { return }
        pin.removeLast()
        error = nil
    }

    func clear() {
        pin = ""
        error = nil
    }

    private func attemptLogin() async -> Employee? {
        isLoading = true
        defer { isLoading = false }

        do {
            let employee = try await AuthService.login(pin: pin)
            return employee
        } catch {
            self.error = error.localizedDescription
            triggerShake()
            pin = ""
            return nil
        }
    }

    private func triggerShake() {
        shake = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(500))
            shake = false
        }
    }
}
