// Domain color constants — mirrors DOMAIN_COLORS from @opencosmos/ui/knowledge-graph.
// Kept local so the server component trace never touches sigma/WebGL modules.
export const DOMAIN_COLORS: Record<string, string> = {
  philosophy:  '#f4a261',
  literature:  '#6b9ee8',
  buddhism:    '#74c69d',
  taoism:      '#52b788',
  indigenous:  '#e07b54',
  cross:       '#c77dff',
  ecology:     '#74c69d',
  vedic:       '#ffd166',
  opencosmos:  '#e9c46a',
  stoicism:    '#a8c5da',
  sufism:      '#d4a5c9',
  science:     '#7ec8e3',
  psychology:  '#b8b4e0',
  art:         '#f9c74f',
  ai:          '#90e0ef',
  default:     '#8b949e',
}
