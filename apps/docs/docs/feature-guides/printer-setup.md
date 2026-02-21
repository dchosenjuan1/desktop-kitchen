---
sidebar_position: 9
slug: /feature-guides/printer-setup
title: Printer Setup
---

# Printer Setup

Configure receipt printers for POS terminals, kitchen stations, and bar stations.

## Supported Printers

- **ESC/POS compatible** thermal receipt printers
- Connection: Network (recommended) or USB
- Paper widths: 58mm and 80mm

## Adding a Printer

1. Go to **Settings** > **Printers**
2. Tap **Add Printer**
3. Enter:
   - **Name**: Descriptive name (e.g., "Kitchen Printer", "Bar Printer")
   - **IP Address**: The printer's network address
   - **Port**: Default is 9100 for most network printers
   - **Paper width**: 58mm or 80mm
4. Tap **Test Print** to verify the connection
5. Save

## Station Assignment

Assign printers to specific stations:

| Station | Prints |
|---------|--------|
| **POS** | Customer receipts |
| **Kitchen** | Order tickets (food items) |
| **Bar** | Order tickets (drink items) |

An order may trigger prints to multiple stations — food items go to the kitchen printer, drink items go to the bar printer, and the customer gets a receipt.

## Troubleshooting

### Printer Not Responding
1. Verify the printer is powered on and connected to the network
2. Check the IP address is correct
3. Ensure port 9100 is not blocked by your network firewall
4. Try printing a test page from the printer's built-in controls

### Cut or Alignment Issues
- Check paper width setting matches your actual paper roll
- Ensure paper is loaded correctly and not jammed
- Clean the print head if output is faded

### Network Tips
- Assign a **static IP** to your printer to prevent address changes
- Keep printers on the same network subnet as your POS devices
- Wired connections are more reliable than Wi-Fi for high-volume printing
