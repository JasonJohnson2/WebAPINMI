using System;
using System.Collections.Generic;
using System.Linq;

namespace MyWebAPI.Utilities
{
    public static class CacheKeyGenerator
    {
        public static string GenerateCacheKey(Dictionary<string, string> requestParameters)
        {
            if (requestParameters == null || !requestParameters.Any())
            {
                throw new ArgumentException("Request parameters cannot be null or empty.");
            }

            // Generate a unique cache key based on sorted query parameters
            var sortedParams = requestParameters.OrderBy(kvp => kvp.Key);
            return string.Join("_", sortedParams.Select(kvp => $"{kvp.Key}:{kvp.Value}"));
        }
    }
}
