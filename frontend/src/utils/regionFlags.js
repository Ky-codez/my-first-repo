// Maps region/location text → { country, iso }
// iso = 2-letter ISO 3166-1 alpha-2 code used by the flag-icons CSS library
// Checks via case-insensitive substring match; first match wins.
const REGION_MAP = [
  // New Zealand
  { terms: ['central otago', 'marlborough', 'hawke\'s bay', 'hawkes bay', 'martinborough', 'waiheke', 'gisborne', 'nelson', 'canterbury', 'wairarapa', 'northland', 'auckland', 'new zealand', 'nz'], abbr: ['new zealand', 'nz'], country: 'New Zealand', iso: 'nz' },
  // Australia
  { terms: ['barossa', 'coonawarra', 'hunter valley', 'margaret river', 'mclaren vale', 'clare valley', 'eden valley', 'yarra valley', 'heathcote', 'rutherglen', 'tasmania', 'adelaide hills', 'great southern', 'swan valley', 'grampians', 'mornington peninsula', 'south australia', 'victoria', 'western australia', 'new south wales', 'queensland', 'australia'], abbr: ['australia', 'au'], country: 'Australia', iso: 'au' },
  // France
  { terms: [
      'bordeaux', 'saint-émilion', 'saint emilion', 'pomerol', 'médoc', 'medoc', 'graves', 'sauternes', 'pauillac', 'margaux', 'saint-julien', 'saint julien',
      'burgundy', 'bourgogne', 'côte de nuits', 'cote de nuits', 'côte de beaune', 'cote de beaune', "côte d'or", "cote d'or", 'gevrey', 'chambolle', 'vosne', 'nuits-saint-georges', 'meursault', 'puligny', 'chassagne',
      'champagne', 'reims', 'épernay', 'epernay',
      'alsace', 'alsatian',
      'loire', 'loire valley', 'muscadet', 'vouvray', 'chinon', 'bourgueil', 'sancerre', 'pouilly', 'anjou', 'touraine',
      'rhône', 'rhone', 'rhône valley', 'rhone valley', 'châteauneuf-du-pape', 'chateauneuf-du-pape', 'châteauneuf', 'chateauneuf', 'crozes-hermitage', 'hermitage', 'gigondas', 'vacqueyras', 'côte-rôtie', 'cote-rotie', 'condrieu',
      'provence', 'bandol', 'cassis',
      'languedoc', 'roussillon', 'languedoc-roussillon', 'fitou', 'corbières', 'corbieres', 'minervois',
      'beaujolais', 'moulin-à-vent', 'moulin-a-vent', 'fleurie', 'morgon', 'brouilly',
      'chablis', 'mâcon', 'macon', 'pouilly-fuissé', 'pouilly-fuisse',
      'jura', 'savoie',
      'france', 'french',
    ], abbr: ['france', 'fr'], country: 'France', iso: 'fr' },
  // Italy
  { terms: [
      'tuscany', 'toscana', 'chianti', 'brunello', 'montalcino', 'montepulciano', 'bolgheri', 'super tuscan', 'maremma', 'morellino',
      'piedmont', 'piemonte', 'barolo', 'barbaresco', 'barbera', 'dolcetto', 'gavi', 'asti', 'moscato',
      'veneto', 'amarone', 'valpolicella', 'soave', 'prosecco', 'bardolino',
      'friuli', 'friuli venezia giulia',
      'trentino', 'alto adige', 'südtirol', 'sudtirol',
      'lombardy', 'lombardia', 'franciacorta', 'oltrepò pavese',
      'emilia-romagna', 'emilia romagna', 'lambrusco',
      'umbria', 'sagrantino', 'orvieto',
      'marche', 'verdicchio',
      'abruzzo', "montepulciano d'abruzzo",
      'campania', 'taurasi', 'fiano', 'greco di tufo',
      'puglia', 'apulia', 'primitivo', 'negroamaro', 'salento',
      'basilicata', 'aglianico del vulture',
      'calabria',
      'sicily', 'sicilia', 'etna', "nero d'avola", 'marsala',
      'sardinia', 'sardegna', 'vermentino', 'cannonau',
      'italy', 'italian',
    ], abbr: ['italy'], country: 'Italy', iso: 'it' },
  // Spain
  { terms: [
      'rioja', 'ribera del duero', 'priorat', 'penedès', 'penedes', 'rias baixas', 'rías baixas',
      'galicia', 'jerez', 'sherry', 'manzanilla', 'fino',
      'catalonia', 'catalunya', 'cava', 'montsant',
      'rueda', 'toro', 'bierzo', 'valdepeñas', 'valdepenas',
      'navarra', 'aragon', 'aragón', 'somontano',
      'jumilla', 'yecla', 'bullas', 'alicante', 'utiel-requena',
      'la mancha', 'castilla', 'andalusia', 'andalucía',
      'canary islands', 'islas canarias', 'lanzarote',
      'spain', 'spanish',
    ], abbr: ['spain', 'es'], country: 'Spain', iso: 'es' },
  // Portugal
  { terms: [
      'douro', 'porto', 'port wine', 'vintage port',
      'alentejo', 'vinho verde', 'dão', 'dao', 'bairrada',
      'setúbal', 'setubal', 'palmela',
      'madeira', 'tejo', 'lisboa', 'lisbon',
      'baga', 'algarve', 'trás-os-montes', 'tras-os-montes',
      'portugal', 'portuguese',
    ], abbr: ['portugal', 'pt'], country: 'Portugal', iso: 'pt' },
  // Germany
  { terms: [
      'mosel', 'rheingau', 'rheinhessen', 'pfalz', 'franken', 'nahe', 'ahr',
      'baden', 'württemberg', 'wurttemberg', 'mittelrhein', 'hessische bergstraße',
      'germany', 'german', 'deutschland',
    ], abbr: ['germany', 'de', 'deutschland'], country: 'Germany', iso: 'de' },
  // Austria
  { terms: [
      'wachau', 'burgenland', 'kamptal', 'kremstal', 'steiermark', 'styria',
      'neusiedlersee', 'weinviertel', 'thermenregion', 'carnuntum', 'traisental',
      'austria', 'austrian',
    ], abbr: ['austria', 'at'], country: 'Austria', iso: 'at' },
  // USA
  { terms: [
      'napa', 'napa valley', 'sonoma', 'russian river', 'alexander valley', 'dry creek',
      'willamette', 'willamette valley', 'umpqua', 'rogue valley',
      'paso robles', 'santa barbara', 'santa ynez', 'santa rita hills', 'santa cruz mountains',
      'columbia valley', 'walla walla', 'yakima',
      'finger lakes', 'hudson valley', 'long island',
      'california', 'oregon', 'washington state', 'new york', 'virginia', 'texas hill country',
      'usa', 'united states', 'american',
    ], abbr: ['united states', 'usa', 'us'], country: 'USA', iso: 'us' },
  // Argentina
  { terms: [
      'mendoza', 'luján de cuyo', 'lujan de cuyo', 'maipú', 'maipu', 'valle de uco', 'uco valley',
      'salta', 'cafayate', 'san juan', 'patagonia', 'río negro', 'rio negro', 'neuquén', 'neuquen',
      'argentina', 'argentinian',
    ], abbr: ['argentina', 'ar'], country: 'Argentina', iso: 'ar' },
  // Chile
  { terms: [
      'maipo', 'maipo valley', 'colchagua', 'colchagua valley', 'casablanca valley', 'san antonio',
      'aconcagua', 'rapel', 'cachapoal', 'curicó', 'curico', 'maule', 'bio bio', 'bío-bío',
      'atacama', 'coquimbo', 'limari', 'elqui',
      'chile', 'chilean',
    ], abbr: ['chile', 'cl'], country: 'Chile', iso: 'cl' },
  // South Africa
  { terms: [
      'stellenbosch', 'franschhoek', 'paarl', 'swartland', 'constantia', 'walker bay',
      'elgin', 'robertson', 'worcester', 'cape winelands', 'overberg',
      'south africa', 'south african',
    ], abbr: ['south africa', 'za'], country: 'South Africa', iso: 'za' },
  // Greece
  { terms: [
      'santorini', 'nemea', 'naoussa', 'crete', 'peloponnese', 'assyrtiko',
      'xinomavro', 'agiorgitiko', 'muscat of samos', 'samos', 'kefalonia', 'mantinia',
      'greece', 'greek',
    ], abbr: ['greece', 'gr'], country: 'Greece', iso: 'gr' },
  // Hungary
  { terms: ['tokaj', 'tokay', 'eger', 'villány', 'villany', 'szekszárd', 'szekszard', 'badacsony', 'hungary', 'hungarian'], abbr: ['hungary', 'hu'], country: 'Hungary', iso: 'hu' },
  // Georgia
  { terms: ['kakheti', 'kartli', 'rkatsiteli', 'saperavi', 'qvevri', 'georgia', 'georgian wine'], abbr: ['georgia', 'ge'], country: 'Georgia', iso: 'ge' },
  // Lebanon
  { terms: ['bekaa valley', 'beqaa', 'baalbek', 'zahle', 'lebanon', 'lebanese'], abbr: ['lebanon', 'lb'], country: 'Lebanon', iso: 'lb' },
  // Israel
  { terms: ['galilee', 'upper galilee', 'golan heights', 'samson', 'negev', 'judean hills', 'israel', 'israeli'], abbr: ['israel', 'il'], country: 'Israel', iso: 'il' },
  // Switzerland
  { terms: ['valais', 'vaud', 'geneva', 'ticino', 'graubünden', 'graubunden', 'neuchâtel', 'neuchatel', 'switzerland', 'swiss'], abbr: ['switzerland', 'ch'], country: 'Switzerland', iso: 'ch' },
  // Japan
  { terms: ['yamanashi', 'nagano', 'koshu', 'hokkaido', 'yamagata', 'japan', 'japanese'], abbr: ['japan', 'jp'], country: 'Japan', iso: 'jp' },
  // China
  { terms: ['ningxia', 'xinjiang', 'yunnan', 'hebei', 'shandong', 'china', 'chinese'], abbr: ['china', 'cn'], country: 'China', iso: 'cn' },
  // Canada
  { terms: ['okanagan', 'okanagan valley', 'niagara', 'niagara peninsula', 'british columbia', 'ontario', 'nova scotia', 'canada', 'canadian'], abbr: ['canada', 'ca'], country: 'Canada', iso: 'ca' },
  // Brazil
  { terms: ['vale dos vinhedos', 'serra gaúcha', 'serra gaucha', 'campanha gaúcha', 'campanha gaucha', 'brazil', 'brasil'], abbr: ['brazil', 'brasil', 'br'], country: 'Brazil', iso: 'br' },
  // Uruguay
  { terms: ['canelones', 'maldonado', 'colonia', 'montevideo', 'uruguay'], abbr: ['uruguay', 'uy'], country: 'Uruguay', iso: 'uy' },
  // England / Wales
  { terms: ['sussex', 'east sussex', 'west sussex', 'kent', 'surrey', 'hampshire', 'essex', 'english wine', 'england', 'english sparkling', 'wales', 'welsh wine'], abbr: ['england', 'wales'], country: 'England', iso: 'gb-eng' },
  // Scotland
  { terms: ['scotland', 'scottish wine'], abbr: ['scotland'], country: 'Scotland', iso: 'gb-sct' },
  // Croatia
  { terms: ['dalmatia', 'istria', 'slavonia', 'dingač', 'dingac', 'plavac mali', 'croatia', 'croatian'], abbr: ['croatia', 'hr'], country: 'Croatia', iso: 'hr' },
  // Slovenia
  { terms: ['brda', 'vipava', 'goriška brda', 'goriska brda', 'slovenia', 'slovenian'], abbr: ['slovenia', 'si'], country: 'Slovenia', iso: 'si' },
  // Romania
  { terms: ['transylvania', 'muntenia', 'dobrogea', 'dealu mare', 'cotnari', 'romania', 'romanian'], abbr: ['romania', 'ro'], country: 'Romania', iso: 'ro' },
  // Bulgaria
  { terms: ['thracian valley', 'danube plain', 'struma valley', 'melnik', 'bulgaria', 'bulgarian'], abbr: ['bulgaria', 'bg'], country: 'Bulgaria', iso: 'bg' },
  // Mexico
  { terms: ['baja california', 'valle de guadalupe', 'ensenada', 'mexico', 'mexican'], abbr: ['mexico', 'mx'], country: 'Mexico', iso: 'mx' },
];

/**
 * Given a location string, returns { country, iso } or null if no match.
 * iso is the 2-letter code for use with the flag-icons CSS library.
 */
export function regionFlag(location) {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const entry of REGION_MAP) {
    if (entry.terms.some(t => lower.includes(t))) {
      return { country: entry.country, iso: entry.iso };
    }
  }
  return null;
}

/**
 * Strips country name / abbreviations from a location string when a flag is detected,
 * so the card shows "Central Otago 🏴" instead of "Central Otago NZ 🏴".
 */
export function cleanLocation(location) {
  if (!location) return location;
  const lower = location.toLowerCase();
  for (const entry of REGION_MAP) {
    if (entry.terms.some(t => lower.includes(t))) {
      let result = location;
      for (const abbr of entry.abbr) {
        result = result.replace(new RegExp(`[,\\s]*\\b${abbr}\\b[,\\s]*`, 'gi'), ' ');
      }
      return result.trim().replace(/,\s*$/, '').trim();
    }
  }
  return location;
}
