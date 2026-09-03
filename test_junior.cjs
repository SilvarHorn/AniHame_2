const Scraper = require("@docchi/scraping-anime-websites-poland").default;

async function test() {
  console.log("With '1':");
  try {
    console.log(await Scraper({
      folder: "hentai",
      anime: "yuutousei-ayaka-no-uraomote",
      episode: "1",
      website: "junior"
    }));
  } catch(e) { console.error(e.message); }

  console.log("\nWith '01':");
  try {
    console.log(await Scraper({
      folder: "hentai",
      anime: "yuutousei-ayaka-no-uraomote",
      episode: "01",
      website: "junior"
    }));
  } catch(e) { console.error(e.message); }
}
test();
