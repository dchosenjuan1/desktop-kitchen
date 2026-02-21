import SwiftUI

struct EmployeeScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = EmployeeViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                screenHeader(title: "Employees") {
                    appState.navigate(to: .admin)
                }
                Spacer()
                Button {
                    viewModel.openAddSheet()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Add Employee")
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(AppColors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.trailing, 24)
            }
            .background(AppColors.card)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppColors.border).frame(height: 1)
            }

            ScrollView {
                VStack(spacing: 12) {
                    if let error = viewModel.error {
                        errorCard(error)
                    }

                    if viewModel.isLoading {
                        ForEach(0..<5, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 12)
                                .fill(AppColors.card)
                                .frame(height: 80)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border, lineWidth: 1))
                        }
                    } else if viewModel.employees.isEmpty {
                        emptyState
                    } else {
                        ForEach(viewModel.employees) { employee in
                            employeeRow(employee)
                        }
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .task { await viewModel.loadData() }
        .sheet(isPresented: $viewModel.showSheet) {
            EmployeeFormSheet(viewModel: viewModel)
        }
    }

    // MARK: - Employee Row

    private func employeeRow(_ employee: Employee) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 12) {
                    Text(employee.name)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)

                    roleBadge(employee.role)

                    if !employee.active {
                        Text("Inactive")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(AppColors.borderLight)
                            .clipShape(Capsule())
                    }
                }

                HStack(spacing: 8) {
                    Text("PIN: \(viewModel.showPinId == employee.id ? (employee.pin ?? "????") : "****")")
                        .font(.system(size: 14))
                        .foregroundStyle(AppColors.textSecondary)

                    Button {
                        viewModel.showPinId = viewModel.showPinId == employee.id ? nil : employee.id
                    } label: {
                        Image(systemName: viewModel.showPinId == employee.id ? "eye.slash" : "eye")
                            .font(.system(size: 14))
                            .foregroundStyle(AppColors.accentLight)
                    }
                }
            }

            Spacer()

            HStack(spacing: 12) {
                Button { viewModel.openEditSheet(employee: employee) } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 18))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(width: 44, height: 44)
                        .background(AppColors.surface.opacity(0.01))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    Task { await viewModel.toggleEmployee(id: employee.id) }
                } label: {
                    Text(employee.active ? "Deactivate" : "Activate")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(employee.active ? AppColors.accentLight : AppColors.successLight)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(employee.active ? AppColors.accent.opacity(0.2) : AppColors.success.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(employee.active ? Color(hex: 0x991B1B) : Color(hex: 0x166534), lineWidth: 1)
                        )
                }
            }
        }
        .padding(24)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppColors.border, lineWidth: 1)
        )
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(employee.active ? AppColors.success : AppColors.borderLight)
                .frame(width: 4)
                .clipShape(RoundedRectangle(cornerRadius: 2))
        }
        .opacity(employee.active ? 1 : 0.6)
    }

    private func roleBadge(_ role: EmployeeRole) -> some View {
        let (bg, fg, border) = roleBadgeColors(role)
        return Text(role.displayName)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(fg)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(bg)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(border, lineWidth: 1))
    }

    private func roleBadgeColors(_ role: EmployeeRole) -> (Color, Color, Color) {
        switch role {
        case .admin: return (AppColors.accent.opacity(0.2), AppColors.accentLight, Color(hex: 0x991B1B))
        case .manager: return (Color(hex: 0x9333EA).opacity(0.2), Color(hex: 0xC084FC), Color(hex: 0x6B21A8))
        case .kitchen: return (AppColors.info.opacity(0.2), Color(hex: 0x60A5FA), Color(hex: 0x1E40AF))
        case .cashier: return (AppColors.success.opacity(0.2), AppColors.successLight, Color(hex: 0x166534))
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.textMuted)
            Text("No employees yet")
                .foregroundStyle(AppColors.textSecondary)
            Button { viewModel.openAddSheet() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("Add First Employee")
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(AppColors.accent)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(48)
        .cardStyle()
    }
}

// MARK: - Employee Form Sheet

struct EmployeeFormSheet: View {
    @Bindable var viewModel: EmployeeViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Employee name", text: $viewModel.formName)
                    if let error = viewModel.formErrors["name"] {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }

                Section("PIN (4 digits)") {
                    TextField("0000", text: $viewModel.formPin)
                        .keyboardType(.numberPad)
                        .onChange(of: viewModel.formPin) { _, newValue in
                            viewModel.formPin = String(newValue.filter(\.isNumber).prefix(4))
                        }
                    if let error = viewModel.formErrors["pin"] {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }

                Section("Role") {
                    Picker("Role", selection: $viewModel.formRole) {
                        ForEach(EmployeeRole.allCases, id: \.self) { role in
                            Text(role.displayName).tag(role)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle(viewModel.sheetMode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(viewModel.sheetMode == .add ? "Add" : "Save") {
                        Task { await viewModel.saveEmployee() }
                    }
                    .disabled(viewModel.actionLoading)
                    .fontWeight(.bold)
                }
            }
        }
    }
}
