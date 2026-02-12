using Microsoft.AspNetCore.Authentication;
using MidoLearning.Api.Endpoints;
using MidoLearning.Api.Middleware;
using MidoLearning.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<IFirebaseService, FirebaseService>();
builder.Services.AddSingleton<IStorageService, StorageService>();
builder.Services.AddSingleton<IGcpCostService, GcpCostService>();
builder.Services.AddSingleton<IGameService, GameService>();
builder.Services.AddSingleton<IAchievementService, AchievementService>();

builder.Services.AddAuthentication("Firebase")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, FirebaseAuthHandler>("Firebase", null);

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
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

app.Run();

// Make Program accessible to test projects
public partial class Program { }
