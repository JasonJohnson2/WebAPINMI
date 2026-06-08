import { faker } from "../seed.js";

export function makeOrder(overrides = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 500, multipleOf: 0.01 }),
    currency: faker.finance.currencyCode(),
    createdAt: new Date().toISOString(),
    status: faker.helpers.arrayElement([
      "pending",
      "captured",
      "failed",
      "refunded",
    ]),
    ...overrides,
  };
}


