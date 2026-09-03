const http = require('http');

const req = http.request('http://localhost:3000/api/docchi/40746/1', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
});
req.end();
