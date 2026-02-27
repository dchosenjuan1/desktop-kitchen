import SwiftUI

struct CategoryPillsView: View {
    let categories: [MenuCategory]
    let selectedCategoryId: Int?
    let onSelect: (Int?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button { onSelect(nil) } label: {
                    Text("All")
                }
                .buttonStyle(CategoryPillStyle(isSelected: selectedCategoryId == nil))

                ForEach(categories) { cat in
                    Button { onSelect(cat.id) } label: {
                        Text(cat.name)
                    }
                    .buttonStyle(CategoryPillStyle(isSelected: selectedCategoryId == cat.id))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }
}
