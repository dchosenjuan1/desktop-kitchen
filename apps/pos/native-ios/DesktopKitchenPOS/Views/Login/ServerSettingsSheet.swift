import SwiftUI

struct ServerSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var baseURL: String
    @State private var tenantID: String
    @State private var adminSecret: String
    @State private var testResult: TestResult?
    @State private var isTesting = false

    init() {
        let config = ServerConfig.shared
        _baseURL = State(initialValue: config.baseURL)
        _tenantID = State(initialValue: config.tenantID)
        _adminSecret = State(initialValue: config.adminSecret)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        field(label: "Server URL", text: $baseURL, placeholder: "https://pos.desktop.kitchen")
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        field(label: "Tenant ID", text: $tenantID, placeholder: "apple-demo")
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Admin Secret")
                                .font(AppFonts.subheadline)
                                .foregroundStyle(AppColors.textSecondary)
                            SecureField("Required for production", text: $adminSecret)
                                .foregroundStyle(.white)
                                .padding(12)
                                .background(AppColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        // Test & Save button
                        Button {
                            Task { await testAndSave() }
                        } label: {
                            HStack(spacing: 8) {
                                if isTesting {
                                    ProgressView().tint(.white)
                                }
                                Text(isTesting ? "Testing..." : "Save & Test Connection")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(PrimaryButtonStyle(isDisabled: isTesting))
                        .disabled(isTesting)

                        if let result = testResult {
                            HStack(spacing: 6) {
                                Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                                Text(result.message)
                            }
                            .font(AppFonts.footnote)
                            .foregroundStyle(result.success ? AppColors.success : AppColors.error)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Server Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func field(label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(AppFonts.subheadline)
                .foregroundStyle(AppColors.textSecondary)
            TextField(placeholder, text: text)
                .foregroundStyle(.white)
                .padding(12)
                .background(AppColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func save() {
        let config = ServerConfig.shared
        config.baseURL = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        config.tenantID = tenantID.trimmingCharacters(in: .whitespacesAndNewlines)
        config.adminSecret = adminSecret.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func testAndSave() async {
        isTesting = true
        testResult = nil

        // Save settings first so they persist regardless
        save()

        let success = await APIClient.shared.testConnection()

        testResult = TestResult(
            success: success,
            message: success ? "Saved — connected successfully!" : "Settings saved but connection failed — check URL and credentials"
        )
        isTesting = false

        if success {
            try? await Task.sleep(for: .seconds(1))
            dismiss()
        }
    }
}

private struct TestResult {
    let success: Bool
    let message: String
}
