import SwiftUI

struct CategorySidebar: View {
    let categories: [MenuCategory]
    @Binding var selectedId: Int?
    let onAdminTap: () -> Void
    let onKitchenTap: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Logo header
            VStack(spacing: 4) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 32)
                Text("Categories")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(AppColors.background)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppColors.border).frame(height: 1)
            }

            // Category list
            ScrollView {
                LazyVStack(spacing: 0) {
                    // "All Items" button
                    Button {
                        selectedId = nil
                    } label: {
                        Text("All Items")
                    }
                    .buttonStyle(CategoryButtonStyle(isSelected: selectedId == nil))

                    ForEach(categories) { category in
                        Button {
                            selectedId = category.id
                        } label: {
                            Text(category.name)
                        }
                        .buttonStyle(CategoryButtonStyle(isSelected: selectedId == category.id))
                    }
                }
            }

            // Footer buttons
            VStack(spacing: 8) {
                Button(action: onAdminTap) {
                    Text("Admin")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(AppColors.borderLight, lineWidth: 1)
                        )
                }

                Button(action: onKitchenTap) {
                    Text("Kitchen")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(AppColors.borderLight, lineWidth: 1)
                        )
                }
            }
            .padding(12)
            .overlay(alignment: .top) {
                Rectangle().fill(AppColors.border).frame(height: 1)
            }
        }
        .background(AppColors.card)
        .overlay(alignment: .trailing) {
            Rectangle().fill(AppColors.border).frame(width: 1)
        }
    }
}
