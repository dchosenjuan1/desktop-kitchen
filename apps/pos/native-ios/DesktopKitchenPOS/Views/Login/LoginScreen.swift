import SwiftUI

struct LoginScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = LoginViewModel()
    @State private var showSettings = false

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
                Button { showSettings = true } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "gearshape")
                        Text(ServerConfig.shared.baseURL)
                    }
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textMuted)
                }
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
        .sheet(isPresented: $showSettings) {
            ServerSettingsSheet()
        }
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

// ShakeModifier moved to Components/ShakeModifier.swift
