using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using MidoLearning.Api.Endpoints;
using MidoLearning.Api.Middleware;
using MidoLearning.Api.Services;
using MidoLearning.Api.Modules.SkillVillage.Auth.Services;
using MidoLearning.Api.Modules.SkillVillage.GameEngine.Services;
using MidoLearning.Api.Modules.SkillVillage.GameEngine.Calculators;
using MidoLearning.Api.Services.Music;
using MidoLearning.Api.Services.FamilyScoreboard;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<IFirebaseService, FirebaseService>();
builder.Services.AddSingleton<IStorageService, StorageService>();
builder.Services.AddSingleton<IGcpCostService, GcpCostService>();
builder.Services.AddSingleton<IGameService, GameService>();
builder.Services.AddSingleton<IAchievementService, AchievementService>();

// Register FirestoreDb for Skill Village (from Firebase config)
builder.Services.AddSingleton(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var projectId = configuration["Firebase:ProjectId"];
    var credentialPath = configuration["Firebase:CredentialPath"];

    Google.Apis.Auth.OAuth2.GoogleCredential? credential = null;
    if (!string.IsNullOrEmpty(credentialPath))
    {
        credential = Google.Apis.Auth.OAuth2.CredentialFactory
            .FromFile<Google.Apis.Auth.OAuth2.ServiceAccountCredential>(credentialPath)
            .ToGoogleCredential();
    }

    var firestoreBuilder = new Google.Cloud.Firestore.FirestoreDbBuilder
    {
        ProjectId = projectId,
        GoogleCredential = credential ?? Google.Apis.Auth.OAuth2.GoogleCredential.GetApplicationDefault()
    };

    return firestoreBuilder.Build();
});

// Skill Village Services
builder.Services.AddScoped<SkillVillageAuthService>();
builder.Services.AddScoped<GameEngineService>();
builder.Services.AddScoped<RewardCalculator>();

// Family Scoreboard Services
builder.Services.AddScoped<IFamilyScoreboardService, FirebaseScoreboardService>();

// Music Producer Services (Method A: Python subprocess in same container)
builder.Services.AddSingleton<IPythonSidecarClient, PythonProcessRunner>();
builder.Services.AddSingleton<MusicTaskStore>();
builder.Services.AddScoped<IMusicProducerService, MusicProducerService>();

builder.Services.AddAuthentication("Firebase")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, FirebaseAuthHandler>("Firebase", null)
    .AddJwtBearer("SkillVillage", options =>
    {
        var jwtKey = builder.Configuration["Jwt:Key"] ?? "your-super-secret-jwt-key-change-this-in-production-skill-village";
        var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MidoLearning";

        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Super Admin - highest level, can access everything
    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireRole("super_admin"));

    // Game Admin - can manage game courses and achievements
    options.AddPolicy("GameAdminOnly", policy =>
        policy.RequireRole("super_admin", "game_admin"));

    // Teacher - can manage materials
    options.AddPolicy("TeacherOnly", policy =>
        policy.RequireRole("super_admin", "game_admin", "teacher"));

    // Authenticated - any logged-in user
    options.AddPolicy("AuthenticatedOnly", policy =>
        policy.RequireAuthenticatedUser());

    // Legacy policies for backward compatibility
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("super_admin", "admin"));

    options.AddPolicy("TeacherOrAdmin", policy =>
        policy.RequireRole("super_admin", "game_admin", "teacher", "admin"));

    // Family Admin - can manage family scoreboard (add transactions, process redemptions)
    options.AddPolicy("FamilyAdmin", policy =>
        policy.RequireAuthenticatedUser());

    // Player Only - 玩家 JWT 持有者
    options.AddPolicy("PlayerOnly", policy =>
        policy.RequireRole("player"));

    // Default policy allows anonymous - individual endpoints opt-in to require auth
    options.FallbackPolicy = null;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // In development, allow all localhost origins
        if (builder.Environment.IsDevelopment())
        {
            policy
                .SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrWhiteSpace(origin)) return false;

                    // Allow all localhost and 127.0.0.1 origins
                    var uri = new Uri(origin);
                    return uri.Host == "localhost" || uri.Host == "127.0.0.1";
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            // In production, only allow specific origins
            policy
                .WithOrigins(
                    "https://mido-learning.web.app",
                    "https://mido-learning-frontend-24mwb46hra-de.a.run.app",
                    "https://learn.paulfun.net"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

// Rate Limiting (⚠️ TD-003)
builder.Services.AddRateLimiter(options =>
{
    // 登入 API: 每 IP 每分鐘 5 次
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 5;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // 遊戲完成 API: 每角色每分鐘 10 次
    options.AddFixedWindowLimiter("gameComplete", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // 全域限制: 開發環境寬鬆，生產環境嚴格
    var isDevelopment = builder.Environment.IsDevelopment();
    var globalRateLimit = isDevelopment ? 1000 : 100;  // 開發: 1000次/分鐘, 生產: 100次/分鐘

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = globalRateLimit,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "請求過於頻繁，請稍後再試"
        }, cancellationToken);
    };
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRateLimiter(); // ⚠️ TD-003: Rate Limiting
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithOpenApi();

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapAdminEndpoints();
app.MapWishEndpoints();
app.MapComponentEndpoints();
app.MapMaterialEndpoints();
app.MapRatingEndpoints();
app.MapCategoryEndpoints();
app.MapAnalyticsEndpoints();
app.MapCostEndpoints();
app.MapCourseEndpoints();
app.MapGameEndpoints();
app.MapAchievementEndpoints();

// Family Scoreboard Endpoints
app.MapFamilyScoreboardEndpoints();

// Music Producer Endpoints
app.MapMusicEndpoints();

// Skill Village Endpoints
app.MapSkillVillageAuthEndpoints();
app.MapSkillVillageGameEndpoints();

app.Run();

// Make Program accessible to test projects
public partial class Program { }
