import { faker as base } from "https://esm.sh/@faker-js/faker@^9.0.0";

// Use a fixed seed so UI tests & manual checks are stable:
const SEED = 42;
base.seed(SEED);

export const faker = base;
