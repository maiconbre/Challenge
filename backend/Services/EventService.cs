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

    public async Task CreateAsync(CalendarEvent newEvent)
    {
        if (IsRecurrence(newEvent.Recurrence))
        {
            await CreateSeriesAsync(newEvent);
        }
        else
        {
            await _events.InsertOneAsync(newEvent);
        }
    }

    public async Task<bool> UpdateAsync(string id, CalendarEvent updatedEvent)
    {
        var originalEvent = await _events.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (originalEvent == null) return false;

        // Check if Recurrence was ADDED (changed from none -> daily/weekly...)
        bool isNewRecurrence = !IsRecurrence(originalEvent.Recurrence) && IsRecurrence(updatedEvent.Recurrence);

        if (isNewRecurrence)
        {
            // Turn into series
            var groupId = Guid.NewGuid().ToString();
            updatedEvent.GroupId = groupId;
            
            // Generate future events (excluding the current one which is updated below)
            await CreateSeriesInstancesAsync(updatedEvent, groupId, skipFirst: true);
        }

        var result = await _events.ReplaceOneAsync(x => x.Id == id, updatedEvent);
        return result.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _events.DeleteOneAsync(x => x.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> DeleteSeriesAsync(string groupId)
    {
        var result = await _events.DeleteManyAsync(x => x.GroupId == groupId);
        return result.DeletedCount > 0;
    }

    // Helpers

    private bool IsRecurrence(string? recurrence) => 
        !string.IsNullOrEmpty(recurrence) && recurrence.ToLower() != "none";

    private async Task CreateSeriesAsync(CalendarEvent firstEvent)
    {
        var groupId = Guid.NewGuid().ToString();
        firstEvent.GroupId = groupId;
        firstEvent.Id = null; // Ensure ID is generated

        // For Create, we generate ALL events including the first one
        var events = GenerateEvents(firstEvent, groupId, 0);
        
        if (events.Any())
        {
            await _events.InsertManyAsync(events);
            // Update the reference of the first event to return to controller
            var savedFirst = events.First();
            firstEvent.Id = savedFirst.Id;
        }
    }

    private async Task CreateSeriesInstancesAsync(CalendarEvent baseEvent, string groupId, bool skipFirst)
    {
        // Generate events starting from next occurrence
        var events = GenerateEvents(baseEvent, groupId, skipFirst ? 1 : 0);
        if (events.Any())
        {
            await _events.InsertManyAsync(events);
        }
    }

    private List<CalendarEvent> GenerateEvents(CalendarEvent baseEvent, string groupId, int startIndex)
    {
        var list = new List<CalendarEvent>();
        int limit = GetLimit(baseEvent.Recurrence);

        for (int i = startIndex; i < limit; i++)
        {
            list.Add(new CalendarEvent
            {
                Id = null, // Always new ID
                Title = baseEvent.Title,
                Start = CalculateNextDate(baseEvent.Start, baseEvent.Recurrence!, i),
                End = CalculateNextDate(baseEvent.End, baseEvent.Recurrence!, i),
                Color = baseEvent.Color,
                Location = baseEvent.Location,
                Description = baseEvent.Description,
                Recurrence = baseEvent.Recurrence,
                Notification = baseEvent.Notification,
                GroupId = groupId
            });
        }
        return list;
    }

    private int GetLimit(string? recurrence)
    {
        return (recurrence?.ToLower()) switch
        {
            "daily" => 365,
            "weekly" => 52,
            "monthly" => 12,
            "yearly" => 5,
            _ => 1
        };
    }

    private DateTime CalculateNextDate(DateTime originalDate, string recurrence, int multiplier)
    {
        return recurrence.ToLower() switch
        {
            "daily" => originalDate.AddDays(multiplier),
            "weekly" => originalDate.AddDays(7 * multiplier),
            "monthly" => originalDate.AddMonths(multiplier),
            "yearly" => originalDate.AddYears(multiplier),
            _ => originalDate
        };
    }
}
