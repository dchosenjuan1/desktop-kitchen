import SwiftUI

struct DeliveryOrdersBanner: View {
    let deliveryOrders: [DeliveryOrder]
    @State private var isExpanded = false

    var body: some View {
        if !deliveryOrders.isEmpty {
            VStack(spacing: 0) {
                // Tap to expand/collapse header
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "bicycle")
                            .foregroundStyle(AppColors.info)
                        Text("\(deliveryOrders.count) delivery order\(deliveryOrders.count == 1 ? "" : "s")")
                            .font(AppFonts.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppColors.textTertiary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(AppColors.info.opacity(0.1))
                }
                .buttonStyle(.plain)

                if isExpanded {
                    VStack(spacing: 0) {
                        ForEach(deliveryOrders) { order in
                            deliveryOrderRow(order)
                            if order.id != deliveryOrders.last?.id {
                                Divider().background(AppColors.border)
                            }
                        }
                    }
                    .background(AppColors.card)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }

                Divider().background(AppColors.border)
            }
        }
    }

    private func deliveryOrderRow(_ order: DeliveryOrder) -> some View {
        HStack(spacing: 10) {
            platformBadge(order.platform_id)

            VStack(alignment: .leading, spacing: 2) {
                Text(order.customer_name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("#\(order.external_order_id)")
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
            }

            Spacer()

            Text(order.platform_status.capitalized)
                .font(AppFonts.caption)
                .fontWeight(.semibold)
                .foregroundStyle(AppColors.info)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(AppColors.info.opacity(0.15))
                .clipShape(Capsule())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private func platformBadge(_ platformId: Int) -> some View {
        let (name, color): (String, Color) = {
            switch platformId {
            case 1: return ("UE", Color(hex: 0x06C167))  // Uber Eats green
            case 2: return ("R", Color(hex: 0xFF441F))   // Rappi orange
            case 3: return ("DD", Color(hex: 0xFF6600))  // DiDi Food orange
            default: return ("?", AppColors.textMuted)
            }
        }()

        return Text(name)
            .font(AppFonts.caption)
            .fontWeight(.black)
            .foregroundStyle(.white)
            .frame(width: 30, height: 30)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}
