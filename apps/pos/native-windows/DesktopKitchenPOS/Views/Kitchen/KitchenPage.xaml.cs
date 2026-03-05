using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.ViewModels;
using DesktopKitchenPOS.Theme;
using DesktopKitchenPOS.Utilities;
using Windows.UI;

namespace DesktopKitchenPOS.Views.Kitchen;

public sealed partial class KitchenPage : UserControl
{
    private readonly KitchenViewModel _vm = new();

    public KitchenPage()
    {
        InitializeComponent();
        _vm.PropertyChanged += OnViewModelChanged;
        _vm.StartPolling();
        Unloaded += (_, _) => _vm.StopPolling();
    }

    private void OnViewModelChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            switch (e.PropertyName)
            {
                case nameof(KitchenViewModel.IsLoading):
                    LoadingRing.IsActive = _vm.IsLoading;
                    break;
                case nameof(KitchenViewModel.Orders):
                    RebuildOrderCards();
                    break;
                case nameof(KitchenViewModel.PendingCount):
                    PendingBadge.Text = _vm.PendingCount > 0 ? $"{_vm.PendingCount} pending" : "";
                    break;
            }
        });
    }

    private void RebuildOrderCards()
    {
        OrdersGrid.Items.Clear();
        EmptyText.Visibility = _vm.Orders.Count == 0 && !_vm.IsLoading ? Visibility.Visible : Visibility.Collapsed;

        foreach (var order in _vm.Orders)
        {
            var elapsed = _vm.ElapsedSeconds(order);
            var urgent = _vm.IsUrgent(order);

            var borderColor = urgent ? AppColors.Error :
                order.Status == "pending" ? AppColors.Warning :
                order.Status == "preparing" ? AppColors.Info : AppColors.Border;

            var card = new Border
            {
                Background = new SolidColorBrush(AppColors.Card),
                BorderBrush = new SolidColorBrush(borderColor),
                BorderThickness = new Thickness(2),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(12),
                Width = 310
            };

            var stack = new StackPanel { Spacing = 4 };

            // Header
            var header = new Grid();
            header.Children.Add(new TextBlock
            {
                Text = $"#{order.OrderNumber}",
                FontSize = 16, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                Foreground = AppColors.TextPrimaryBrush
            });
            header.Children.Add(new TextBlock
            {
                Text = DateFormatters.FormatElapsed(elapsed),
                FontSize = 12,
                Foreground = new SolidColorBrush(urgent ? AppColors.Error : AppColors.TextSecondary),
                HorizontalAlignment = HorizontalAlignment.Right
            });
            stack.Children.Add(header);

            // Status
            var statusColor = order.Status switch
            {
                "pending" => AppColors.Warning,
                "preparing" => AppColors.Info,
                "ready" => AppColors.Success,
                _ => AppColors.TextTertiary
            };
            stack.Children.Add(new TextBlock
            {
                Text = order.Status.ToUpperInvariant(),
                FontSize = 12,
                Foreground = new SolidColorBrush(statusColor)
            });

            // Divider
            stack.Children.Add(new Border { Height = 1, Background = new SolidColorBrush(AppColors.Border), Margin = new Thickness(0, 4, 0, 4) });

            // Items
            if (order.Items != null)
            {
                foreach (var item in order.Items)
                {
                    stack.Children.Add(new TextBlock
                    {
                        Text = $"{item.Quantity}x {item.ItemName}",
                        FontSize = 14,
                        Foreground = AppColors.TextPrimaryBrush
                    });
                    if (!string.IsNullOrEmpty(item.Notes))
                    {
                        stack.Children.Add(new TextBlock
                        {
                            Text = item.Notes,
                            FontSize = 12,
                            Foreground = AppColors.WarningBrush
                        });
                    }
                    if (item.Modifiers != null)
                    {
                        foreach (var mod in item.Modifiers)
                        {
                            stack.Children.Add(new TextBlock
                            {
                                Text = $"  + {mod.ModifierName}",
                                FontSize = 12,
                                Foreground = AppColors.TextTertiaryBrush
                            });
                        }
                    }
                }
            }

            // Action button
            if (order.Status is "pending" or "preparing")
            {
                var btn = new Button
                {
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    Margin = new Thickness(0, 8, 0, 0),
                    CornerRadius = new CornerRadius(8),
                    Foreground = AppColors.TextPrimaryBrush,
                    Tag = order.Id
                };

                if (order.Status == "pending")
                {
                    btn.Content = "Start Preparing";
                    btn.Background = AppColors.InfoBrush;
                    btn.Click += async (s, _) => await _vm.StartOrderCommand.ExecuteAsync((int)((Button)s).Tag);
                }
                else
                {
                    btn.Content = "Mark Ready";
                    btn.Background = AppColors.SuccessBrush;
                    btn.Click += async (s, _) => await _vm.MarkReadyCommand.ExecuteAsync((int)((Button)s).Tag);
                }

                stack.Children.Add(btn);
            }

            card.Child = stack;
            OrdersGrid.Items.Add(card);
        }
    }

    private void OnPOSClick(object sender, RoutedEventArgs e)
    {
        _vm.StopPolling();
        DesktopKitchenPOS.App.State.Navigate(App.Screen.POS);
    }

    private void OnLogoutClick(object sender, RoutedEventArgs e)
    {
        _vm.StopPolling();
        DesktopKitchenPOS.App.State.Logout();
    }
}
