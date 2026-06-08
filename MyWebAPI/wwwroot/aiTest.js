$(document).ready(async function () {
  const userInput = document.getElementById("ai-input");
  const aiOutput = document.getElementById("ai-output");
  const submitButton = document.getElementById("ai-submit");

  submitButton.addEventListener("click", async function (event) {
    event.preventDefault();

    try {
      const res = await fetch("http://localhost:5126/api/response/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "o4-mini",
          input: userInput.value,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json(); // ← parse JSON
      const story =
        data.output?.[1]?.content?.[0]?.text ?? "No text returned from API";
      aiOutput.innerText = story;
      console.log(data);
    } catch (err) {
      console.error(err);
      aiOutput.textContent = "Error occurred. Please try again.";
    }
  });
});
