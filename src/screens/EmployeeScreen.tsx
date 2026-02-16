import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit2,
  X,
  Check,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployee
} from '../api';
import { Employee } from '../types';

type ModalMode = 'add' | 'edit' | null;
type RoleType = 'cashier' | 'kitchen' | 'manager' | 'admin';

interface FormData {
  name: string;
  pin: string;
  role: RoleType;
}

export default function EmployeeScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    pin: '',
    role: 'cashier',
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [showPin, setShowPin] = useState<number | null>(null);

  const roles: RoleType[] = ['cashier', 'kitchen', 'manager', 'admin'];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.pin) {
      errors.pin = 'PIN is required';
    } else if (!/^\d{4}$/.test(formData.pin)) {
      errors.pin = 'PIN must be exactly 4 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading(true);
      setError(null);
      await createEmployee(formData);
      await fetchEmployees();
      setModalMode(null);
      setFormData({ name: '', pin: '', role: 'cashier' });
      setFormErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!editingId) return;
    if (!validateForm()) return;

    try {
      setActionLoading(true);
      setError(null);
      await updateEmployee(editingId, formData);
      await fetchEmployees();
      setModalMode(null);
      setEditingId(null);
      setFormData({ name: '', pin: '', role: 'cashier' });
      setFormErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEmployee = async (id: number) => {
    try {
      setError(null);
      await toggleEmployee(id);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle employee');
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', pin: '', role: 'cashier' });
    setFormErrors({});
    setEditingId(null);
    setModalMode('add');
  };

  const openEditModal = (employee: Employee) => {
    setFormData({
      name: employee.name,
      pin: employee.pin || '',
      role: employee.role,
    });
    setFormErrors({});
    setEditingId(employee.id);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData({ name: '', pin: '', role: 'cashier' });
    setFormErrors({});
  };

  const getRoleBadgeColor = (role: RoleType) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600/20 text-red-400 border border-red-800';
      case 'manager':
        return 'bg-purple-600/20 text-purple-400 border border-purple-800';
      case 'kitchen':
        return 'bg-blue-600/20 text-blue-400 border border-blue-800';
      case 'cashier':
        return 'bg-green-600/20 text-green-400 border border-green-800';
      default:
        return 'bg-neutral-600/20 text-neutral-400 border border-neutral-700';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <img src="/logo.png" alt="Juanberto's" className="h-8" />
            <h1 className="text-3xl font-black tracking-tighter">Employees</h1>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <Plus size={20} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse"
              ></div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
            <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
            <p className="text-neutral-400 mb-6">No employees yet</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors inline-flex items-center gap-2 min-h-[44px]"
            >
              <Plus size={20} />
              Add First Employee
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`bg-neutral-900 p-6 rounded-lg border transition-all ${
                  employee.active
                    ? 'border-neutral-800 border-l-4 border-l-green-500'
                    : 'border-neutral-800 border-l-4 border-l-neutral-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {employee.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(
                          employee.role
                        )}`}
                      >
                        {employee.role}
                      </span>
                      {!employee.active && (
                        <span className="px-3 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-neutral-400 text-sm">
                      <span>
                        PIN: {showPin === employee.id ? employee.pin : '****'}
                      </span>
                      <button
                        onClick={() =>
                          setShowPin(
                            showPin === employee.id ? null : employee.id
                          )
                        }
                        className="text-red-500 hover:text-red-400"
                      >
                        {showPin === employee.id ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="p-3 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleToggleEmployee(employee.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] flex items-center justify-center ${
                        employee.active
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-800'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-800'
                      }`}
                    >
                      {employee.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {modalMode === 'add' ? 'Add Employee' : 'Edit Employee'}
              </h2>
              <button
                onClick={closeModal}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Employee name"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                {formErrors.name && (
                  <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  PIN (4 digits)
                </label>
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, pin: value });
                  }}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 tracking-widest text-center text-lg"
                />
                {formErrors.pin && (
                  <p className="text-red-400 text-sm mt-1">{formErrors.pin}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as RoleType,
                    })
                  }
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors font-medium min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={
                  modalMode === 'add'
                    ? handleAddEmployee
                    : handleEditEmployee
                }
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Check size={20} />
                {modalMode === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
