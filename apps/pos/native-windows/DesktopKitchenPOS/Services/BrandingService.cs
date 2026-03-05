using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class BrandingService
{
    public async Task<TenantBranding> GetBrandingAsync()
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<TenantBranding>(
            HttpMethod.Get, BrandingEndpoints.Branding);
    }
}
