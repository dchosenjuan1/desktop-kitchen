using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DesktopKitchenPOS.Models;

namespace DesktopKitchenPOS.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    [ObservableProperty]
    private string _pin = "";

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string? _error;

    [ObservableProperty]
    private bool _shake;

    public bool[] Dots => Enumerable.Range(0, 4).Select(i => i < Pin.Length).ToArray();

    public event Action<Employee>? LoginSucceeded;

    [RelayCommand]
    public async Task AppendDigitAsync(string digit)
    {
        if (Pin.Length >= 4) return;
        Pin += digit;
        Error = null;
        OnPropertyChanged(nameof(Dots));

        if (Pin.Length == 4)
        {
            await AttemptLoginAsync();
        }
    }

    [RelayCommand]
    public void Backspace()
    {
        if (Pin.Length > 0)
        {
            Pin = Pin[..^1];
            Error = null;
            OnPropertyChanged(nameof(Dots));
        }
    }

    [RelayCommand]
    public void Clear()
    {
        Pin = "";
        Error = null;
        OnPropertyChanged(nameof(Dots));
    }

    private async Task AttemptLoginAsync()
    {
        IsLoading = true;
        try
        {
            var employee = await DesktopKitchenPOS.App.AuthService.LoginAsync(Pin);
            LoginSucceeded?.Invoke(employee);
        }
        catch (Exception ex)
        {
            Error = ex.Message;
            await TriggerShakeAsync();
            Pin = "";
            OnPropertyChanged(nameof(Dots));
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task TriggerShakeAsync()
    {
        Shake = true;
        await Task.Delay(500);
        Shake = false;
    }
}
