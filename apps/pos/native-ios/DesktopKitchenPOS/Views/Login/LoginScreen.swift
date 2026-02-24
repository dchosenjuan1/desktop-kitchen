import SwiftUI

struct LoginScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = LoginViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                // Logo / Title
                VStack(spacing: 12) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(AppColors.accent)

                    Text("Desktop Kitchen POS")
                        .font(AppFonts.largeTitle)
                        .foregroundStyle(.white)

                    Text("Enter your 4-digit PIN")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                }

                // PIN dots
                HStack(spacing: 20) {
                    ForEach(0..<4, id: \.self) { index in
                        Circle()
                            .fill(vm.dots[index] ? AppColors.accent : AppColors.surface)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Circle()
                                    .stroke(vm.dots[index] ? AppColors.accent : AppColors.borderLight, lineWidth: 2)
                            )
                    }
                }
                .modifier(ShakeModifier(shake: vm.shake))

                // Error message
                if let error = vm.error {
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

                // Server config hint
                Text("Server: \(ServerConfig.shared.baseURL)")
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textMuted)
                    .padding(.bottom, 20)
            }
            .padding()

            if vm.isLoading {
                Color.black.opacity(0.4).ignoresSafeArea()
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: vm.pin)
        .animation(.easeInOut(duration: 0.2), value: vm.error)
    }

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
                vm.backspace()
            } label: {
                Image(systemName: "delete.backward")
                    .font(.system(size: 22, weight: .medium))
            }
            .buttonStyle(NumpadButtonStyle())
        } else {
            Button {
                Task {
                    if let employee = await vm.appendDigit(key) {
                        appState.loginSucceeded(employee: employee)
                    }
                }
            } label: {
                Text(key)
            }
            .buttonStyle(NumpadButtonStyle())
        }
    }
}

// MARK: - Shake Modifier

private struct ShakeModifier: ViewModifier {
    var shake: Bool

    func body(content: Content) -> some View {
        content
            .offset(x: shake ? -6 : 0)
            .animation(
                shake
                    ? .default.repeatCount(3, autoreverses: true).speed(6)
                    : .default,
                value: shake
            )
    }
}
