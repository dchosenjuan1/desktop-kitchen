import SwiftUI

struct MenuGridView: View {
    let items: [MenuItem]
    let isLoading: Bool
    let itemHasModifiers: (Int) -> Bool
    let onItemTap: (MenuItem) -> Void

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                Spacer()
                ProgressView().tint(.white)
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 12)], spacing: 12) {
                        ForEach(items) { item in
                            MenuItemCard(
                                item: item,
                                hasModifiers: itemHasModifiers(item.id),
                                onTap: { onItemTap(item) }
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
        }
    }
}
