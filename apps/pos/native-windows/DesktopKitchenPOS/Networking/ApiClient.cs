using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DesktopKitchenPOS.Configuration;

namespace DesktopKitchenPOS.Networking;

public class ApiClient
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions;

    public ApiClient()
    {
        _client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(15)
        };

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            Converters =
            {
                new FlexibleDoubleConverter(),
                new FlexibleIntConverter(),
                new FlexibleBoolConverter(),
                new FlexibleNullableDoubleConverter(),
                new FlexibleNullableIntConverter()
            }
        };
    }

    public JsonSerializerOptions JsonOptions => _jsonOptions;

    public async Task<T> RequestAsync<T>(HttpMethod method, string path, object? body = null)
    {
        var config = ServerConfig.Shared;
        var url = config.BaseURL + "/api" + path;

        using var request = new HttpRequestMessage(method, url);
        AddHeaders(request);

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, _jsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        HttpResponseMessage response;
        try
        {
            response = await _client.SendAsync(request);
        }
        catch (Exception ex)
        {
            throw new ApiException($"Network error: {ex.Message}", ex);
        }

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            var errorMsg = ExtractErrorMessage(responseBody) ?? response.ReasonPhrase ?? "Request failed";
            throw new ApiException(errorMsg, (int)response.StatusCode);
        }

        try
        {
            return JsonSerializer.Deserialize<T>(responseBody, _jsonOptions)
                ?? throw new ApiException("Response was null");
        }
        catch (JsonException ex)
        {
            throw new ApiException($"Decoding error: {ex.Message}", ex);
        }
    }

    public async Task RequestVoidAsync(HttpMethod method, string path, object? body = null)
    {
        var config = ServerConfig.Shared;
        var url = config.BaseURL + "/api" + path;

        using var request = new HttpRequestMessage(method, url);
        AddHeaders(request);

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, _jsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        HttpResponseMessage response;
        try
        {
            response = await _client.SendAsync(request);
        }
        catch (Exception ex)
        {
            throw new ApiException($"Network error: {ex.Message}", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            var errorMsg = ExtractErrorMessage(responseBody) ?? response.ReasonPhrase ?? "Request failed";
            throw new ApiException(errorMsg, (int)response.StatusCode);
        }
    }

    private static void AddHeaders(HttpRequestMessage request)
    {
        var config = ServerConfig.Shared;
        request.Headers.Add("X-Tenant-ID", config.TenantID);

        if (!string.IsNullOrEmpty(config.AdminSecret))
        {
            request.Headers.Add("X-Admin-Secret", config.AdminSecret);
        }

        var token = AuthTokenStore.Token;
        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    private string? ExtractErrorMessage(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            if (root.TryGetProperty("error", out var errProp)) return errProp.GetString();
            if (root.TryGetProperty("message", out var msgProp)) return msgProp.GetString();
        }
        catch { }
        return null;
    }
}
