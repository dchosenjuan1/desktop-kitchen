import SwiftUI

struct KioskExitSheet: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var pin = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var shake = false

    private var dots: [Bool] {
        (0..<4).map { $0 < pin.count }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 32) {
                    Spacer()

                    // Lock icon + instruction
                    VStack(spacing: 12) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(AppColors.accent)

                        Text("Enter employee PIN to exit")
                            .font(AppFonts.title3)
                            .foregroundStyle(.white)
                    }

                    // PIN dots
                    HStack(spacing: 20) {
                        ForEach(0..<4, id: \.self) { index in
                            Circle()
                                .fill(dots[index] ? AppColors.accent : AppColors.surface)
                                .frame(width: 20, height: 20)
                                .overlay(
                                    Circle()
                                        .stroke(dots[index] ? AppColors.accent : AppColors.borderLight, lineWidth: 2)
                                )
                        }
                    }
                    .modifier(ShakeModifier(shake: shake))

                    // Error message
                    if let error {
                        Text(error)
                            .font(AppFonts.footnote)
                            .foregroundStyle(AppColors.error)
                            .transition(.opacity)
                    }

                    // Numpad
                    VStack(spacing: 12) {
                        ForEach(numpadRows, id: \.self) { row in
                            HStack(spacing: 12) {
                                ForEach(row, id: \.self) { key in
                                    numpadButton(key)
                                }
                            }
                        }
                    }

                    Spacer()
                }
                .padding()

                if isLoading {
                    Color.black.opacity(0.4).ignoresSafeArea()
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: pin)
            .animation(.easeInOut(duration: 0.2), value: error)
            .navigationTitle("Exit Kiosk")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Numpad

    private var numpadRows: [[String]] {
        [
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
            ["", "0", "⌫"],
        ]
    }

    @ViewBuilder
    private func numpadButton(_ key: String) -> some View {
        if key.isEmpty {
            Color.clear
                .frame(width: 80, height: 80)
        } else if key == "⌫" {
            Button {
                backspace()
            } label: {
                Image(systemName: "delete.backward")
                    .font(.system(size: 22, weight: .medium))
            }
            .buttonStyle(NumpadButtonStyle())
        } else {
            Button {
                Task { await appendDigit(key) }
            } label: {
                Text(key)
            }
            .buttonStyle(NumpadButtonStyle())
        }
    }

    // MARK: - PIN Logic

    private func appendDigit(_ digit: String) async {
        guard pin.count < 4 else { return }
        pin += digit
        error = nil

        guard pin.count == 4 else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            let employee = try await AuthService.login(pin: pin)
            dismiss()
            appState.exitKioskMode(employee: employee)
        } catch {
            self.error = "Invalid PIN"
            triggerShake()
            pin = ""
        }
    }

    private func backspace() {
        guard !pin.isEmpty else { return }
        pin.removeLast()
        error = nil
    }

    private func triggerShake() {
        shake = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(500))
            shake = false
        }
    }
}
