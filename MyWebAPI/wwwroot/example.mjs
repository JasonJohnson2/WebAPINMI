import OpenAI from "openai";
const client = new OpenAI({
  apiKey:
    "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",
});
$(document).ready(async function () {
  const userInput = document.getElementById("ai-input").value;
  const aiOutput = document.getElementById("ai-output").innerHTML;
  const submitButton = document.getElementById("ai-submit");
  const response = await client.responses.create({
    model: "o4-mini",
    input: "write a story about " + userInput + ".",
  });

  submitButton.addEventListener("click", async function () {
    aiOutput = await response.output_text;
  });

  console.log(response.output_text);
});
