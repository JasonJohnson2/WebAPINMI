using Microsoft.AspNetCore.Mvc;
using Bogus;

[ApiController]
[Route("fake")]
public class FakeDataController : ControllerBase
{
    private readonly ILogger<FakeDataController> _logger;

    public FakeDataController(ILogger<FakeDataController> logger)
    {
        _logger = logger;
        // Deterministic seed for stable fake data
        Randomizer.Seed = new Random(42);
    }

    // DTOs
    public record UserDto(
        Guid Id, 
        string FirstName, 
        string LastName,
        string Email, 
        string Phone, 
        string Address1,
        string Address2,
        string City,
        string State,
        string Zip,
        string Country,
        string Company
    );

    public record OrderDto(
        Guid Id, 
        Guid UserId, 
        decimal Amount, 
        string Currency, 
        DateTime CreatedAt, 
        string Status
    );

    [HttpGet("users")]
    public IActionResult GetFakeUsers([FromQuery] int? count = 10)
    {
        try
        {
            var n = Math.Clamp(count ?? 10, 1, 1000);
            
            var userFaker = new Faker<UserDto>()
                .RuleFor(u => u.Id, _ => Guid.NewGuid())
                .RuleFor(u => u.FirstName, f => f.Person.FirstName)
                .RuleFor(u => u.LastName, f => f.Person.LastName)
                .RuleFor(u => u.Email, f => f.Internet.Email())
                .RuleFor(u => u.Phone, f => f.Phone.PhoneNumber())
                .RuleFor(u => u.Address1, f => f.Address.StreetAddress())
                .RuleFor(u => u.Address2, f => f.Address.SecondaryAddress())
                .RuleFor(u => u.City, f => f.Address.City())
                .RuleFor(u => u.State, f => f.Address.StateAbbr())
                .RuleFor(u => u.Zip, f => f.Address.ZipCode())
                .RuleFor(u => u.Country, _ => "US")
                .RuleFor(u => u.Company, f => f.Company.CompanyName());

            var users = userFaker.Generate(n);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating fake users");
            return StatusCode(500, new { error = "Failed to generate fake users" });
        }
    }

    [HttpGet("orders")]
    public IActionResult GetFakeOrders([FromQuery] int? count = 10)
    {
        try
        {
            var n = Math.Clamp(count ?? 10, 1, 1000);
            
            var orderFaker = new Faker<OrderDto>()
                .RuleFor(o => o.Id, _ => Guid.NewGuid())
                .RuleFor(o => o.UserId, _ => Guid.NewGuid())
                .RuleFor(o => o.Amount, f => Math.Round(f.Random.Decimal(1, 500), 2))
                .RuleFor(o => o.Currency, f => f.Finance.Currency().Code)
                .RuleFor(o => o.CreatedAt, _ => DateTime.UtcNow)
                .RuleFor(o => o.Status, f => f.PickRandom("pending", "captured", "failed", "refunded"));

            var orders = orderFaker.Generate(n);
            return Ok(orders);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating fake orders");
            return StatusCode(500, new { error = "Failed to generate fake orders" });
        }
    }

    [HttpGet("customer")]
    public IActionResult GetFakeCustomer()
    {
        try
        {
            var customerFaker = new Faker<UserDto>()
                .RuleFor(u => u.Id, _ => Guid.NewGuid())
                .RuleFor(u => u.FirstName, f => f.Person.FirstName)
                .RuleFor(u => u.LastName, f => f.Person.LastName)
                .RuleFor(u => u.Email, f => f.Internet.Email())
                .RuleFor(u => u.Phone, f => f.Phone.PhoneNumber())
                .RuleFor(u => u.Address1, f => f.Address.StreetAddress())
                .RuleFor(u => u.Address2, f => f.Address.SecondaryAddress())
                .RuleFor(u => u.City, f => f.Address.City())
                .RuleFor(u => u.State, f => f.Address.StateAbbr())
                .RuleFor(u => u.Zip, f => f.Address.ZipCode())
                .RuleFor(u => u.Country, _ => "US")
                .RuleFor(u => u.Company, f => f.Company.CompanyName());

            var customer = customerFaker.Generate();
            return Ok(customer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating fake customer");
            return StatusCode(500, new { error = "Failed to generate fake customer" });
        }
    }

    [HttpGet("env")]
    public IActionResult GetEnvironmentInfo()
    {
        return Ok(new 
        { 
            Mode = "development/test", 
            Faker = "enabled", 
            Seed = 42,
            Endpoints = new[]
            {
                "GET /fake/users?count=N",
                "GET /fake/orders?count=N", 
                "GET /fake/customer",
                "GET /fake/env"
            }
        });
    }
}


