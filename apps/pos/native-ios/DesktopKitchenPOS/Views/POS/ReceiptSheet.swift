import SwiftUI

struct ReceiptSheet: View {
    let order: Order
    let onDone: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Receipt header
                    VStack(spacing: 8) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(height: 48)

                        Text("Juanberto's")
                            .font(.system(size: 24, weight: .black))
                            .tracking(-1)

                        Text("California Burritos")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    .padding(24)

                    Divider()

                    // Order info
                    VStack(spacing: 4) {
                        Text("Order #\(order.order_number)")
                            .font(.system(size: 18, weight: .bold))

                        if let createdAt = order.created_at, let date = DateFormatters.parseISO(createdAt) {
                            Text(DateFormatters.dateTime.string(from: date))
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }

                        if let name = order.employee_name {
                            Text("Cashier: \(name)")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(16)

                    Divider()

                    // Items
                    if let items = order.items {
                        VStack(spacing: 8) {
                            ForEach(items) { item in
                                HStack(alignment: .top) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.item_name)
                                            .font(.system(size: 14, weight: .semibold))
                                        if let notes = item.notes, !notes.isEmpty {
                                            Text(notes)
                                                .font(.system(size: 12))
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                    Text("\(item.quantity)x \(CurrencyFormatter.formatShort(item.unit_price ?? 0))")
                                        .font(.system(size: 14))
                                }
                            }
                        }
                        .padding(16)

                        Divider()
                    }

                    // Totals
                    VStack(spacing: 8) {
                        totalRow("Subtotal:", CurrencyFormatter.formatShort(order.subtotal ?? 0))
                        totalRow(CurrencyFormatter.taxLabel + ":", CurrencyFormatter.formatShort(order.tax ?? 0))
                        if (order.tip ?? 0) > 0 {
                            totalRow("Tip:", CurrencyFormatter.formatShort(order.tip ?? 0))
                        }
                    }
                    .padding(16)

                    Divider()

                    // Grand total
                    Text("Total: \(CurrencyFormatter.formatShort(order.total ?? 0))")
                        .font(.system(size: 24, weight: .bold))
                        .padding(24)

                    Divider()

                    // Thank you
                    VStack(spacing: 4) {
                        Text("Thank You!")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(AppColors.accent)
                        Text("Please come again")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    .padding(24)
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: onDone)
                        .fontWeight(.bold)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func totalRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
        }
    }
}
