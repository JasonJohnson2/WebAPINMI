$(document).ready(function () {

    document.getElementById("asyncButton").addEventListener("click", async function (event) {
        event.preventDefault();

        var form = document.getElementById("ayncForm");
        var formData = new FormData(form);

        for (var pair of formData.entries()) {
            console.log(pair[0] + ':' + pair[1]);
        }

        fetch("http://localhost:5126/async", {
            method: "POST",
            body: formData,
            headers: {
                'Authorization': 'Bearer STw3n9qWTCfyN8HqtzAdsg8NusAsGX9h'
            }
        })
            .then(response => response.test())
            .then(data => {
                doument.getElementById("prettyPrint").textContext = prettyPrintResponse(data);
            })
            .catch(error => {
                console.error("Error: " + error);
                document.getElementById("responseMessage").textContent = "Error occurred. Please try again.";

            })
    })



});

function prettyPrintResponse(response) {
    // Split the string by '&' to get key-value pairs
    let pairs = response.split('&');

    // Format each key-value pair
    let formattedPairs = pairs.map(pair => {
        let [key, value] = pair.split('=');
        return `${key}: ${value}`;
    });

    // Join the formatted pairs with new line characters
    return formattedPairs.join('\n');
}