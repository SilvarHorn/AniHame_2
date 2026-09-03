const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

// Remove all occurrences of `export default app;`
code = code.replace(/export default app;\n?/g, '');

// Add it to the end
code += '\nexport default app;\n';

fs.writeFileSync('api/index.ts', code);
console.log('Fixed export in api/index.ts');
