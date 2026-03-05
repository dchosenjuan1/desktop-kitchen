using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Utilities;

namespace DesktopKitchenPOS.ViewModels;

public partial class POSViewModel : ObservableObject
{
    [ObservableProperty]
    private List<MenuCategory> _categories = new();

    [ObservableProperty]
    private List<MenuItem> _menuItems = new();

    public ObservableCollection<CartItem> Cart { get; } = new();

    [ObservableProperty]
    private int? _selectedCategoryId;

    [ObservableProperty]
    private string _searchQuery = "";

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private string? _error;

    [ObservableProperty]
    private bool _isProcessingPayment;

    [ObservableProperty]
    private bool _showOrderConfirmation;

    [ObservableProperty]
    private string _confirmedOrderNumber = "";

    public List<MenuItem> FilteredItems
    {
        get
        {
            var items = MenuItems.AsEnumerable();
            if (SelectedCategoryId.HasValue)
                items = items.Where(i => i.CategoryId == SelectedCategoryId.Value);
            if (!string.IsNullOrWhiteSpace(SearchQuery))
            {
                var q = SearchQuery.ToLowerInvariant();
                items = items.Where(i =>
                    i.Name.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    (i.Description?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false));
            }
            return items.ToList();
        }
    }

    public double CartTotal => Cart.Sum(i => i.LineTotal);
    public double Subtotal => CurrencyFormatter.ExtractSubtotal(CartTotal);
    public double Tax => CurrencyFormatter.ExtractTax(CartTotal);

    partial void OnSelectedCategoryIdChanged(int? value) => OnPropertyChanged(nameof(FilteredItems));
    partial void OnSearchQueryChanged(string value) => OnPropertyChanged(nameof(FilteredItems));
    partial void OnMenuItemsChanged(List<MenuItem> value) => OnPropertyChanged(nameof(FilteredItems));

    [RelayCommand]
    public async Task LoadDataAsync()
    {
        IsLoading = true;
        try
        {
            var catsTask = DesktopKitchenPOS.App.MenuService.GetCategoriesAsync();
            var itemsTask = DesktopKitchenPOS.App.MenuService.GetMenuItemsAsync();
            Categories = await catsTask;
            MenuItems = await itemsTask;
            Error = null;
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        IsLoading = false;
    }

    [RelayCommand]
    public void AddToCart(MenuItem item)
    {
        var existing = Cart.FirstOrDefault(c => c.MenuItemId == item.Id && c.SelectedModifierIds == null);
        if (existing != null)
        {
            existing.Quantity++;
            NotifyCartChanged();
        }
        else
        {
            Cart.Add(new CartItem
            {
                MenuItemId = item.Id,
                ItemName = item.Name,
                Quantity = 1,
                UnitPrice = item.Price,
                MenuItemRef = item
            });
            NotifyCartChanged();
        }
    }

    [RelayCommand]
    public void RemoveFromCart(string cartId)
    {
        var item = Cart.FirstOrDefault(c => c.CartId == cartId);
        if (item != null)
        {
            Cart.Remove(item);
            NotifyCartChanged();
        }
    }

    public void UpdateQuantity(string cartId, int quantity)
    {
        if (quantity <= 0) { RemoveFromCart(cartId); return; }
        var item = Cart.FirstOrDefault(c => c.CartId == cartId);
        if (item != null)
        {
            item.Quantity = quantity;
            NotifyCartChanged();
        }
    }

    [RelayCommand]
    public void ClearCart()
    {
        Cart.Clear();
        NotifyCartChanged();
    }

    [RelayCommand]
    public async Task ProcessCashPaymentAsync(int employeeId)
    {
        if (Cart.Count == 0) return;
        IsProcessingPayment = true;
        try
        {
            var items = Cart.Select(c => new CreateOrderItem
            {
                MenuItemId = c.MenuItemId,
                Quantity = c.Quantity,
                Notes = c.Notes,
                Modifiers = c.SelectedModifierIds
            }).ToList();

            var order = await DesktopKitchenPOS.App.OrderService.CreateOrderAsync(employeeId, items);
            await DesktopKitchenPOS.App.PaymentService.CashPaymentAsync(order.Id);

            ConfirmedOrderNumber = order.OrderNumber;
            ShowOrderConfirmation = true;
            Cart.Clear();
            NotifyCartChanged();
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        IsProcessingPayment = false;
    }

    [RelayCommand]
    public async Task ProcessCardPaymentAsync(int employeeId)
    {
        if (Cart.Count == 0) return;
        IsProcessingPayment = true;
        try
        {
            var items = Cart.Select(c => new CreateOrderItem
            {
                MenuItemId = c.MenuItemId,
                Quantity = c.Quantity,
                Notes = c.Notes,
                Modifiers = c.SelectedModifierIds
            }).ToList();

            var order = await DesktopKitchenPOS.App.OrderService.CreateOrderAsync(employeeId, items);
            var intent = await DesktopKitchenPOS.App.PaymentService.CreateIntentAsync(order.Id);
            await DesktopKitchenPOS.App.PaymentService.ConfirmAsync(order.Id, intent.PaymentIntentId);

            ConfirmedOrderNumber = order.OrderNumber;
            ShowOrderConfirmation = true;
            Cart.Clear();
            NotifyCartChanged();
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        IsProcessingPayment = false;
    }

    public void DismissOrderConfirmation()
    {
        ShowOrderConfirmation = false;
        ConfirmedOrderNumber = "";
    }

    private void NotifyCartChanged()
    {
        OnPropertyChanged(nameof(CartTotal));
        OnPropertyChanged(nameof(Subtotal));
        OnPropertyChanged(nameof(Tax));
    }
}
