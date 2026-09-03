const axios = require('axios');
async function test() {
    try {
        await axios.get(`https://api.docchi.pl/v1/episodes/find/overflow-40746/1`);
        console.log('1 works');
    } catch(e) { console.log('1 fails:', e.response ? e.response.status : e.message); }
    
    try {
        await axios.get(`https://api.docchi.pl/v1/episodes/find/overflow-40746/01`);
        console.log('01 works');
    } catch(e) { console.log('01 fails:', e.response ? e.response.status : e.message); }
}
test();
