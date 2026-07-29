/**
 * Lightweight dev test-data filler for the Payment Component checkout form.
 *
 * Self-contained on purpose: the source project pulled @faker-js/faker (via a
 * seed module) from a CDN, which would need another CSP allowance and an extra
 * external dependency. This version generates believable-enough sample data
 * with plain JS so the "Refresh Test Data" button and page auto-fill keep
 * working with nothing external to load.
 *
 * Note: `email` is intentionally NOT filled here — PaymentComponent.js preserves
 * the email value from the HTML default across every fill.
 */

const FIRST_NAMES = ["John", "Jane", "Alex", "Maria", "Sam", "Priya", "Chen", "Omar"];
const LAST_NAMES = ["Doe", "Smith", "Nguyen", "Garcia", "Patel", "Kim", "Rossi", "Khan"];
const STREETS = ["Main St", "Oak Ave", "Maple Dr", "Elm St", "Cedar Ln", "Pine Rd"];
const CITIES = [
  { city: "New York", state: "NY", zip: "10001" },
  { city: "Chicago", state: "IL", zip: "60601" },
  { city: "Austin", state: "TX", zip: "73301" },
  { city: "Denver", state: "CO", zip: "80202" },
  { city: "Seattle", state: "WA", zip: "98101" },
  { city: "Miami", state: "FL", zip: "33101" },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

/** Fill the checkout form (#checkout-form) with random sample data. */
export function fillCheckoutForm() {
  const place = pick(CITIES);

  setValue("first_name", pick(FIRST_NAMES));
  setValue("last_name", pick(LAST_NAMES));
  setValue("phone", `${randomInt(200, 989)}${randomInt(200, 989)}${randomInt(1000, 9999)}`);
  setValue("address1", `${randomInt(100, 9999)} ${pick(STREETS)}`);
  setValue("address2", "");
  setValue("city", place.city);
  setValue("state", place.state);
  setValue("zip", place.zip);

  // country/currency are <select>s that already default to US / USD; leave them.
  // amount is set by PaymentComponent.js (random per load), so don't touch it.
}
