/**
 * Simple test runner for Bor-Bi core business logic
 * Run with: npx tsx src/__tests__/run-tests.ts
 */

import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth';
import { computeTransactionHash, verifyTransactionHash } from '../lib/hash';
import { calculatePlatformFee } from '../lib/commission';
import { parseVoiceCommand } from '../lib/voice-parser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function testPasswordHashing() {
  console.log('\n--- Password Hashing ---');
  const password = 'testPassword123';
  const hash = await hashPassword(password);
  
  assert(hash !== password, 'Hash should differ from plain text');
  assert(hash.length > 0, 'Hash should not be empty');
  
  const isValid = await verifyPassword(password, hash);
  assert(isValid === true, 'Correct password should verify');
  
  const isInvalid = await verifyPassword('wrongPassword', hash);
  assert(isInvalid === false, 'Wrong password should not verify');
}

async function testJwtTokens() {
  console.log('\n--- JWT Tokens ---');
  const payload = { userId: 'test-123', email: 'test@test.com', role: 'VENDOR' as const };
  const token = signToken(payload);
  
  assert(typeof token === 'string', 'Token should be a string');
  assert(token.split('.').length === 3, 'Token should have 3 parts');
  
  const decoded = verifyToken(token);
  assert(decoded !== null, 'Valid token should decode');
  assert(decoded !== null && decoded.userId === 'test-123', 'Decoded userId should match');
  assert(decoded !== null && decoded.role === 'VENDOR', 'Decoded role should match');
  
  const invalidDecoded = verifyToken('invalid.token.here');
  assert(invalidDecoded === null, 'Invalid token should return null');
}

function testTransactionHash() {
  console.log('\n--- Transaction Hash ---');
  const txData = {
    vendorId: 'vendor-1',
    clientId: 'client-1',
    items: [{ productId: 'p1', quantity: 2, unitPrice: 1000, totalCents: 2000 }],
    totalCents: 2000,
    amountPaid: 1000,
  };
  
  const hash = computeTransactionHash(txData);
  assert(typeof hash === 'string', 'Hash should be a string');
  assert(hash.length === 64, 'SHA-256 hash should be 64 hex chars');
  
  const isValid = verifyTransactionHash(txData, hash);
  assert(isValid === true, 'Valid hash should verify');
  
  const tamperedData = { ...txData, totalCents: 9999 };
  const isTampered = verifyTransactionHash(tamperedData, hash);
  assert(isTampered === false, 'Tampered data should not verify');
  
  // Same input should produce same hash
  const hash2 = computeTransactionHash(txData);
  assert(hash === hash2, 'Same input should produce same hash');
}

function testPlatformFee() {
  console.log('\n--- Platform Fee ---');
  
  // 0.5% of 10000 cents = 50 cents
  const fee1 = calculatePlatformFee(10000);
  assert(fee1 === 50, `0.5% of 10000 should be 50, got ${fee1}`);
  
  // 0.5% of 100 cents = 0 (floor)
  const fee2 = calculatePlatformFee(100);
  assert(fee2 === 0, `0.5% of 100 should be 0, got ${fee2}`);
  
  // 0.5% of 200 cents = 1
  const fee3 = calculatePlatformFee(200);
  assert(fee3 === 1, `0.5% of 200 should be 1, got ${fee3}`);
  
  // Custom rate: 1% of 10000 = 100
  const fee4 = calculatePlatformFee(10000, 1);
  assert(fee4 === 100, `1% of 10000 should be 100, got ${fee4}`);
  
  // Zero amount
  const fee5 = calculatePlatformFee(0);
  assert(fee5 === 0, `0.5% of 0 should be 0, got ${fee5}`);
  
  // Large amount: 0.5% of 1000000 = 5000
  const fee6 = calculatePlatformFee(1000000);
  assert(fee6 === 5000, `0.5% of 1000000 should be 5000, got ${fee6}`);
}

function testVoiceCommandParser() {
  console.log('\n--- Voice Command Parser ---');
  
  const vendorProducts = [
    { id: 'p1', name: 'Pain', price: 15000 },
    { id: 'p2', name: 'Huile', price: 100000 },
    { id: 'p3', name: 'Riz', price: 50000 },
    { id: 'p4', name: 'Sucre', price: 80000 },
  ];
  
  const clients = [
    { id: 'c1', name: 'Fallou' },
    { id: 'c2', name: 'Aminata' },
  ];
  
  // Test sale command
  const result1 = parseVoiceCommand('Ajoute 2 pains et 1 litre d\'huile à Fallou', vendorProducts, clients);
  assert(result1.action === 'sale', 'Should detect sale action');
  assert(result1.products.length >= 1, 'Should find at least one product');
  assert(result1.clientName === 'Fallou', `Should find client Fallou, got ${result1.clientName}`);
  assert(result1.confidence >= 0.3, 'Confidence should be >= 0.3');
  
  // Test stock command
  const result2 = parseVoiceCommand('Ajoute 10 kilos de riz au stock', vendorProducts, clients);
  assert(result2.action === 'stock', 'Should detect stock action');
  assert(result2.products.length >= 1, 'Should find at least one product for stock');
  
  // Test empty command
  const result3 = parseVoiceCommand('', vendorProducts, clients);
  assert(result3.products.length === 0, 'Empty input should return no products');
  assert(result3.confidence < 0.3, 'Empty input should have low confidence');
}

async function main() {
  console.log('=== Bor-Bi Unit Tests ===');
  
  await testPasswordHashing();
  await testJwtTokens();
  testTransactionHash();
  testPlatformFee();
  testVoiceCommandParser();
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
