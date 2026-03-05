using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class AuthService
{
    public async Task<Employee> LoginAsync(string pin)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<Employee>(
            HttpMethod.Post, AuthEndpoints.Login, new LoginRequest { Pin = pin });
    }
}
