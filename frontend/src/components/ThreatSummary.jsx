function buildSummary(result) {
  const { verdict, confidence, attack_type, features, flagged_features = [] } = result
  const isMalicious = verdict === 'Malicious'
  const lines = []

  if (!isMalicious) {
    lines.push(`This indicator shows no significant signs of malicious activity. The classifier returned a confidence of ${confidence}%.`)
    if (features.uses_https) lines.push('The URL uses HTTPS, indicating an encrypted connection.')
    if (!features.is_ip_host && features.subdomain_count === 0) lines.push('The domain structure is clean with no suspicious subdomains.')
    return lines
  }

  lines.push(`This indicator has been classified as ${attack_type || 'Malicious'} with ${confidence}% confidence. The following signals contributed to this verdict:`)

  if (flagged_features.includes('brand_impersonation'))
    lines.push('A known brand name appears in the domain without it being that brand\'s legitimate registered domain — a common brand impersonation technique.')
  if (flagged_features.includes('suspicious_keyword_hit'))
    lines.push(`The URL contains a suspicious keyword ("${features.suspicious_keyword_hit}") commonly used in phishing pages to appear legitimate.`)
  if (flagged_features.includes('suspicious_tld'))
    lines.push('The top-level domain is in a known abuse-prone category frequently used in phishing infrastructure.')
  if (flagged_features.includes('is_ip_host'))
    lines.push('The domain is a raw IP address rather than a named domain — legitimate websites almost never use raw IPs.')
  if (flagged_features.includes('is_shortened'))
    lines.push('This URL uses a shortening service, which is often used to conceal the real destination from victims.')
  if (flagged_features.includes('homograph_detected'))
    lines.push(`An IDN homograph attack was detected. The domain uses Unicode characters to visually impersonate "${features.lookalike_domain}".`)
  if (flagged_features.includes('is_proxy_or_hosting'))
    lines.push('The IP address belongs to a proxy or hosting provider commonly used as attack infrastructure.')
  if (flagged_features.includes('blacklist_status'))
    lines.push('This indicator was found on a known threat intelligence blacklist.')

  if (lines.length === 1)
    lines.push('Multiple structural URL characteristics match patterns commonly seen in malicious domains.')

  return lines
}

export default function ThreatSummary({ result }) {
  const lines = buildSummary(result)
  const isMalicious = result.verdict === 'Malicious'

  return (
    <div className="card p-6 animate-fade-up">
      <p className="label mb-4">Threat Summary</p>
      <div className="flex flex-col gap-3">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              i === 0 ? 'text-primary font-medium' : 'text-muted'
            }`}
          >
            {i > 0 && isMalicious && (
              <span className="inline-block w-1 h-1 rounded-full bg-threat mr-2 mb-0.5 align-middle" />
            )}
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
