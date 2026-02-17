using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly EventService _eventService;

    public EventsController(EventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    public async Task<List<CalendarEvent>> GetAll() =>
        await _eventService.GetAllAsync();

    [HttpGet("{id}")]
    public async Task<ActionResult<CalendarEvent>> GetById(string id)
    {
        var evt = await _eventService.GetByIdAsync(id);
        return evt is null ? NotFound() : evt;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CalendarEvent newEvent)
    {
        if (string.IsNullOrWhiteSpace(newEvent.Title))
            return BadRequest(new { message = "Title is required." });

        if (newEvent.Start >= newEvent.End)
            return BadRequest(new { message = "Start date must be before End date." });

        await _eventService.CreateAsync(newEvent);
        return CreatedAtAction(nameof(GetById), new { id = newEvent.Id }, newEvent);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, CalendarEvent updatedEvent)
    {
        updatedEvent.Id = id;
        return await _eventService.UpdateAsync(id, updatedEvent) ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        return await _eventService.DeleteAsync(id) ? NoContent() : NotFound();
    }

    [HttpDelete("series/{groupId}")]
    public async Task<IActionResult> DeleteSeries(string groupId)
    {
        return await _eventService.DeleteSeriesAsync(groupId) ? NoContent() : NotFound();
    }
}
