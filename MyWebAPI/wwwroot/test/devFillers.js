import { faker } from "./seed.js";

export function fillCheckoutForm(doc = document) {
  const setValue = (selector, value) => {
    const element = doc.querySelector(selector);
    if (element) {
      element.value = value;
      // Trigger change event for any listeners
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  // Personal Information
  setValue("#first_name", faker.person.firstName());
  setValue("#last_name", faker.person.lastName());
  setValue("#email", faker.internet.email());
  setValue("#phone", faker.phone.number());
  setValue("#company", faker.company.name());

  // Billing Address
  setValue("#address1", faker.location.streetAddress());
  setValue("#address2", faker.location.secondaryAddress());
  setValue("#city", faker.location.city());
  setValue("#state", faker.location.state({ abbreviated: true }));
  setValue("#zip", faker.location.zipCode());

  // Randomly select country
  const countries = ["US", "CA", "GB"];
  setValue("#country", faker.helpers.arrayElement(countries));

  // Order Summary - Random amount and currency
  const amount = faker.number.float({ min: 10, max: 500, multipleOf: 0.01 });
  setValue("#amount", amount.toFixed(2));

  const currencies = ["USD", "CAD", "EUR"];
  setValue("#currency", faker.helpers.arrayElement(currencies));
}

export function fillPaymentAmount() {
  const amount = faker.number.float({ min: 10, max: 500, multipleOf: 0.01 });
  const element = document.querySelector("#amount");
  if (element) {
    element.value = amount.toFixed(2);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return amount;
}
