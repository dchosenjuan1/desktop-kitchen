namespace DesktopKitchenPOS.Networking;

public class ApiException : Exception
{
    public int? StatusCode { get; }

    public ApiException(string message, int? statusCode = null)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public ApiException(string message, Exception inner, int? statusCode = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }
}
