using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.ViewModels;
using DesktopKitchenPOS.Theme;
using DesktopKitchenPOS.Utilities;

namespace DesktopKitchenPOS.Views.POS;

public sealed partial class POSPage : UserControl
{
    private readonly POSViewModel _vm = new();

    public POSPage()
    {
        InitializeComponent();
        _vm.PropertyChanged += OnViewModelChanged;
        _vm.Cart.CollectionChanged += (_, _) => RefreshCart();
        TaxLabel.Text = CurrencyFormatter.TaxLabel;
        _ = LoadAsync();
    }

    private async Task LoadAsync()
    {
        await _vm.LoadDataCommand.ExecuteAsync(null);
    }

    private void OnViewModelChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            switch (e.PropertyName)
            {
                case nameof(POSViewModel.IsLoading):
                    LoadingRing.IsActive = _vm.IsLoading;
                    MainLayout.Visibility = _vm.IsLoading ? Visibility.Collapsed : Visibility.Visible;
                    break;
                case nameof(POSViewModel.Categories):
                    RebuildCategoryPills();
                    break;
                case nameof(POSViewModel.FilteredItems):
                    RebuildMenuGrid();
                    break;
                case nameof(POSViewModel.ShowOrderConfirmation):
                    ConfirmationOverlay.Visibility = _vm.ShowOrderConfirmation ? Visibility.Visible : Visibility.Collapsed;
                    ConfirmedOrderText.Text = _vm.ConfirmedOrderNumber;
                    break;
            }
        });
    }

    private void RebuildCategoryPills()
    {
        CategoryPills.Children.Clear();

        var allBtn = new Button
        {
            Content = "All",
            Background = new SolidColorBrush(_vm.SelectedCategoryId == null ? AppColors.Accent : AppColors.Card),
            Foreground = AppColors.TextPrimaryBrush,
            CornerRadius = new CornerRadius(16),
            Padding = new Thickness(16, 8, 16, 8)
        };
        allBtn.Click += (_, _) =>
        {
            _vm.SelectedCategoryId = null;
            RebuildCategoryPills();
        };
        CategoryPills.Children.Add(allBtn);

        foreach (var cat in _vm.Categories)
        {
            var btn = new Button
            {
                Content = cat.Name,
                Tag = cat.Id,
                Background = new SolidColorBrush(_vm.SelectedCategoryId == cat.Id ? AppColors.Accent : AppColors.Card),
                Foreground = AppColors.TextPrimaryBrush,
                CornerRadius = new CornerRadius(16),
                Padding = new Thickness(16, 8, 16, 8)
            };
            btn.Click += (s, _) =>
            {
                _vm.SelectedCategoryId = (int)((Button)s).Tag;
                RebuildCategoryPills();
            };
            CategoryPills.Children.Add(btn);
        }
    }

    private void RebuildMenuGrid()
    {
        MenuGrid.Items.Clear();
        var items = _vm.FilteredItems;
        EmptyText.Visibility = items.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        foreach (var item in items)
        {
            var card = new Border
            {
                Background = new SolidColorBrush(AppColors.Card),
                CornerRadius = new CornerRadius(12),
                Tag = item,
                Width = 170,
                Height = 170
            };

            var stack = new StackPanel();

            // Image placeholder
            var imgBorder = new Border
            {
                Height = 90,
                Background = new SolidColorBrush(AppColors.Surface),
                CornerRadius = new CornerRadius(12, 12, 0, 0)
            };
            if (!string.IsNullOrEmpty(item.ImageUrl))
            {
                imgBorder.Child = new Image
                {
                    Source = new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(new Uri(item.ImageUrl)),
                    Stretch = Stretch.UniformToFill
                };
            }
            else
            {
                imgBorder.Child = new FontIcon
                {
                    Glyph = "\uE7B7",
                    Foreground = AppColors.TextTertiaryBrush,
                    FontSize = 24,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center
                };
            }
            stack.Children.Add(imgBorder);

            var nameText = new TextBlock
            {
                Text = item.Name,
                FontSize = 14,
                FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                Foreground = AppColors.TextPrimaryBrush,
                Margin = new Thickness(10, 6, 10, 0),
                MaxLines = 2,
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            stack.Children.Add(nameText);

            var priceText = new TextBlock
            {
                Text = CurrencyFormatter.Format(item.Price),
                FontSize = 13,
                Foreground = AppColors.AccentBrush,
                Margin = new Thickness(10, 2, 10, 6)
            };
            stack.Children.Add(priceText);

            card.Child = stack;
            MenuGrid.Items.Add(card);
        }
    }

    private void OnMenuItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is Border border && border.Tag is MenuItem item)
        {
            _vm.AddToCartCommand.Execute(item);
        }
    }

    private void RefreshCart()
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            CartEmptyText.Visibility = _vm.Cart.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            TotalsPanel.Visibility = _vm.Cart.Count > 0 ? Visibility.Visible : Visibility.Collapsed;
            SubtotalText.Text = CurrencyFormatter.Format(_vm.Subtotal);
            TaxText.Text = CurrencyFormatter.Format(_vm.Tax);
            TotalText.Text = CurrencyFormatter.Format(_vm.CartTotal);
            PayButton.Content = $"Pay {CurrencyFormatter.Format(_vm.CartTotal)}";

            CartList.Items.Clear();
            foreach (var item in _vm.Cart)
            {
                var row = new Grid { Padding = new Thickness(0, 4, 0, 4) };
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                var info = new StackPanel();
                info.Children.Add(new TextBlock
                {
                    Text = item.ItemName,
                    Foreground = AppColors.TextPrimaryBrush,
                    FontSize = 14,
                    TextTrimming = TextTrimming.CharacterEllipsis
                });
                info.Children.Add(new TextBlock
                {
                    Text = CurrencyFormatter.Format(item.LineTotal),
                    Foreground = AppColors.AccentBrush,
                    FontSize = 12
                });
                Grid.SetColumn(info, 0);
                row.Children.Add(info);

                var controls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4 };
                var minusBtn = new Button
                {
                    Content = "-",
                    Width = 32, Height = 32,
                    Background = new SolidColorBrush(AppColors.Surface),
                    Foreground = AppColors.TextSecondaryBrush,
                    Tag = item.CartId,
                    Padding = new Thickness(0)
                };
                minusBtn.Click += (s, _) =>
                {
                    var id = (string)((Button)s).Tag;
                    var ci = _vm.Cart.FirstOrDefault(c => c.CartId == id);
                    if (ci != null) _vm.UpdateQuantity(id, ci.Quantity - 1);
                    RefreshCart();
                };
                controls.Children.Add(minusBtn);
                controls.Children.Add(new TextBlock
                {
                    Text = $"{item.Quantity}",
                    Foreground = AppColors.TextPrimaryBrush,
                    FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                    VerticalAlignment = VerticalAlignment.Center
                });
                var plusBtn = new Button
                {
                    Content = "+",
                    Width = 32, Height = 32,
                    Background = new SolidColorBrush(AppColors.Surface),
                    Foreground = AppColors.TextSecondaryBrush,
                    Tag = item.CartId,
                    Padding = new Thickness(0)
                };
                plusBtn.Click += (s, _) =>
                {
                    var id = (string)((Button)s).Tag;
                    var ci = _vm.Cart.FirstOrDefault(c => c.CartId == id);
                    if (ci != null) _vm.UpdateQuantity(id, ci.Quantity + 1);
                    RefreshCart();
                };
                controls.Children.Add(plusBtn);
                var removeBtn = new Button
                {
                    Width = 32, Height = 32,
                    Background = new SolidColorBrush(Microsoft.UI.Colors.Transparent),
                    Tag = item.CartId,
                    Padding = new Thickness(0),
                    Content = new FontIcon { Glyph = "\uE711", FontSize = 14, Foreground = AppColors.ErrorBrush }
                };
                removeBtn.Click += (s, _) => { _vm.RemoveFromCartCommand.Execute((string)((Button)s).Tag); RefreshCart(); };
                controls.Children.Add(removeBtn);

                Grid.SetColumn(controls, 1);
                row.Children.Add(controls);

                CartList.Items.Add(row);
            }
        });
    }

    private void OnClearCartClick(object sender, RoutedEventArgs e)
    {
        _vm.ClearCartCommand.Execute(null);
        RefreshCart();
    }

    private async void OnPayClick(object sender, RoutedEventArgs e)
    {
        var empId = DesktopKitchenPOS.App.State.CurrentEmployee?.Id ?? 0;
        await _vm.ProcessCashPaymentCommand.ExecuteAsync(empId);
    }

    private void OnKitchenClick(object sender, RoutedEventArgs e)
    {
        DesktopKitchenPOS.App.State.Navigate(App.Screen.Kitchen);
    }

    private void OnReportsClick(object sender, RoutedEventArgs e)
    {
        DesktopKitchenPOS.App.State.Navigate(App.Screen.Reports);
    }

    private void OnLogoutClick(object sender, RoutedEventArgs e)
    {
        DesktopKitchenPOS.App.State.Logout();
    }

    private void OnConfirmationDismiss(object sender, TappedRoutedEventArgs e)
    {
        _vm.DismissOrderConfirmation();
    }
}
