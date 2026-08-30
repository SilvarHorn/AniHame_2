import axios from 'axios';
axios.get('https://api.jikan.moe/v4/anime/1/episodes').then(res => console.log(res.data.data.slice(0, 2))).catch(err => console.log(err.message));
