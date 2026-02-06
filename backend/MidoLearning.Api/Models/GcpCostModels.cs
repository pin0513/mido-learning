namespace MidoLearning.Api.Models;

public record GcpCostSummary(
    decimal CurrentMonthTotal,
    decimal PreviousMonthTotal,
    decimal ChangePercent,
    string Currency,
    DateTime LastUpdated,
    List<ServiceCost> TopServices
);

public record ServiceCost(
    string ServiceName,
    string DisplayName,
    decimal Cost,
    decimal Percentage
);

public record ServiceCostDetail(
    string ServiceName,
    string DisplayName,
    decimal CurrentMonthCost,
    decimal PreviousMonthCost,
    decimal ChangePercent
);

public record MonthlyCost(
    string Month,
    decimal TotalCost,
    List<ServiceCost> Services
);
