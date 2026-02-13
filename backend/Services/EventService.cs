using Backend.Models;
using MongoDB.Driver;

namespace Backend.Services;

public class EventService
{
    private readonly IMongoCollection<CalendarEvent> _events;

    public EventService(IMongoDatabase database)
    {
        _events = database.GetCollection<CalendarEvent>("Events");
    }

    public async Task<List<CalendarEvent>> GetAllAsync() =>
        await _events.Find(_ => true).ToListAsync();

    public async Task<CalendarEvent?> GetByIdAsync(string id) =>
        await _events.Find(x => x.Id == id).FirstOrDefaultAsync();

    public async Task CreateAsync(CalendarEvent newEvent) =>
        await _events.InsertOneAsync(newEvent);

    public async Task<bool> UpdateAsync(string id, CalendarEvent updatedEvent)
    {
        var result = await _events.ReplaceOneAsync(x => x.Id == id, updatedEvent);
        return result.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _events.DeleteOneAsync(x => x.Id == id);
        return result.DeletedCount > 0;
    }
}
