using Google.Apis.Auth.OAuth2;
using Google.Cloud.BigQuery.V2;
using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public class GcpCostService : IGcpCostService
{
    private readonly ILogger<GcpCostService> _logger;
    private readonly BigQueryClient _bigQueryClient;
    private readonly string _dataset;
    private readonly string _table;
    private readonly string _projectId;

    public GcpCostService(IConfiguration configuration, ILogger<GcpCostService> logger)
    {
        _logger = logger;

        _projectId = configuration["Firebase:ProjectId"]
            ?? throw new InvalidOperationException("Firebase:ProjectId is not configured");
        _dataset = configuration["GCP:BillingDataset"]
            ?? throw new InvalidOperationException("GCP:BillingDataset is not configured");
        _table = configuration["GCP:BillingTable"]
            ?? throw new InvalidOperationException("GCP:BillingTable is not configured");

        var credentialPath = configuration["Firebase:CredentialPath"];

        GoogleCredential credential;
        if (!string.IsNullOrEmpty(credentialPath))
        {
            credential = CredentialFactory.FromFile<ServiceAccountCredential>(credentialPath)
                .ToGoogleCredential()
                .CreateScoped("https://www.googleapis.com/auth/bigquery.readonly");
        }
        else
        {
            credential = GoogleCredential.GetApplicationDefault()
                .CreateScoped("https://www.googleapis.com/auth/bigquery.readonly");
        }

        _bigQueryClient = BigQueryClient.Create(_projectId, credential);

        _logger.LogInformation(
            "BigQuery client initialized for project {ProjectId}, dataset {Dataset}",
            _projectId, _dataset);
    }

    public async Task<GcpCostSummary> GetCostSummaryAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyyMM");
        var previousMonth = DateTime.UtcNow.AddMonths(-1).ToString("yyyyMM");

        var currentMonthServices = await QueryMonthlyCostByServiceAsync(currentMonth);
        var previousMonthServices = await QueryMonthlyCostByServiceAsync(previousMonth);

        var currentTotal = currentMonthServices.Sum(s => s.Cost);
        var previousTotal = previousMonthServices.Sum(s => s.Cost);

        var changePercent = previousTotal != 0
            ? Math.Round((currentTotal - previousTotal) / previousTotal * 100, 1)
            : 0;

        var currency = currentMonthServices.FirstOrDefault()?.DisplayName is not null
            ? "USD"
            : "USD";

        // Determine currency from BigQuery (default to USD)
        var currencyResult = await QueryCurrencyAsync(currentMonth);

        var topServices = currentMonthServices
            .Select(s => s with
            {
                Percentage = currentTotal != 0
                    ? Math.Round(s.Cost / currentTotal * 100, 1)
                    : 0
            })
            .OrderByDescending(s => s.Cost)
            .Take(10)
            .ToList();

        return new GcpCostSummary(
            Math.Round(currentTotal, 2),
            Math.Round(previousTotal, 2),
            changePercent,
            currencyResult,
            DateTime.UtcNow,
            topServices
        );
    }

    public async Task<List<ServiceCostDetail>> GetServiceBreakdownAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyyMM");
        var previousMonth = DateTime.UtcNow.AddMonths(-1).ToString("yyyyMM");

        var currentServices = await QueryMonthlyCostByServiceAsync(currentMonth);
        var previousServices = await QueryMonthlyCostByServiceAsync(previousMonth);

        var previousLookup = previousServices.ToDictionary(s => s.ServiceName, s => s.Cost);

        var breakdown = currentServices.Select(current =>
        {
            var previousCost = previousLookup.GetValueOrDefault(current.ServiceName, 0m);
            var change = previousCost != 0
                ? Math.Round((current.Cost - previousCost) / previousCost * 100, 1)
                : 0;

            return new ServiceCostDetail(
                current.ServiceName,
                current.DisplayName,
                Math.Round(current.Cost, 2),
                Math.Round(previousCost, 2),
                change
            );
        })
        .OrderByDescending(s => s.CurrentMonthCost)
        .ToList();

        // Add services that existed last month but not this month
        var currentServiceNames = currentServices.Select(s => s.ServiceName).ToHashSet();
        var missingServices = previousServices
            .Where(s => !currentServiceNames.Contains(s.ServiceName))
            .Select(s => new ServiceCostDetail(
                s.ServiceName,
                s.DisplayName,
                0,
                Math.Round(s.Cost, 2),
                s.Cost != 0 ? -100m : 0
            ));

        breakdown.AddRange(missingServices);

        return breakdown;
    }

    public async Task<List<MonthlyCost>> GetCostHistoryAsync(int months = 6)
    {
        var result = new List<MonthlyCost>();

        for (var i = months - 1; i >= 0; i--)
        {
            var targetDate = DateTime.UtcNow.AddMonths(-i);
            var monthStr = targetDate.ToString("yyyyMM");
            var displayMonth = targetDate.ToString("yyyy-MM");

            var services = await QueryMonthlyCostByServiceAsync(monthStr);
            var totalCost = services.Sum(s => s.Cost);

            var servicesWithPercent = services
                .Select(s => s with
                {
                    Percentage = totalCost != 0
                        ? Math.Round(s.Cost / totalCost * 100, 1)
                        : 0
                })
                .OrderByDescending(s => s.Cost)
                .ToList();

            result.Add(new MonthlyCost(
                displayMonth,
                Math.Round(totalCost, 2),
                servicesWithPercent
            ));
        }

        return result;
    }

    private async Task<List<ServiceCost>> QueryMonthlyCostByServiceAsync(string invoiceMonth)
    {
        var sql = @$"
            SELECT
                service.description AS service_name,
                SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
            FROM `{_projectId}.{_dataset}.{_table}`
            WHERE invoice.month = @invoiceMonth
            GROUP BY service.description
            HAVING net_cost > 0
            ORDER BY net_cost DESC";

        var parameters = new[]
        {
            new BigQueryParameter("invoiceMonth", BigQueryDbType.String, invoiceMonth)
        };

        try
        {
            var results = await _bigQueryClient.ExecuteQueryAsync(sql, parameters);

            return results.Select(row => new ServiceCost(
                row["service_name"]?.ToString() ?? "Unknown",
                GetDisplayName(row["service_name"]?.ToString() ?? "Unknown"),
                row["net_cost"] is not null ? Convert.ToDecimal(row["net_cost"]) : 0m,
                0 // Percentage is calculated later
            )).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to query BigQuery for month {Month}", invoiceMonth);
            return [];
        }
    }

    private async Task<string> QueryCurrencyAsync(string invoiceMonth)
    {
        var sql = @$"
            SELECT currency
            FROM `{_projectId}.{_dataset}.{_table}`
            WHERE invoice.month = @invoiceMonth
            LIMIT 1";

        var parameters = new[]
        {
            new BigQueryParameter("invoiceMonth", BigQueryDbType.String, invoiceMonth)
        };

        try
        {
            var results = await _bigQueryClient.ExecuteQueryAsync(sql, parameters);
            var firstRow = results.FirstOrDefault();
            return firstRow?["currency"]?.ToString() ?? "USD";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query currency, defaulting to USD");
            return "USD";
        }
    }

    private static string GetDisplayName(string serviceName) => serviceName switch
    {
        "Cloud Run" => "Cloud Run",
        "Cloud Firestore" => "Firestore",
        "Cloud Storage" => "Cloud Storage",
        "Cloud Logging" => "Cloud Logging",
        "Cloud Build" => "Cloud Build",
        "Artifact Registry" => "Artifact Registry",
        "Cloud DNS" => "Cloud DNS",
        "Networking" => "Networking",
        "Cloud Key Management Service (KMS)" => "Cloud KMS",
        _ => serviceName
    };
}
