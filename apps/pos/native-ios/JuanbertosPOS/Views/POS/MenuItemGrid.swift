import SwiftUI

struct MenuItemGrid: View {
    let items: [MenuItem]
    let employeeName: String
    let currentTime: Date
    @Binding var searchQuery: String
    let onItemTap: (MenuItem) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            headerBar

            // Search bar
            searchBar

            // Items grid
            if items.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(items) { item in
                            MenuItemCard(item: item, onTap: { onItemTap(item) })
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(AppColors.background)
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Operator")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.textTertiary)
                Text(employeeName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 2) {
                Text("Time")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.textTertiary)
                Text(currentTime, style: .time)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)

            VStack(alignment: .trailing, spacing: 2) {
                Text("Date")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.textTertiary)
                Text(currentTime, format: .dateTime.month(.abbreviated).day())
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(16)
        .background(AppColors.card)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }

    // MARK: - Search

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AppColors.textTertiary)
            TextField("Search items...", text: $searchQuery)
                .foregroundStyle(.white)
                .autocorrectionDisabled()
            if !searchQuery.isEmpty {
                Button { searchQuery = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AppColors.textTertiary)
                }
            }
        }
        .padding(12)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(AppColors.borderLight, lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.card)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("No items found")
                .font(.system(size: 18))
                .foregroundStyle(AppColors.textTertiary)
            Spacer()
        }
    }
}

// MARK: - Menu Item Card

struct MenuItemCard: View {
    let item: MenuItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                Text(item.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                Text(CurrencyFormatter.formatShort(item.price))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppColors.accentLight)
            }
            .padding(16)
            .frame(height: 128)
            .frame(maxWidth: .infinity)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppColors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
