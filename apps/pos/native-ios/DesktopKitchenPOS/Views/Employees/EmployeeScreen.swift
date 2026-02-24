import SwiftUI

struct EmployeeScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = EmployeeViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { appState.navigate(to: .admin) } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    Text("Employees")
                        .font(AppFonts.title2)
                        .foregroundStyle(.white)

                    Spacer()

                    Button { vm.openAddSheet() } label: {
                        Label("Add Employee", systemImage: "plus")
                            .font(AppFonts.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(AppColors.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

                Divider().background(AppColors.border)

                if vm.isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if vm.employees.isEmpty {
                    Spacer()
                    Text("No employees found")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(vm.employees) { emp in
                                employeeRow(emp)
                                Divider().background(AppColors.border)
                            }
                        }
                    }
                }

                if let error = vm.error {
                    Text(error)
                        .font(AppFonts.footnote)
                        .foregroundStyle(AppColors.error)
                        .padding(8)
                }
            }
        }
        .task { await vm.loadData() }
        .sheet(isPresented: Bindable(vm).showSheet) {
            employeeFormSheet
        }
    }

    // MARK: - Employee Row

    private func employeeRow(_ emp: Employee) -> some View {
        HStack(spacing: 16) {
            // Avatar
            Circle()
                .fill(roleColor(emp.role))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(emp.name.prefix(1)).uppercased())
                        .font(AppFonts.headline)
                        .foregroundStyle(.white)
                )

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(emp.name)
                    .font(AppFonts.headline)
                    .foregroundStyle(emp.active ? .white : AppColors.textMuted)
                Text(emp.role.displayName)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
            }

            // Role badge
            Text(emp.role.displayName)
                .font(AppFonts.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(roleColor(emp.role))
                .clipShape(Capsule())

            if !emp.active {
                Text("Inactive")
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textMuted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppColors.surface)
                    .clipShape(Capsule())
            }

            Spacer()

            // PIN toggle
            if vm.showPinId == emp.id {
                Text(emp.pin ?? "****")
                    .font(.system(size: 15, design: .monospaced))
                    .foregroundStyle(AppColors.warning)
                Button {
                    vm.showPinId = nil
                } label: {
                    Image(systemName: "eye.slash")
                        .foregroundStyle(AppColors.textTertiary)
                }
            } else {
                Text("****")
                    .font(.system(size: 15, design: .monospaced))
                    .foregroundStyle(AppColors.textTertiary)
                Button {
                    vm.showPinId = emp.id
                } label: {
                    Image(systemName: "eye")
                        .foregroundStyle(AppColors.textTertiary)
                }
            }

            // Actions
            Button { vm.openEditSheet(employee: emp) } label: {
                Image(systemName: "pencil")
                    .foregroundStyle(AppColors.info)
            }
            .padding(.leading, 8)

            Button {
                Task { await vm.toggleEmployee(id: emp.id) }
            } label: {
                Image(systemName: emp.active ? "pause.circle" : "play.circle")
                    .foregroundStyle(emp.active ? AppColors.warning : AppColors.success)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    // MARK: - Form Sheet

    private var employeeFormSheet: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    // Name
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Name")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("Employee name", text: Bindable(vm).formName)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        if let err = vm.formErrors["name"] {
                            Text(err)
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.error)
                        }
                    }

                    // PIN
                    VStack(alignment: .leading, spacing: 6) {
                        Text("PIN (4 digits)")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("1234", text: Bindable(vm).formPin)
                            .keyboardType(.numberPad)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        if let err = vm.formErrors["pin"] {
                            Text(err)
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.error)
                        }
                    }

                    // Role
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Role")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Picker("Role", selection: Bindable(vm).formRole) {
                            ForEach(EmployeeRole.allCases, id: \.self) { role in
                                Text(role.displayName).tag(role)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    Spacer()

                    Button {
                        Task { await vm.saveEmployee() }
                    } label: {
                        Text(vm.sheetMode.title)
                    }
                    .buttonStyle(PrimaryButtonStyle(isDisabled: vm.actionLoading))
                    .disabled(vm.actionLoading)
                }
                .padding(20)
            }
            .navigationTitle(vm.sheetMode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { vm.showSheet = false }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helpers

    private func roleColor(_ role: EmployeeRole) -> Color {
        switch role {
        case .admin: return AppColors.roleAdmin
        case .manager: return AppColors.roleManager
        case .kitchen: return AppColors.roleKitchen
        case .cashier: return AppColors.roleCashier
        }
    }
}
