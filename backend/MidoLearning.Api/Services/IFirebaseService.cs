using FirebaseAdmin.Auth;

namespace MidoLearning.Api.Services;

public interface IFirebaseService
{
    Task<FirebaseToken> VerifyIdTokenAsync(string idToken);
    Task<UserRecord> GetUserAsync(string uid);
    Task SetCustomClaimsAsync(string uid, Dictionary<string, object> claims);
}
