/** Narrative copy per stage. Content, not layout — edit freely. */
export interface StageCopy {
  index: string;
  name: string;
  hue: string;
  headline: string;
  body: string;
  rows: Array<{ k: string; v: string; accent?: string }>;
}

export const STAGE_COPY: StageCopy[] = [
  {
    index: '01',
    name: 'EXPOSURE',
    hue: 'oklch(72% 0.13 255)',
    headline: 'A blocklist always arrives late.',
    body:
      'Malicious domains are registered by the thousand and live for hours. A database of known-bad URLs can only describe yesterday\u2019s campaigns \u2014 every fresh domain enters the world unlisted, and trusted.',
    rows: [
      { k: 'NEW DOMAINS / DAY', v: '200 K+' },
      { k: 'CAMPAIGN LIFESPAN', v: '< 24 h' },
      { k: 'SIGNATURE COVERAGE', v: 'Reactive only', accent: 'oklch(72% 0.16 30)' }
    ]
  },
  {
    index: '02',
    name: 'EXTRACTION',
    hue: 'oklch(72% 0.13 255)',
    headline: 'Nineteen features, no list required.',
    body:
      'Each indicator flattens into a lexical vector \u2014 length, entropy, token depth, digit and symbol ratios, keyword signals, host shape. A Random Forest, selected over three competing models, scores it as it arrives.',
    rows: [
      { k: 'MODELS EVALUATED', v: '4' },
      { k: 'DATASET BIASES CORRECTED', v: '3' }
    ]
  },
  {
    index: '03',
    name: 'HOMOGRAPH',
    hue: 'oklch(70% 0.17 20)',
    headline: 'One character no matcher can see.',
    body:
      'An IDN homograph swaps a Latin glyph for a visually identical Unicode codepoint. The string matches nothing on any list, and reads as legitimate to the human eye.',
    rows: [
      { k: 'STRING MATCHER', v: 'no hit' },
      { k: 'CONFUSABLES SOURCE', v: 'Unicode Consortium' }
    ]
  },
  {
    index: '04',
    name: 'ENRICHMENT',
    hue: 'oklch(72% 0.14 300)',
    headline: 'Four evidence streams, one verdict.',
    body:
      'The lexical score is corroborated: IP reputation with proxy and hosting detection, WHOIS domain age, and page content read for credential-harvesting indicators. Every verdict ships with the evidence that produced it.',
    rows: [
      { k: 'IP REPUTATION', v: 'Hosting / proxy', accent: 'oklch(74% 0.18 22)' },
      { k: 'WHOIS DOMAIN AGE', v: '6 hours' },
      { k: 'PAGE CONTENT', v: 'Credential form' }
    ]
  },
  {
    index: '05',
    name: 'DECISION',
    hue: 'oklch(78% 0.15 148)',
    headline: 'The analyst closes the loop.',
    body:
      'Allow, Block or Escalate is written back as labelled ground truth. The active-learning set grows with every decision, and the model is retrained against the threats analysts actually see.',
    rows: [
      { k: 'DECISIONS CAPTURED', v: 'All' },
      { k: 'RETRAINING SET', v: 'Active learning' }
    ]
  }
];
