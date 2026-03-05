const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

const url = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';

async function main() {
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  let courses = [];

  $('.courseblock').each((i, el) => {
    const title = $(el).find('.courseblocktitle').text().trim();
    const desc = $(el).find('.courseblockdesc').text().trim();

    //skip if the title doesn't have COMP in it
    if (!title.includes('COMP')) return;

    //split by whitespace to get each word
    const parts = title.split(/\s+/);

    //parts[0] = "COMP", parts[1] = "3100", parts[2] = course name
    const num = parseInt(parts[1]);

    //only 3000 and above courses
    if (num < 3000) return;

    //skip if course has prereqs
    if (desc.toLowerCase().includes('prerequisite')) return;

    // find where the credit info starts by looking for parenthesis
    const afterNumber = title.indexOf(parts[1]) + parts[1].length;
    const beforeCredits = title.indexOf('(');
    const name = title.slice(afterNumber, beforeCredits).trim();

    courses.push({
      course: 'COMP-' + num,
      title: name
    });
  });

  //save it
  await fs.ensureDir('results');
  await fs.writeJson('results/bulletin.json', { courses: courses }, { spaces: 2 });
  console.log('found ' + courses.length + ' courses');
}

main().catch(err => console.log('ERROR' + err));