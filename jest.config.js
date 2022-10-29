/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*(*.)@(spec|test).[tj]s?(x)"],
  transform: {
    "\\.(glsl)$": "<rootDir>/mock/fileTransformer.js",
  },
};
