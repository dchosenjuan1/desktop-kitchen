using CommunityToolkit.Mvvm.ComponentModel;
using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking;

namespace DesktopKitchenPOS.App;

public enum Screen
{
    Login,
    POS,
    Kitchen,
    Admin,
    Reports,
    Inventory,
    Employees,
    MenuManagement,
    Kiosk
}

public partial class AppState : ObservableObject
{
    [ObservableProperty]
    private Screen _currentScreen = Screen.Login;

    [ObservableProperty]
    private Employee? _currentEmployee;

    public bool IsLoggedIn => CurrentEmployee != null;

    public void Navigate(Screen screen)
    {
        CurrentScreen = screen;
    }

    public void LoginSucceeded(Employee employee)
    {
        CurrentEmployee = employee;
        AuthTokenStore.Token = employee.Token;
        CurrentScreen = employee.Role == "kitchen" ? Screen.Kitchen : Screen.POS;
    }

    public void Logout()
    {
        CurrentEmployee = null;
        AuthTokenStore.Token = null;
        CurrentScreen = Screen.Login;
    }
}
