/**
 * sv-pattern-packs.test.js — Verify the Swedish locale wires regex/phrase
 * packs into the right pattern detectors so a clean Swedish text snippet
 * fires patterns 1, 5, 6, 8, 10, 11, 12, 19, 21, 24, 25, 26, 27, 28 — the
 * detectors the English-only build cannot see.
 *
 * Counterpart to tests/swedish.test.js (which covers Pattern 7, stats, autofix).
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../../../src/analyzer.js';

function findingFor(text, id) {
  const r = analyze(text, { locale: 'sv', includeStats: false });
  return r.findings.find((f) => f.patternId === id);
}

function findingForEn(text, id) {
  const r = analyze(text, { locale: 'en', includeStats: false });
  return r.findings.find((f) => f.patternId === id);
}

describe('Swedish pattern packs (Patterns 1-12)', () => {
  it('Pattern 1 — significance inflation fires on Swedish phrasing', () => {
    const text =
      'Lanseringen banar väg för en ny era inom betallösningar och fortsätter att forma framtiden.';
    expect(findingFor(text, 1)).toBeDefined();
  });

  it('Pattern 3 — vilket/som-bisats fires (Swedish "-ing analyses")', () => {
    const text =
      'Den nya lagen träder i kraft i juli, vilket understryker behovet av tydlig vägledning för kommunerna.';
    const f = findingFor(text, 3);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThan(0);
  });

  it('Pattern 4 — Swedish promotional language fires', () => {
    const text =
      'Hotellet är inbäddat i hjärtat av en pittoresk by med ett rikt kulturarv och betagande utsikt.';
    const f = findingFor(text, 4);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('Pattern 5 — vague Swedish attributions fire', () => {
    const text =
      'Enligt rapporter och bedömare menar branschen att det finns en bred konsensus om reformen.';
    expect(findingFor(text, 5)).toBeDefined();
  });

  it('Pattern 6 — formulaic Swedish challenges fire', () => {
    const text = 'Trots utmaningarna fortsätter företaget att blomstra och vädra stormen.';
    expect(findingFor(text, 6)).toBeDefined();
  });

  it('Pattern 8 — Swedish copula avoidance fires', () => {
    const text =
      'Plattformen fungerar som ett centralt nav som utgör en motor för värdeskapande och tjänar som beslutsstöd.';
    const f = findingFor(text, 8);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('Pattern 10 — Swedish rule-of-three triad fires', () => {
    const text = 'Lösningen är sömlös, intuitiv och kraftfull.';
    expect(findingFor(text, 10)).toBeDefined();
  });

  it('Pattern 11 — Swedish synonym cycling fires', () => {
    const text =
      'Företaget sökte en lösning. Bolaget valde en metod. Organisationen implementerade ramverket.';
    const f = findingFor(text, 11);
    expect(f).toBeDefined();
  });

  it('Pattern 12 — Swedish abstract range fires', () => {
    const text =
      'Från antikens Grekland till den digitala tidsåldern har människan sökt mening i förändringen.';
    expect(findingFor(text, 12)).toBeDefined();
  });
});

describe('Swedish phrase categories (Patterns 19, 21, 23, 24)', () => {
  it('Pattern 19 — Swedish chatbot artifacts dispatch via category', () => {
    const text = 'Här är en kort sammanfattning. Hör gärna av dig om du har frågor.';
    const f = findingFor(text, 19);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('Pattern 21 — Swedish sycophantic phrases dispatch via category', () => {
    const text = 'Bra fråga! Du har helt rätt — det är en intressant observation.';
    const f = findingFor(text, 21);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('Pattern 23 — Swedish hedging stacks fire', () => {
    const text = 'Vi skulle potentiellt kunna implementera detta — det kan möjligen ge effekt.';
    const f = findingFor(text, 23);
    expect(f).toBeDefined();
  });

  it('Pattern 24 — Swedish generic conclusions fire', () => {
    const text =
      'Sammanfattningsvis kan man säga att framtiden ser ljus ut. Möjligheterna är oändliga.';
    const f = findingFor(text, 24);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });
});

describe('Swedish reasoning / structure / confidence / acknowledgment (25-28)', () => {
  it('Pattern 25 — Swedish reasoning chain fires', () => {
    const text = 'Låt oss bryta ner det här. Steg 1: vi ska överväga alternativen.';
    expect(findingFor(text, 25)).toBeDefined();
  });

  it('Pattern 26 — Swedish formulaic section header fires', () => {
    const text = '# Översikt\n\nViss text följer här.';
    expect(findingFor(text, 26)).toBeDefined();
  });

  it('Pattern 27 — Swedish confidence calibration fires', () => {
    const text =
      'Jag är säker på att detta fungerar. Det är värt att notera att resultaten varierar.';
    expect(findingFor(text, 27)).toBeDefined();
  });

  it('Pattern 28 — Swedish acknowledgment loop fires', () => {
    const text = 'För att besvara din fråga: systemet startar i juli. Du undrar över priset.';
    const f = findingFor(text, 28);
    expect(f).toBeDefined();
  });
});

describe('Pattern 7 vs Patterns 19/21/24 dedup', () => {
  it('Swedish chatbot phrase fires in Pattern 19, not double-counted in Pattern 7', () => {
    const text = 'Hör gärna av dig om du har fler frågor. Vi hjälper gärna till.';
    const r = analyze(text, { locale: 'sv', includeStats: false });
    const p7 = r.findings.find((f) => f.patternId === 7);
    const p19 = r.findings.find((f) => f.patternId === 19);
    expect(p19).toBeDefined();
    if (p7) {
      const matchedInP7 = p7.matches.some((m) =>
        /hör gärna av dig|hjälper gärna till/i.test(m.match),
      );
      expect(matchedInP7).toBe(false);
    }
  });

  it('Swedish sycophantic phrase fires in Pattern 21, not double-counted in Pattern 7', () => {
    const text = 'Bra fråga! Den förtjänar ett ordentligt svar.';
    const r = analyze(text, { locale: 'sv', includeStats: false });
    const p7 = r.findings.find((f) => f.patternId === 7);
    const p21 = r.findings.find((f) => f.patternId === 21);
    expect(p21).toBeDefined();
    if (p7) {
      const matchedInP7 = p7.matches.some((m) => /bra fråga/i.test(m.match));
      expect(matchedInP7).toBe(false);
    }
  });
});

describe('Swedish Patterns 30–35', () => {
  const neutral =
    'Kommunen genomförde en utredning om tillgängligheten vid servicekontoret. Resultaten presenterades för kommunstyrelsen i april. Beslutet fattades den 14 maj. Två handläggare ansvarar för uppföljningen under hösten 2026. Detta gäller alla berörda enheter.';

  it('Pattern 30 — passive / formal passive fires on Swedish', () => {
    const text =
      'Beslutet fattades av nämnden och dokumentet hanterades sedan av kansliet och blev godkänt.';
    expect(findingFor(text, 30)).toBeDefined();
  });

  it('Pattern 31 — Swedish adverb density fires when hedges cluster', () => {
    const text = `${neutral}\n\nUppenbarligen naturligtvis och självklart är det uppenbart att vi troligen antagligen förmodligen möjligen eventuellt måste agera konsekvent och uppenbarligen snabbt.`;
    expect(findingFor(text, 31)).toBeDefined();
  });

  it('Pattern 32 — weasel fires on curated Swedish hedge', () => {
    const text = 'Uppenbarligen menar många experter att studier visar att lösningen fungerar.';
    expect(findingFor(text, 32)).toBeDefined();
  });

  it('Pattern 33 — cliché pack fires on Swedish buzzstack', () => {
    const text =
      'Trots utmaningarna fortsätter företaget att vädra stormen och tänka utanför boxen med sömlös integration.';
    expect(findingFor(text, 33)).toBeDefined();
  });

  it('Pattern 34 — redundancy fires on Swedish tautology', () => {
    const text = 'Vi behöver en PIN-kod kod och en ATM-maskin samt en helt unik lösning.';
    const f = findingFor(text, 34);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('Pattern 35 — inclusive strict only with strict: true', () => {
    const text = 'Listan innehöll en neger och en zigenare enligt gamla journalanteckningar.';
    expect(findingFor(text, 35)).toBeUndefined();
    const rStrict = analyze(text, { locale: 'sv', includeStats: false, strict: true });
    expect(rStrict.findings.find((f) => f.patternId === 35)).toBeDefined();
  });

  it('Patterns 30–34 stay quiet on neutral Klarspråk-style prose', () => {
    const r = analyze(neutral, { locale: 'sv', includeStats: false });
    for (const id of [30, 31, 32, 33, 34]) {
      expect(
        r.findings.find((f) => f.patternId === id),
        `pattern ${id}`,
      ).toBeUndefined();
    }
  });
});

describe('English defaults unchanged by Swedish packs', () => {
  it('English text still triggers English Pattern 1 (significance inflation)', () => {
    const text = 'This serves as a testament to the evolving landscape of innovation.';
    expect(findingForEn(text, 1)).toBeDefined();
  });

  it('English Pattern 19 still fires on "I hope this helps"', () => {
    const text =
      'Here is a brief overview of the topic. I hope this helps! Let me know if you need more.';
    const f = findingForEn(text, 19);
    expect(f).toBeDefined();
    expect(f.matchCount).toBeGreaterThanOrEqual(2);
  });

  it('English Pattern 22 (filler) still fires on "in order to" / "due to the fact that"', () => {
    const text =
      'In order to comply, due to the fact that the policy changed, we updated the form.';
    expect(findingForEn(text, 22)).toBeDefined();
  });

  it('Plain neutral Swedish text still scores low overall', () => {
    const text =
      'Kommunen genomförde en utredning om tillgängligheten vid servicekontoret. Resultaten presenterades för kommunstyrelsen i april. Beslutet fattades den 14 maj. Två handläggare ansvarar för uppföljningen under hösten 2026.';
    const r = analyze(text, { locale: 'sv' });
    expect(r.score).toBeLessThan(20);
  });
});
