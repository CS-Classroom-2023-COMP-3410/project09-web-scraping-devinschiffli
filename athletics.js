const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

const url = 'https://denverpioneers.com/index.aspx';

//This function extracts just the JSON object from a string starting at a given position
function extractJSON(str, startIndex) {
  let depth = 0;
  let i = startIndex;

  while (i < str.length) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') depth--;
    if (depth === 0) return str.slice(startIndex, i + 1);
    i++;
  }

  return null;
}

async function main() {
  console.log('getting athletics page...');

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  let events = [];

  $('script').each((i, el) => {
    const text = $(el).html();
    if (!text || !text.includes('"opponent"')) return;

    //find where "var obj = {" starts
    const varIndex = text.indexOf('var obj = {');
    if (varIndex === -1) return;

    //extract just the JSON object using brace counting
    const jsonStr = extractJSON(text, varIndex + 'var obj = '.length);
    if (!jsonStr) return;

    try {
      const data = JSON.parse(jsonStr);
      const games = data.data;

      for (let i = 0; i < games.length; i++) {
        const game = games[i];

        const duTeam = game.sport ? 'Denver ' + game.sport.title : 'Denver Pioneers';
        const opponent = game.opponent ? game.opponent.name : '';
        const date = game.date ? game.date.split('T')[0] : '';

        if (opponent && date) {
          events.push({ duTeam: duTeam, opponent: opponent, date: date });
        }
      }
    } catch (e) {
      console.log('couldnt parse json: ' + e.message);
    }
  });

  await fs.ensureDir('results');
  await fs.writeJson('results/athletic_events.json', { events: events }, { spaces: 2 });
  console.log('found ' + events.length + ' events');
}

main().catch(err => console.log('ERROR: ' + err));