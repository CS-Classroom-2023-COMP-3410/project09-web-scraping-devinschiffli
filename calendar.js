const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

const baseUrl = 'https://www.du.edu';

//this function scrapes all events for a given month and year
async function getMonth(year, month) {
  //format the month as a 2 digit string
  let monthStr = String(month);
  if (month < 10) {
    monthStr = '0' + month;
  }

  //figure out what the next month and year are
  const nextMonth = month == 12 ? 1 : month + 1;
  const nextYear = month == 12 ? year + 1 : year;

  //format the next month as a 2 digit string too
  let nextMonthStr = String(nextMonth);
  if (nextMonth < 10) {
    nextMonthStr = '0' + nextMonth;
  }

  //build the start and end date strings for the url
  const start = year + '-' + monthStr + '-01';
  const end = nextYear + '-' + nextMonthStr + '-01';

  //build the calendar url with the date range and fetch the page
  const url = baseUrl + '/calendar?search=&start_date=' + start + '&end_date=' + end;
  console.log('fetching ' + url);

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  let events = [];

  //loop through each event on the page
  $('.events-listing__item').each((i, el) => {
    const card = $(el).find('a.event-card');

    //extract the title, date, time, and link from the event card
    const title = card.find('h3').text().trim();
    const date = card.find('p').first().text().trim();
    const time = card.find('p').eq(1).text().trim();
    const link = card.attr('href');

    //only add the event if it has a title
    if (title) {
      events.push({ title, date, time, link });
    }
  });

  return events;
}

//this function visits an event page and returns the description
async function getDescription(path) {
  try {
    //build the full url if the link is relative
    const url = path.startsWith('http') ? path : baseUrl + path;
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    //remove script tags so we don't accidentally grab javascript code
    $('script').remove();

    //grab the first paragraph in the body field
    const desc = $('.field--name-body p').first().text().trim();
    return desc || null;
  } catch (e) {
    return null;
  }
}

//main function that runs the stuff
async function main() {
  console.log('scraping DU calendar for 2025...');

  let allEvents = [];

  //loop through every month in 2025 and collect all events
  for (let month = 1; month <= 12; month++) {
    const monthEvents = await getMonth(2025, month);
    allEvents = allEvents.concat(monthEvents);
  }

  console.log('found ' + allEvents.length + ' events, getting descriptions...');

  let events = [];

  //loop through each event and get its description
  for (let i = 0; i < allEvents.length; i++) {
    const e = allEvents[i];
    console.log('getting description for event ' + (i + 1) + ' of ' + allEvents.length);

    //build the event object with title and date
    const result = { title: e.title, date: e.date };

    //only add time if it exists
    if (e.time) result.time = e.time;

    //visit the event page to get the description
    if (e.link) {
      const desc = await getDescription(e.link);
      if (desc) result.description = desc;
    }

    events.push(result);
  }

  //save everything to a json file
  await fs.ensureDir('results');
  await fs.writeJson('results/calendar_events.json', { events: events }, { spaces: 2 });
  console.log('saved ' + events.length + ' events');
}

main().catch(err => console.log('ERROR: ' + err));