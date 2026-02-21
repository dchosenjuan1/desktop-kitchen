import SwiftUI

struct NotesSheet: View {
    let item: CartItem
    let onSave: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var notes: String

    init(item: CartItem, onSave: @escaping (String) -> Void) {
        self.item = item
        self.onSave = onSave
        _notes = State(initialValue: item.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 4) {
                    Text("Special Instructions")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                    Text(item.item_name)
                        .font(.system(size: 16))
                        .foregroundStyle(Color(hex: 0xFCA5A5))
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(AppColors.accent)

                // Text editor
                TextEditor(text: $notes)
                    .scrollContentBackground(.hidden)
                    .font(.system(size: 18))
                    .foregroundStyle(.white)
                    .padding(16)
                    .frame(height: 140)
                    .background(AppColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppColors.borderLight, lineWidth: 1)
                    )
                    .padding(24)
                    .overlay(alignment: .topLeading) {
                        if notes.isEmpty {
                            Text("e.g., No onions, extra sauce, light cheese...")
                                .foregroundStyle(AppColors.textTertiary)
                                .padding(.top, 44)
                                .padding(.leading, 40)
                                .allowsHitTesting(false)
                        }
                    }

                // Buttons
                HStack(spacing: 12) {
                    Button("Cancel") { dismiss() }
                        .buttonStyle(SecondaryButtonStyle())

                    Button("Save") {
                        onSave(notes)
                        dismiss()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .padding(24)

                Spacer()
            }
            .background(AppColors.card)
        }
        .presentationDetents([.medium])
    }
}
