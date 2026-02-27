import SwiftUI

struct MenuItemCard: View {
    let item: MenuItem
    let hasModifiers: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            VStack(spacing: 0) {
                // Image
                if let imageUrl = item.image_url, let url = URL(string: imageUrl) {
                    CachedAsyncImage(url: url, placeholderIcon: "fork.knife")
                        .frame(height: 90)
                        .frame(maxWidth: .infinity)
                        .clipped()
                } else {
                    ZStack {
                        AppColors.surface
                        Image(systemName: "fork.knife")
                            .font(.system(size: 24))
                            .foregroundStyle(AppColors.textMuted)
                    }
                    .frame(height: 90)
                    .frame(maxWidth: .infinity)
                }

                // Name + price + modifier badge
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text(item.name)
                            .font(AppFonts.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)

                        if hasModifiers {
                            Image(systemName: "slider.horizontal.3")
                                .font(.system(size: 10))
                                .foregroundStyle(AppColors.textTertiary)
                        }
                    }

                    Text(CurrencyFormatter.format(item.price))
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.accentLight)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}
