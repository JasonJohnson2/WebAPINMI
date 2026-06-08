using System;
using System.Collections.Generic;
using System.Linq;

namespace MyWebAPI.Utilities
{
    public static class PrettyPrint
    {
        public static string PrettyPrintResponse(string responseBody)
        {
            var prettyPrintedResult = new List<string>();

            // Split the response string into individual key-value pairs
            string[] pairs = responseBody.Split('&');

            // Iterate over each pair
            foreach (string pair in pairs)
            {
                // Split each pair into key and value
                string[] keyValue = pair.Split('=');

                // Check if the pair has a valid key-value structure
                if (keyValue.Length == 2)
                {
                    // Extract the key and value
                    string key = keyValue[0];
                    string value = keyValue[1];

                    // Format and add each key-value pair to the list
                    prettyPrintedResult.Add($"{key}: {value}");
                }
            }

            // Join all pretty-printed pairs with new lines
            return string.Join(Environment.NewLine, prettyPrintedResult);
        }
    }
}