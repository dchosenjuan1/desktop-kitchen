using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class MenuService
{
    public async Task<List<MenuCategory>> GetCategoriesAsync()
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<MenuCategory>>(
            HttpMethod.Get, MenuEndpoints.Categories);
    }

    public async Task<List<MenuItem>> GetMenuItemsAsync(int? categoryId = null)
    {
        var path = categoryId.HasValue
            ? MenuEndpoints.ItemsByCategory(categoryId.Value)
            : MenuEndpoints.Items;
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<MenuItem>>(HttpMethod.Get, path);
    }
}
