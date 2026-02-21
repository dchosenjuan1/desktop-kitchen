import SwiftUI

struct LoginScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = LoginViewModel()
    @State private var showServerConfig = false

    private let numpadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo & Header
                VStack(spacing: 12) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 112)
                        .onLongPressGesture(minimumDuration: 1) {
                            showServerConfig = true
                        }

                    Text("Juanberto's")
                        .font(.system(size: 48, weight: .black))
                        .tracking(-2)
                        .foregroundStyle(.white)

                    Text("California Burritos")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(AppColors.accent)
                        .tracking(-0.5)

                    Text("Employee Login")
                        .font(.system(size: 18))
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(.top, 4)
                }
                .padding(.bottom, 48)

                // PIN Dots
                pinDotsView
                    .padding(.bottom, 40)

                // Numpad
                numpadView
                    .padding(.bottom, 24)

                // Loading
                if viewModel.isLoading {
                    loadingView
                        .padding(.bottom, 24)
                }

                // Kitchen Display button
                Button("Kitchen Display") {
                    appState.navigate(to: .kitchen)
                }
                .buttonStyle(SecondaryButtonStyle())
                .frame(width: 200)

                Spacer()

                // Footer
                VStack(spacing: 4) {
                    Text("Tap a 4-digit PIN to login")
                    Text("POS System v1.0")
                }
                .font(.system(size: 12))
                .foregroundStyle(AppColors.textMuted)
                .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $showServerConfig) {
            ServerConfigSheet()
        }
    }

    // MARK: - PIN Dots

    private var pinDotsView: some View {
        HStack(spacing: 16) {
            ForEach(0..<4, id: \.self) { index in
                Circle()
                    .fill(viewModel.dots[index] ? AppColors.accent : AppColors.surface)
                    .frame(width: 24, height: 24)
                    .frame(width: 64, height: 64)
                    .background(AppColors.card)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(AppColors.borderLight, lineWidth: 2)
                    )
            }
        }
        .offset(x: viewModel.shake ? 10 : 0)
        .animation(
            viewModel.shake
                ? .default.repeatCount(3, autoreverses: true).speed(6)
                : .default,
            value: viewModel.shake
        )
        .overlay(alignment: .bottom) {
            if let error = viewModel.error {
                Text(error)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppColors.accentLight)
                    .padding(.top, 80)
            }
        }
    }

    // MARK: - Numpad

    private var numpadView: some View {
        VStack(spacing: 12) {
            // 3x3 grid for 1-9
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(80), spacing: 12), count: 3), spacing: 12) {
                ForEach(numpadDigits.prefix(9), id: \.self) { digit in
                    numpadButton(digit)
                }
            }

            // 0 row centered + back + clear
            HStack(spacing: 12) {
                Button(action: { viewModel.backspace() }) {
                    Text("Back")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 80, height: 64)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AppColors.borderLight, lineWidth: 1)
                        )
                }
                .disabled(viewModel.isLoading || viewModel.pin.isEmpty)

                numpadButton("0")

                Button(action: { viewModel.clear() }) {
                    Text("Clear")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 80, height: 64)
                        .background(AppColors.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .disabled(viewModel.isLoading)
            }
        }
    }

    private func numpadButton(_ digit: String) -> some View {
        Button {
            Task {
                if let employee = await viewModel.appendDigit(digit) {
                    appState.loginSucceeded(employee: employee)
                }
            }
        } label: {
            Text(digit)
                .font(AppFonts.pinDigit)
                .foregroundStyle(.white)
                .frame(width: 80, height: 80)
                .background(AppColors.card)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(AppColors.borderLight, lineWidth: 1)
                )
        }
        .disabled(viewModel.isLoading || viewModel.pin.count >= 4)
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(AppColors.accent)
                        .frame(width: 10, height: 10)
                        .offset(y: viewModel.isLoading ? -8 : 0)
                        .animation(
                            .easeInOut(duration: 0.5)
                                .repeatForever()
                                .delay(Double(i) * 0.2),
                            value: viewModel.isLoading
                        )
                }
            }
            Text("Logging in...")
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textSecondary)
        }
    }
}

// MARK: - Server Config Sheet

struct ServerConfigSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var url = ServerConfig.shared.baseURL
    @State private var testing = false
    @State private var testResult: Bool?

    var body: some View {
        NavigationStack {
            Form {
                Section("Server URL") {
                    TextField("http://192.168.x.x:3001/api", text: $url)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }

                Section {
                    Button {
                        Task {
                            testing = true
                            testResult = nil
                            ServerConfig.shared.baseURL = url
                            testResult = await APIClient.shared.testConnection()
                            testing = false
                        }
                    } label: {
                        HStack {
                            Text("Test Connection")
                            Spacer()
                            if testing {
                                ProgressView()
                            } else if let result = testResult {
                                Image(systemName: result ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundStyle(result ? .green : .red)
                            }
                        }
                    }
                    .disabled(testing)
                }

                Section {
                    Button("Reset to Default") {
                        ServerConfig.shared.reset()
                        url = ServerConfig.shared.baseURL
                        testResult = nil
                    }
                    .foregroundStyle(.red)
                }
            }
            .navigationTitle("Server Configuration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        ServerConfig.shared.baseURL = url
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
