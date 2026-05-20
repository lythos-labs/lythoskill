// calculator.test.js — Tests for calculator
const { describe, test } = require('node:test');
const assert = require('node:assert');
const { add, subtract, multiply, divide } = require('./calculator');

describe('Calculator', () => {
  test('adds two numbers', () => {
    assert.strictEqual(add(2, 3), 5);
  });

  test('subtracts two numbers', () => {
    assert.strictEqual(subtract(5, 3), 2);
  });

  test('multiplies two numbers', () => {
    assert.strictEqual(multiply(4, 5), 20);
  });

  test('divides two numbers', () => {
    assert.strictEqual(divide(10, 2), 5);
  });

  test('divides two numbers with float result', () => {
    assert.strictEqual(divide(7, 2), 3.5);
  });
});
