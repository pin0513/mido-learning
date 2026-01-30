using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Logging;

namespace MidoLearning.Api.Services;

public class FirebaseService : IFirebaseService
{
    private readonly ILogger<FirebaseService> _logger;

    public FirebaseService(IConfiguration configuration, ILogger<FirebaseService> logger)
    {
        _logger = logger;

        if (FirebaseApp.DefaultInstance is null)
        {
            var projectId = configuration["Firebase:ProjectId"];
            var credentialPath = configuration["Firebase:CredentialPath"];

            FirebaseApp.Create(new AppOptions
            {
                Credential = string.IsNullOrEmpty(credentialPath)
                    ? GoogleCredential.GetApplicationDefault()
                    : GoogleCredential.FromFile(credentialPath),
                ProjectId = projectId
            });

            _logger.LogInformation("Firebase initialized with project: {ProjectId}", projectId);
        }
    }

    public async Task<FirebaseToken> VerifyIdTokenAsync(string idToken)
    {
        return await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
    }

    public async Task<UserRecord> GetUserAsync(string uid)
    {
        return await FirebaseAuth.DefaultInstance.GetUserAsync(uid);
    }

    public async Task SetCustomClaimsAsync(string uid, Dictionary<string, object> claims)
    {
        await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(uid, claims);
        _logger.LogInformation("Set custom claims for user {Uid}: {Claims}", uid, claims);
    }
}
