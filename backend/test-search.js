// Test script for search functionality
const {
  hasMinimumLength,
  generateQueryVariants,
  flexibleMatch,
  buildSearchQuery
} = require('./utils/searchHelper');

console.log('=== Testing Search Helper Functions ===\n');

// Test 1: Minimum length validation
console.log('Test 1: Minimum Length Validation');
console.log('中文 (2 chars):', hasMinimumLength('中文')); // true
console.log('中 (1 char):', hasMinimumLength('中')); // false
console.log('test (4 chars):', hasMinimumLength('test')); // true
console.log('abc (3 chars):', hasMinimumLength('abc')); // false
console.log('测试ab (mixed):', hasMinimumLength('测试ab')); // true
console.log('');

// Test 2: Query variants generation
console.log('Test 2: Query Variants Generation');
console.log('Input: "测试"');
console.log('Variants:', generateQueryVariants('测试'));
console.log('');
console.log('Input: "Test"');
console.log('Variants:', generateQueryVariants('Test'));
console.log('');

// Test 3: Flexible matching
console.log('Test 3: Flexible Matching');
console.log('Match "测试" in "这是测试视频":', flexibleMatch('这是测试视频', '测试')); // true
console.log('Match "测试" in "测一个试":', flexibleMatch('测一个试', '测试')); // true (non-continuous)
console.log('Match "test" in "This is a test video":', flexibleMatch('This is a test video', 'test')); // true
console.log('Match "test" in "t e s t":', flexibleMatch('t e s t', 'test')); // true (non-continuous)
console.log('Match "abc" in "xyz":', flexibleMatch('xyz', 'abc')); // false
console.log('');

// Test 4: Build MongoDB query
console.log('Test 4: Build MongoDB Query');
const query1 = buildSearchQuery('测试');
console.log('Query for "测试":', JSON.stringify(query1, null, 2));
console.log('');

const query2 = buildSearchQuery('test');
console.log('Query for "test":', JSON.stringify(query2, null, 2));
console.log('');

console.log('=== All Tests Completed ===');
