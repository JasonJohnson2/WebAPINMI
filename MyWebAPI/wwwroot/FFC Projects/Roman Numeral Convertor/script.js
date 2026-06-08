const input = document.getElementById("number");
const output = document.getElementById("output");
const button = document.getElementById("convert-btn");

button.addEventListener("click", () => {
  const number = input.value;
  output.innerHTML = convertToRoman(number);
});
