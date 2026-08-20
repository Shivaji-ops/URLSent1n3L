const LABELS = {
  // URL features
  url_length:            'URL Length',
  hostname_length:       'Hostname Length',
  path_length:           'Path Length',
  count_dots:            'Dot Count',
  count_hyphens:         'Hyphen Count',
  count_underscores:     'Underscore Count',
  count_slashes:         'Slash Count',
  count_question_marks:  'Question Marks',
  count_equals:          'Equals Signs',
  count_at:              '@ Symbols',
  count_digits:          'Digit Count',
  digit_ratio:           'Digit Ratio',
  is_ip_host:            'IP as Domain',
  uses_https:            'Uses HTTPS',
  subdomain_count:       'Subdomain Count',
  suspicious_tld:        'Suspicious TLD',
  brand_impersonation:   'Brand Impersonation',
  suspicious_keyword_hit:'Suspicious Keyword',
  is_shortened:          'URL Shortener',
  url_entropy:           'URL Entropy',
  // IDN features (future)
  homograph_detected:    'Homograph Attack',
  lookalike_domain:      'Lookalike Domain',
  unicode_chars_found:   'Unicode Characters',
  // IP features
  country:               'Country',
  isp:                   'ISP',
  asn:                   'ASN',
  is_proxy_or_hosting:   'Proxy / Hosting',
  lookup_status:         'Lookup Status',
}

const HIDDEN = new Set(['lookup_status'])

function formatValue(key, value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(3)
  return String(value)
}

export default function EvidenceLog({ result }) {
  const entries = Object.entries(result.features).filter(([k]) => !HIDDEN.has(k))
  const flagged = new Set(result.flagged_features || [])

  return (
    <div className="card p-6 animate-fade-up">
      <p className="label mb-4">Evidence Log</p>
      <div className="divide-y divide-border">
        {entries.map(([key, value]) => {
          const isFlagged = flagged.has(key)
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-4 py-2.5 px-2 -mx-2 rounded
                          ${isFlagged ? 'bg-red-50' : ''}`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isFlagged ? 'bg-threat' : 'bg-border'
                  }`}
                />
                <span className={isFlagged ? 'text-threat font-medium' : 'text-muted'}>
                  {LABELS[key] || key}
                </span>
              </div>
              <span className={`font-mono text-sm ${isFlagged ? 'text-threat font-semibold' : 'text-primary'}`}>
                {formatValue(key, value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
