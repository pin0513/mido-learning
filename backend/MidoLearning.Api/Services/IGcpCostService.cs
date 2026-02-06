using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public interface IGcpCostService
{
    Task<GcpCostSummary> GetCostSummaryAsync();
    Task<List<ServiceCostDetail>> GetServiceBreakdownAsync();
    Task<List<MonthlyCost>> GetCostHistoryAsync(int months = 6);
}
