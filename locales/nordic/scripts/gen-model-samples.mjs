#!/usr/bin/env node
/**
 * gen-model-samples.mjs — generate nb/da model text through the HALO Foundry APIM gateway.
 *
 * Usage: APIM_KEY=<tenant subscription key> node gen-model-samples.mjs <nb|da> <outDir> <model,model,...>
 * Writes <outDir>/<model>.txt, texts separated by a line containing only =====, each text tagged
 * with a leading <<topic:N>> line so build-wordlist.mjs can require an n-gram to span several topics.
 * Fails closed: no key or any non-2xx -> that text is skipped and the run exits non-zero; there is no
 * fallback path. Neutral everyday topics only; no customer text.
 */
import fs from 'node:fs';
import path from 'node:path';

const [lang, outDir, modelList] = process.argv.slice(2);
const KEY = process.env.APIM_KEY;
const BASE = process.env.APIM_BASE || 'https://halo-fdry-apim.azure-api.net';
if (!KEY || !['nb', 'da'].includes(lang) || !outDir || !modelList) {
  console.error('usage: APIM_KEY=... node gen-model-samples.mjs <nb|da> <outDir> <model,...>');
  process.exit(2);
}

const LANG_NAME = { nb: 'norsk bokmål', da: 'dansk' };
const TOPICS = {
  nb: [
    'hjemmekontor',
    'trening for kontorarbeidere',
    'sikkerhetskopiering for små bedrifter',
    'turtips for Lofoten',
    'programmering for barn',
    'bærekraftig turisme',
    'å skrive en god CV',
    'elbil eller bensinbil',
    'å bygge bolig',
    'søvn og helse',
    'kunstig intelligens i helsevesenet',
    'strømsparing om vinteren',
    'å starte eget firma',
    'mindfulness og stress',
    'vanlige svindelforsøk på nett',
    'ungdom og sosiale medier',
    'å lære et nytt språk',
    'kollektivtransport i byene',
    'sunt kosthold for barn',
    'personvern i hverdagen',
    'frivillig arbeid',
    'økonomi for førstegangskjøpere av bolig',
    'lederskap i små team',
    'klimatilpasning i kommunene',
    'norsk kaffekultur',
    'å pusse opp badet',
    'fjellvett om vinteren',
    'passord og tofaktorautentisering',
    'fordeler med å lese skjønnlitteratur',
    'hagearbeid for nybegynnere',
    'brukt eller nytt: handel med bruktvarer',
    'eldre og digitale tjenester',
    'å holde en god presentasjon',
    'matsvinn i husholdningen',
    'fremtidens skole',
    'sykling til jobb',
    'hvordan velge pensjonssparing',
    'lokalmat og matturisme',
    'overgangen til fornybar energi',
    'å takle jobbintervjuer',
  ],
  da: [
    'hjemmearbejde',
    'motion for kontoransatte',
    'backup for små virksomheder',
    'turtips til Bornholm',
    'programmering for børn',
    'bæredygtig turisme',
    'at skrive et godt CV',
    'elbil eller benzinbil',
    'at bygge hus',
    'søvn og sundhed',
    'kunstig intelligens i sundhedsvæsenet',
    'at spare på strømmen om vinteren',
    'at starte egen virksomhed',
    'mindfulness og stress',
    'almindelige svindelforsøg på nettet',
    'unge og sociale medier',
    'at lære et nyt sprog',
    'kollektiv trafik i byerne',
    'sund kost til børn',
    'privatliv i hverdagen',
    'frivilligt arbejde',
    'økonomi for førstegangskøbere af bolig',
    'ledelse af små teams',
    'klimatilpasning i kommunerne',
    'dansk kaffekultur',
    'at renovere badeværelset',
    'sikkerhed på fjeldet om vinteren',
    'adgangskoder og tofaktorgodkendelse',
    'fordele ved at læse skønlitteratur',
    'havearbejde for begyndere',
    'brugt eller nyt: handel med brugte varer',
    'ældre og digitale tjenester',
    'at holde en god præsentation',
    'madspild i husholdningen',
    'fremtidens skole',
    'at cykle på arbejde',
    'hvordan man vælger pensionsopsparing',
    'lokal mad og madturisme',
    'omstillingen til vedvarende energi',
    'at klare jobsamtaler',
  ],
};
const FORMS = [
  (t, l) => `Skriv en informativ artikkel (ca. 250 ord) på ${l} om: ${t}.`,
  (t, l) =>
    `Svar på et spørsmål fra en leser på ${l}: «Kan du forklare litt om ${t}?» Svar med 3–4 avsnitt.`,
];

async function gen(model, prompt) {
  const r = await fetch(`${BASE}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 4000,
    }),
  });
  if (!r.ok) throw new Error(`${model} HTTP ${r.status}`);
  const j = await r.json();
  const text = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${model} empty completion`);
  return text;
}

fs.mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const model of modelList.split(',')) {
  const jobs = TOPICS[lang].map((t, i) => ({ i, p: FORMS[i % 2](t, LANG_NAME[lang]) }));
  const out = [];
  for (let i = 0; i < jobs.length; i += 5) {
    const res = await Promise.allSettled(jobs.slice(i, i + 5).map((j) => gen(model, j.p)));
    res.forEach((x, k) => {
      if (x.status === 'fulfilled') out.push(`<<topic:${jobs[i + k].i}>>\n${x.value}`);
      else {
        failed++;
        console.error(String(x.reason?.message || x.reason).slice(0, 120));
      }
    });
  }
  fs.writeFileSync(path.join(outDir, `${model}.txt`), out.join('\n=====\n'));
  console.log(`${lang} ${model}: ${out.length}/${jobs.length}`);
}
process.exit(failed ? 1 : 0);
