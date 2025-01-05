import DataUtil from './src/core/util/data.js';

// Test allocate with arrays
const test1 = DataUtil.allocate(['a', 'b'], ['x', 'y']);
console.log('Test 1:', test1);

// Test allocate with function
const test2 = DataUtil.allocate(['test'], _ => [{}]);
console.log('Test 2:', test2);
