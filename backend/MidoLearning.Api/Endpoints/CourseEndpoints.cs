using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class CourseEndpoints
{
    public static void MapCourseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/courses")
            .WithTags("Courses");

        group.MapGet("", GetCourses)
            .WithName("GetCourses")
            .WithOpenApi()
            .AllowAnonymous();

        group.MapGet("/{id}", GetCourseById)
            .WithName("GetCourseById")
            .WithOpenApi()
            .AllowAnonymous();
    }

    private static async Task<IResult> GetCourses(
        IFirebaseService firebaseService,
        string? type = null,
        string? category = null,
        string? status = "published",
        string? search = null,
        int? minLevel = null,
        int? maxLevel = null,
        string? priceFilter = null,
        string? sortBy = null)
    {
        try
        {
            var courses = await firebaseService.GetCoursesAsync(
                type, category, status, search, minLevel, maxLevel, priceFilter, sortBy);
            return Results.Ok(ApiResponse<List<CourseDto>>.Ok(courses));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse<List<CourseDto>>.Fail(ex.Message));
        }
    }

    private static async Task<IResult> GetCourseById(
        string id,
        IFirebaseService firebaseService)
    {
        try
        {
            var course = await firebaseService.GetCourseByIdAsync(id);

            if (course == null)
            {
                return Results.NotFound(ApiResponse<CourseDto>.Fail("Course not found"));
            }

            return Results.Ok(ApiResponse<CourseDto>.Ok(course));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse<CourseDto>.Fail(ex.Message));
        }
    }
}
