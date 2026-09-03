const axios = require('axios');
async function test() {
    try {
        const response = await axios.get(`https://api.docchi.pl/v1/episodes/find/overflow-40746/01`);
        console.log(response.data.length);
    } catch(e) {
        console.error(e.response ? e.response.status : e.message);
    }
}
test();
