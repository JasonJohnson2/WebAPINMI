
$(document).ready(function () {

    let sid = self.crypto.randomUUID();
    let threeDSRequestorTransID = self.crypto.randomUUID();
    let authURL = null;
    let monURL = null;
    let threeDSCallback = null;
    let threeDStransID = null;

    $("#3DSbutton").click(async function (event) {
        event.preventDefault();
        var form = document.getElementById("3dsForm");
        var formData = new FormData(form);

        for (var pair of formData.entries()) {
            console.log(pair[0] + ' : ' + pair[1])
        }

        formData.append("sid", sid);
        formData.append("threeDSRequestorTransID", threeDSRequestorTransID);
        try {
            // First POST request
            let enrollmentResponse = await fetch("http://localhost:5126/enrollment", {
                method: "POST",
                body: formData
            });

            if (!enrollmentResponse.ok) {
                console.log("enrollmentFailed")
                throw new Error("Enrollment request failed: " + enrollmentResponse.statusText);
            }

            let enrollmentData = await enrollmentResponse.text();
            $('#output').html(enrollmentData);

            console.log("New Form Data " + formData)
            // Second POST request (init)
            let initResponse = await fetch("http://localhost:5126/init", {
                method: "POST",
                body: formData
            });

            if (!initResponse.ok) {
                throw new Error("Init request failed: " + initResponse.statusText);
            }

            let initData = await initResponse.text();
            $('#output').appendChild(initData);

            // Parsing the response data
            let parsedData = JSON.parse(initData);

            // Assigning values
            authURL = parsedData.authUrl;
            monURL = parsedData.monUrl;
            threeDSCallback = parsedData.threeDSServerCallbackUrl;
            threeDStransID = parsedData.threeDSServerTransID;

            // Updating the iframe sources
            $("#threeDSurl").attr('src', threeDSCallback);
            $("#monUrlFrame").attr('src', monURL);

        } catch (error) {
            console.error("Error occurred:", error);
            $('#output').html("Error occurred during processing: " + error.message);
        }

    });

});

function threeds_callback_method_finished(transId, param) {

    console.log("Mehtod Finished Callback")
    let data = {
        transId: transId,
        param: param,
        sid: sid
    }
    $.post("3DSAuth.php", data, function (data) {
        $("#output").append(data);

    });
}

function threeds_callback_method_skipped(transId, param) {
    console.log("Mehtod Skipped Callback")

    let data = {
        transId: transId,
        param: param,
        sid: sid
    }

    console.log("here")
    $.post("3DSAuth.php", data, function (data) {
        $("#output").append(data);

    });

}


function threeds_callback_auth_result_ready(transId, param) {
    console.log("auth result ready Callback")

    console.log("auth ready")
    $.get("/api/v2/auth/brw/result?threeDSServerTransID", "=" + transId);

}



function threeds_callback_method_unknown(transId, param) {

}