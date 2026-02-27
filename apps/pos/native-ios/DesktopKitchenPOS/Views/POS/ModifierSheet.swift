import SwiftUI

struct ModifierSheet: View {
    let item: MenuItem
    let groups: [ModifierGroup]
    let onAdd: ([Int]) -> Void // selected modifier IDs
    @Environment(\.dismiss) private var dismiss
    @State private var selections: [Int: Set<Int>] = [:] // groupId → modifier IDs

    private var allModifiers: [Modifier] {
        groups.flatMap { $0.modifiers ?? [] }
    }

    private var selectedModifierTotal: Double {
        let selectedIds = Set(selections.values.flatMap { $0 })
        return allModifiers
            .filter { selectedIds.contains($0.id) }
            .reduce(0.0) { $0 + $1.price_adjustment }
    }

    private var totalPrice: Double {
        item.price + selectedModifierTotal
    }

    private var isValid: Bool {
        groups.allSatisfy { group in
            let count = selections[group.id]?.count ?? 0
            if group.required {
                return count >= max(group.min_selections, 1)
            }
            return true
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Item header
                            VStack(spacing: 4) {
                                Text(item.name)
                                    .font(AppFonts.title3)
                                    .foregroundStyle(.white)
                                Text(CurrencyFormatter.format(item.price))
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(AppColors.textSecondary)
                            }
                            .padding(.top, 12)

                            ForEach(groups) { group in
                                modifierGroupSection(group)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }

                    // Sticky bottom button
                    VStack(spacing: 0) {
                        Divider().background(AppColors.border)
                        Button {
                            let allSelected = Array(selections.values.flatMap { $0 })
                            onAdd(allSelected)
                        } label: {
                            Text("Add to Order — \(CurrencyFormatter.format(totalPrice))")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(isValid ? AppColors.accent : AppColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(!isValid)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                    }
                    .background(AppColors.card)
                }
            }
            .navigationTitle("Customize")
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

    // MARK: - Group Section

    private func modifierGroupSection(_ group: ModifierGroup) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(group.name)
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)

                if group.required {
                    Text("Required")
                        .font(AppFonts.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(AppColors.warning)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(AppColors.warning.opacity(0.15))
                        .clipShape(Capsule())
                }

                Spacer()

                let hint = group.selection_type == .single
                    ? "Pick 1"
                    : (group.max_selections > 0 ? "Up to \(group.max_selections)" : "Pick any")
                Text(hint)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
            }

            ForEach(group.modifiers ?? []) { modifier in
                modifierRow(modifier, group: group)
            }
        }
        .padding(14)
        .cardStyle()
    }

    // MARK: - Modifier Row

    private func modifierRow(_ modifier: Modifier, group: ModifierGroup) -> some View {
        let isSelected = selections[group.id]?.contains(modifier.id) ?? false
        let iconName: String = {
            if group.selection_type == .single {
                return isSelected ? "circle.inset.filled" : "circle"
            }
            return isSelected ? "checkmark.square.fill" : "square"
        }()

        return Button {
            toggleModifier(modifier, in: group)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: iconName)
                    .foregroundStyle(isSelected ? AppColors.accent : AppColors.textTertiary)
                    .font(.system(size: 22))
                    .frame(width: 28, height: 44)

                Text(modifier.name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)

                Spacer()

                if modifier.price_adjustment != 0 {
                    let prefix = modifier.price_adjustment > 0 ? "+" : ""
                    Text("\(prefix)\(CurrencyFormatter.formatShort(modifier.price_adjustment))")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Toggle Logic

    private func toggleModifier(_ modifier: Modifier, in group: ModifierGroup) {
        var selected = selections[group.id] ?? []

        if group.selection_type == .single {
            // Radio behavior: exactly one
            if selected.contains(modifier.id) {
                if !group.required { selected.removeAll() }
            } else {
                selected = [modifier.id]
            }
        } else {
            // Checkbox behavior
            if selected.contains(modifier.id) {
                selected.remove(modifier.id)
            } else {
                if group.max_selections > 0, selected.count >= group.max_selections {
                    return // at max
                }
                selected.insert(modifier.id)
            }
        }

        selections[group.id] = selected
    }
}
