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

builder.Services.AddAuthentication("Firebase")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, FirebaseAuthHandler>("Firebase", null);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("admin"));

    options.AddPolicy("TeacherOrAdmin", policy =>
        policy.RequireRole("teacher", "admin"));

    // Default policy allows anonymous - individual endpoints opt-in to require auth
    options.FallbackPolicy = null;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "https://mido-learning.web.app",
                "https://mido-learning-frontend-24mwb46hra-de.a.run.app",
                "https://learn.paulfun.net"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
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

app.Run();

// Make Program accessible to test projects
public partial class Program { }
