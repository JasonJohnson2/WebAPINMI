// Helper functions for interacting with the fake data API

export async function fetchFakeUsers(count = 10) {
  const response = await fetch(`/fake/users?count=${count}`);
  if (!response.ok) throw new Error("Failed to fetch fake users");
  return response.json();
}

export async function fetchFakeOrders(count = 10) {
  const response = await fetch(`/fake/orders?count=${count}`);
  if (!response.ok) throw new Error("Failed to fetch fake orders");
  return response.json();
}

export async function fetchFakeCustomer() {
  const response = await fetch("/fake/customer");
  if (!response.ok) throw new Error("Failed to fetch fake customer");
  return response.json();
}

export async function getEnvironmentInfo() {
  const response = await fetch("/fake/env");
  if (!response.ok) throw new Error("Failed to fetch environment info");
  return response.json();
}

// Example usage:
// const users = await fetchFakeUsers(5);
// const customer = await fetchFakeCustomer();
// console.log(users, customer);


