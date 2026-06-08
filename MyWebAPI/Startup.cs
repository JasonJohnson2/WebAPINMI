using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MyWebApi
{
    public class Startup
    {

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }
        public void ConfigureServices(IServiceCollection services)
        {

            // 1) Persist the key ring to a "keys" folder
            services.AddDataProtection()
                .PersistKeysToFileSystem(
                    new DirectoryInfo(
                        Path.Combine(Directory.GetCurrentDirectory(), "keys")))
                .SetApplicationName("MyWebApi");

            // 2) Then add session (and any other services)
            services.AddSession(options =>
            {
                options.Cookie.Name = ".MyWebApi.Session";
                options.IdleTimeout = TimeSpan.FromMinutes(20);
            });

            string? ApiKey = Configuration["MyAppSettings:ApiKey"];

            Console.WriteLine($"My API Key: {ApiKey}");

            // Configure services here (e.g., add controllers)
            services.AddControllers();
            services.AddMemoryCache();
            services.AddHttpClient();
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", builder =>
                    builder.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
            });
            services.AddSession();
            services.AddMvc();
            // Add OpenAPI support (built into ASP.NET Core)
            services.AddOpenApi();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseSession();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                // Production error handler + HTTPS
                app.UseExceptionHandler("/error");
                app.UseHsts();
                app.UseHttpsRedirection();
            }

            app.UseStaticFiles(new StaticFileOptions
            {
                ServeUnknownFileTypes = true,
                DefaultContentType = "text/html"
            });
            app.UseRouting();
            app.UseCors("AllowAll");
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();

                // OpenAPI endpoint (replaces Swagger)
                if (env.IsDevelopment())
                {
                    endpoints.MapOpenApi();
                }
            });
        }

    }
}
