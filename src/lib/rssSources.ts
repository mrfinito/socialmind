// Predefiniowane źródła RSS pogrupowane po branżach
// Tylko portale z aktywnymi feedami RSS (sprawdzone)

export interface RSSSource {
  id: string
  name: string
  url: string
  rss: string
  category: string
}

export const RSS_SOURCES: RSSSource[] = [
  // === MARKETING / REKLAMA / PR ===
  { id: 'wirtualne-media',  name: 'Wirtualne Media',  url: 'https://www.wirtualnemedia.pl', rss: 'https://www.wirtualnemedia.pl/rss/news.xml', category: 'marketing' },
  { id: 'nowy-marketing',   name: 'Nowy Marketing',   url: 'https://nowymarketing.pl',      rss: 'https://nowymarketing.pl/feed',                category: 'marketing' },
  { id: 'press-pl',         name: 'Press',            url: 'https://www.press.pl',           rss: 'https://www.press.pl/rss/wszystkie',           category: 'marketing' },
  { id: 'marketingibiznes', name: 'Marketing i Biznes', url: 'https://marketingibiznes.pl', rss: 'https://marketingibiznes.pl/feed/',            category: 'marketing' },
  { id: 'sprawnymarketing', name: 'Sprawny Marketing', url: 'https://sprawnymarketing.pl', rss: 'https://sprawnymarketing.pl/feed/',              category: 'marketing' },

  // === BIZNES / EKONOMIA ===
  { id: 'forbes-pl',        name: 'Forbes Polska',     url: 'https://www.forbes.pl',         rss: 'https://www.forbes.pl/rss',                    category: 'biznes' },
  { id: 'businessinsider',  name: 'Business Insider',  url: 'https://businessinsider.com.pl', rss: 'https://businessinsider.com.pl/.feed',         category: 'biznes' },
  { id: 'puls-biznesu',     name: 'Puls Biznesu',      url: 'https://www.pb.pl',             rss: 'https://www.pb.pl/rss',                        category: 'biznes' },
  { id: 'money-pl',         name: 'Money.pl',          url: 'https://www.money.pl',          rss: 'https://www.money.pl/rss/',                    category: 'biznes' },
  { id: 'rzeczpospolita',   name: 'Rzeczpospolita',    url: 'https://www.rp.pl',             rss: 'https://www.rp.pl/rss',                        category: 'biznes' },

  // === TECH / IT / AI ===
  { id: 'spider-web',       name: 'Spider\'s Web',     url: 'https://spidersweb.pl',         rss: 'https://spidersweb.pl/feed',                   category: 'tech' },
  { id: 'antyweb',          name: 'AntyWeb',           url: 'https://antyweb.pl',            rss: 'https://antyweb.pl/feed',                      category: 'tech' },
  { id: 'sztuczna-inteligencja', name: 'AI Business',  url: 'https://aibusiness.pl',         rss: 'https://aibusiness.pl/feed',                   category: 'tech' },
  { id: 'crn-pl',           name: 'CRN Polska',        url: 'https://crn.pl',                rss: 'https://crn.pl/feed/',                         category: 'tech' },
  { id: 'computerworld',    name: 'Computerworld',     url: 'https://www.computerworld.pl', rss: 'https://www.computerworld.pl/rss',              category: 'tech' },

  // === E-COMMERCE / RETAIL ===
  { id: 'ehandel',          name: 'eHandel',           url: 'https://www.ehandel.com.pl',    rss: 'https://www.ehandel.com.pl/rss',               category: 'ecommerce' },
  { id: 'wiadomosci-handlowe', name: 'Wiadomości Handlowe', url: 'https://www.wiadomoscihandlowe.pl', rss: 'https://www.wiadomoscihandlowe.pl/rss', category: 'ecommerce' },
  { id: 'dlahandlu',        name: 'dlaHandlu',         url: 'https://www.dlahandlu.pl',      rss: 'https://www.dlahandlu.pl/rss/news',           category: 'ecommerce' },

  // === MODA / LIFESTYLE ===
  { id: 'fashion-business', name: 'Fashion Biznes',    url: 'https://fashionbiznes.pl',      rss: 'https://fashionbiznes.pl/feed/',               category: 'moda' },

  // === FOOD / HORECA ===
  { id: 'horecanet',        name: 'Horecanet',         url: 'https://www.horecanet.pl',      rss: 'https://www.horecanet.pl/rss',                 category: 'food' },
  { id: 'portalspozywczy',  name: 'Portal Spożywczy',  url: 'https://www.portalspozywczy.pl', rss: 'https://www.portalspozywczy.pl/rss/news.xml', category: 'food' },

  // === AUTOMOTIVE ===
  { id: 'auto-swiat',       name: 'Auto Świat',        url: 'https://www.auto-swiat.pl',     rss: 'https://www.auto-swiat.pl/api/rss',            category: 'auto' },
  { id: 'motofakty',        name: 'Motofakty',         url: 'https://www.motofakty.pl',      rss: 'https://www.motofakty.pl/rss',                 category: 'auto' },

  // === ZDROWIE / FARMA ===
  { id: 'rynek-zdrowia',    name: 'Rynek Zdrowia',     url: 'https://www.rynekzdrowia.pl',   rss: 'https://www.rynekzdrowia.pl/rss/news.xml',     category: 'zdrowie' },
  { id: 'medexpress',       name: 'Medexpress',        url: 'https://www.medexpress.pl',     rss: 'https://www.medexpress.pl/rss',                category: 'zdrowie' },

  // === FINANSE / BANKOWOŚĆ ===
  { id: 'bankier',          name: 'Bankier.pl',        url: 'https://www.bankier.pl',        rss: 'https://www.bankier.pl/rss/wiadomosci.xml',    category: 'finanse' },
  { id: 'cashless',         name: 'Cashless.pl',       url: 'https://www.cashless.pl',       rss: 'https://www.cashless.pl/feed',                 category: 'finanse' },

  // === NIERUCHOMOŚCI ===
  { id: 'rynek-pierwotny',  name: 'Rynek Pierwotny',   url: 'https://rynekpierwotny.pl',     rss: 'https://rynekpierwotny.pl/wiadomosci/feed/',   category: 'nieruchomosci' },

  // === EDUKACJA ===
  { id: 'edukacja-perspektywy', name: 'Perspektywy', url: 'https://perspektywy.pl', rss: 'https://www.perspektywy.pl/portal/index.php?format=feed&type=rss', category: 'edukacja' },

  // === GLOBAL TECH (EN) ===
  { id: 'techcrunch',       name: 'TechCrunch',        url: 'https://techcrunch.com',        rss: 'https://techcrunch.com/feed/',                 category: 'tech-en' },
  { id: 'theverge',         name: 'The Verge',         url: 'https://www.theverge.com',      rss: 'https://www.theverge.com/rss/index.xml',       category: 'tech-en' },
  { id: 'marketingdive',    name: 'Marketing Dive',    url: 'https://www.marketingdive.com', rss: 'https://www.marketingdive.com/feeds/news/',    category: 'marketing-en' },
  { id: 'adweek',           name: 'Adweek',            url: 'https://www.adweek.com',        rss: 'https://www.adweek.com/feed/',                 category: 'marketing-en' },
]

export const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  marketing:      { label: 'Marketing & Reklama', emoji: '📣' },
  biznes:         { label: 'Biznes & Ekonomia',   emoji: '💼' },
  tech:           { label: 'Tech & IT',           emoji: '💻' },
  ecommerce:      { label: 'E-commerce',          emoji: '🛒' },
  moda:           { label: 'Moda & Lifestyle',    emoji: '👗' },
  food:           { label: 'Food & HoReCa',       emoji: '🍴' },
  auto:           { label: 'Automotive',          emoji: '🚗' },
  zdrowie:        { label: 'Zdrowie & Farma',     emoji: '⚕️' },
  finanse:        { label: 'Finanse & Bankowość', emoji: '💰' },
  nieruchomosci:  { label: 'Nieruchomości',       emoji: '🏘️' },
  edukacja:       { label: 'Edukacja',            emoji: '🎓' },
  'tech-en':      { label: 'Tech (EN)',           emoji: '🌐' },
  'marketing-en': { label: 'Marketing (EN)',      emoji: '🌍' },
}
