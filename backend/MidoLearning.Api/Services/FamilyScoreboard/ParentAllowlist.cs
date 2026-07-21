namespace MidoLearning.Api.Services.FamilyScoreboard;

/// <summary>
/// 判定某 email 是否為家庭計分板的「家長」帳號。
/// 名單來自設定檔 <c>FamilyScoreboard:ParentEmails</c>，不寫死在程式碼中。
/// Phase 0 僅提供判定能力，尚未套用到任何授權 policy（授權套用留待 Phase 3）。
/// </summary>
public interface IParentAllowlist
{
    bool IsParent(string? email);
}

public class ParentAllowlist : IParentAllowlist
{
    private readonly HashSet<string> _parentEmails;

    public ParentAllowlist(IConfiguration configuration)
    {
        var configured = configuration.GetSection("FamilyScoreboard:ParentEmails").Get<string[]>()
            ?? Array.Empty<string>();
        _parentEmails = new HashSet<string>(configured, StringComparer.OrdinalIgnoreCase);
    }

    public bool IsParent(string? email) =>
        !string.IsNullOrWhiteSpace(email) && _parentEmails.Contains(email);
}
