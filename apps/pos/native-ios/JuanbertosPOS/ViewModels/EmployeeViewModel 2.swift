import Foundation

@Observable
final class EmployeeViewModel {
    var employees: [Employee] = []
    var isLoading = true
    var error: String?
    var actionLoading = false

    // Sheet state
    var showSheet = false
    var sheetMode: SheetMode = .add
    var editingId: Int?

    // Form
    var formName = ""
    var formPin = ""
    var formRole: EmployeeRole = .cashier
    var formErrors: [String: String] = [:]

    // PIN visibility
    var showPinId: Int?

    func loadData() async {
        isLoading = true
        do {
            employees = try await EmployeeService.getAll()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func openAddSheet() {
        formName = ""
        formPin = ""
        formRole = .cashier
        formErrors = [:]
        editingId = nil
        sheetMode = .add
        showSheet = true
    }

    func openEditSheet(employee: Employee) {
        formName = employee.name
        formPin = employee.pin ?? ""
        formRole = employee.role
        formErrors = [:]
        editingId = employee.id
        sheetMode = .edit
        showSheet = true
    }

    func validateForm() -> Bool {
        formErrors = [:]
        if formName.trimmingCharacters(in: .whitespaces).isEmpty {
            formErrors["name"] = "Name is required"
        }
        if formPin.isEmpty {
            formErrors["pin"] = "PIN is required"
        } else if formPin.count != 4 || !formPin.allSatisfy(\.isNumber) {
            formErrors["pin"] = "PIN must be exactly 4 digits"
        }
        return formErrors.isEmpty
    }

    func saveEmployee() async {
        guard validateForm() else { return }
        actionLoading = true
        do {
            if sheetMode == .add {
                _ = try await EmployeeService.create(name: formName, pin: formPin, role: formRole.rawValue)
            } else if let id = editingId {
                try await EmployeeService.update(id: id, name: formName, pin: formPin, role: formRole.rawValue)
            }
            await loadData()
            showSheet = false
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        actionLoading = false
    }

    func toggleEmployee(id: Int) async {
        do {
            try await EmployeeService.toggle(id: id)
            await loadData()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    enum SheetMode {
        case add, edit
        var title: String {
            switch self {
            case .add: return "Add Employee"
            case .edit: return "Edit Employee"
            }
        }
    }
}
