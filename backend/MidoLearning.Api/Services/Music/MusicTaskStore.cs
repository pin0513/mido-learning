using System.Collections.Concurrent;
using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public class MusicTaskStore
{
    private readonly ConcurrentDictionary<string, MusicTaskStatus> _tasks = new();

    public void Set(string taskId, MusicTaskStatus status) => _tasks[taskId] = status;

    public MusicTaskStatus? Get(string taskId) =>
        _tasks.TryGetValue(taskId, out var status) ? status : null;

    public bool Exists(string taskId) => _tasks.ContainsKey(taskId);
}
