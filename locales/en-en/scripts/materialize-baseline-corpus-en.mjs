#!/usr/bin/env node
/**
 * Writes locales/en-en/references/baseline-corpus-en.txt — human-register English for tier frequency ranks.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(REPO_ROOT, 'locales/en-en/references/baseline-corpus-en.txt');

const SENTENCES = [
  'The council voted to repair the pier before the summer festival.',
  'She missed the bus and walked twenty minutes in light rain.',
  'The clinic posted wait times on a whiteboard near the door.',
  'We ate soup, bread, and apples for lunch on Tuesday.',
  'The library closed early because of a power outage downtown.',
  'He fixed the fence with nails he found in the shed.',
  'The train stopped in Reading; half the passengers changed platforms.',
  'The teacher explained the rules without extra flourish.',
  'Snow melted fast and the sidewalk stayed slick until noon.',
  'The debate covered taxes, rent, and bus fares.',
  'The cat slept on the radiator while hail hit the window.',
  'The reporter asked residents about noise from the building site.',
  'The committee delayed the vote until the minutes were ready.',
  'The neighbor lent a ladder and helped patch the roof.',
  'The pharmacy ran out of two prescriptions for one day.',
  'The band rehearsed in the basement before Saturday’s show.',
  'Cyclists complained about ice along the river path after frost.',
  'The woods were quiet except for woodpeckers on a pine.',
  'Students showed their math work in plain steps.',
  'Police warned about ice on the bridge overnight.',
  'The farmer planted spring wheat once the field dried.',
  'The kitchen smelled of cinnamon and cooling cake.',
  'The paper printed a table of local parking fees.',
  'The pilot announced turbulence before we crossed the hills.',
  'The hospital hired more nurses to shorten the queue.',
  'We stacked firewood under the porch roof.',
  'The judge read the sentence in short, clear sentences.',
  'Fishermen docked early with modest catches.',
  'She painted the hall light gray and replaced the trim.',
  'The driver stopped close to the curb for the wheelchair ramp.',
  'The club held a book sale and donated the proceeds.',
  'Wind rattled the attic but no tiles came loose.',
  'The engineer found the bug in the logs and rolled back the deploy.',
  'Grandpa talked about school days without sentimental padding.',
  'The city planted trees along the bike lane for summer shade.',
  'The cook sliced vegetables thin and fried them in butter.',
  'The bank cut savings rates and customers reacted calmly.',
  'We swam in the lake even though June water was cold.',
  'The editor cut throat-clearing lines from the letter.',
  'The midwife took blood pressure and wrote in the chart.',
  'The truck stalled and caused a queue on Route 9.',
  'The artist showed sketches without grand labels.',
  'The ski trail was groomed late when the temperature dropped.',
  'We talked about lunch boxes, commutes, and vacation days at work.',
  'The plumber replaced the washer and shut the water off first.',
  'The priest spoke briefly about practical help for neighbors.',
  'Birds returned early when the last snowbank shrank.',
  'The shop discounted winter coats and posted prices at the door.',
  'The lawyer summarized the contract without legalese piles.',
  'The digger was audible while crews laid new pipe.',
  'The gardener watered the greenhouse and noted humidity.',
  'We ate herring and potatoes at midsummer without speeches.',
  'The fire department practiced ice rescue with safety lines.',
  'The farmer grumbled about drought but the harvest was acceptable.',
  'The child read aloud from a book with short sentences.',
  'The town texted residents about trash pickup changes.',
  'The carpenter fit the door and sanded the trim smooth.',
  'We walked by the creek and discussed future repairs.',
  'The doctor recommended walks instead of extra pills.',
  'The window leaked in the storm and the landlord replaced seals.',
  'Students presented tables of results without hype.',
  'The bakery sold buns on Tuesday and the line reached the sidewalk.',
  'We changed tires in the garage and checked brake fluid.',
  'Shipping warned of fog banks near the islands.',
  'The instructor wrote clear steps on the board.',
  'The nurse weighed the baby and recorded ounces.',
  'The bus broke down and riders waited on the bench.',
  'The cashier counted change twice for the elderly customer.',
  'The team shipped a patch that fixed the duplicate key error.',
  'Rain paused long enough for us to walk the dog.',
  'The museum moved the exhibit one room over for lighting.',
  'The cashier forgot to scan one item; we went back inside.',
  'The hostel posted quiet hours after eleven.',
  'The coach subbed two players at halftime.',
  'The clerk stamped the form and handed back the copy.',
  'We missed the ferry and took the slower coastal bus.',
  'The janitor mopped the hall after the dance.',
  'The ranger pointed out trail markers on the map.',
  'The cashier shorted me a dollar; she fixed it at once.',
  'The oven timer failed so the bread browned too fast.',
  'The clerk filed the permit under the wrong date.',
  'We forgot umbrellas and shared one jacket as a hood.',
  'The dog barked at the mail carrier, then wagged its tail.',
  'The tenant painted one wall blue without asking.',
  'The landlord raised rent by forty dollars starting in April.',
  'The washer shook on spin cycle until we leveled the feet.',
  'The dryer lint trap was full; we cleaned it before the next load.',
  'The microwave beeped five times; we silenced it in settings.',
  'The fridge door seal cracked; cold air leaked until we replaced it.',
  'The stove burner clicked before it lit.',
  'We labeled moving boxes by room with a thick marker.',
  'The moving truck scraped the mailbox on the way out.',
  'The package arrived wet; the books dried on the rack.',
  'The envelope had no return address; we opened it carefully.',
  'The stamp peeled off; we taped it flat.',
  'The postcard showed a harbor from the 1970s.',
  'The pen leaked in my pocket; ink stained the shirt cuff.',
  'The pencil broke; I borrowed a sharpener from the desk.',
  'The notebook paper was thin; ink bled through.',
  'The highlighter dried out halfway through the page.',
  'The eraser crumbled into crumbs on the desk.',
  'The ruler snapped when I stepped on it.',
  'The glue stick ran empty mid-project.',
  'The scissors cut fabric but not wire.',
  'The tape lost stickiness after sitting in the sun.',
  'The stapler jammed on page twelve.',
  'The paper clip bent when I twisted it.',
  'The rubber band snapped when I stretched it too far.',
];

function main() {
  const lines = [];
  let round = 0;
  while (lines.length < 6000) {
    for (let i = 0; i < SENTENCES.length && lines.length < 6000; i++) {
      lines.push(`${SENTENCES[i]} (pass ${round}, line ${lines.length + 1}).`);
    }
    round++;
  }
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, OUT)} (${lines.length} lines)`);
}

main();
