using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class ModifierService
{
    public async Task<List<ModifierGroup>> GetGroupsForItemAsync(int menuItemId)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<ModifierGroup>>(
            HttpMethod.Get, ModifierEndpoints.GroupsForItem(menuItemId));
    }
}
