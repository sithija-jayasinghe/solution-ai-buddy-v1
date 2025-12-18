/**
 * Sample test files for demonstration
 * These files intentionally have errors to test Error Buddy
 */

// JavaScript error examples

// Example 1: TypeError - undefined property access
function testUndefinedAccess() {
  const data = undefined;
  return data.map(x => x); // TypeError!
}

// Example 2: ReferenceError - undefined variable
function testReferenceError() {
  console.log(nonExistentVariable); // ReferenceError!
}

// Example 3: TypeError - not a function
function testNotAFunction() {
  const obj = { name: 'test' };
  obj.name(); // TypeError - name is not a function
}

// Run one of these to test:
// testUndefinedAccess();
// testReferenceError();
// testNotAFunction();

console.log('Test file loaded. Uncomment a function call to trigger an error.');
