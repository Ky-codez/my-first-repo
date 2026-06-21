/**
 * Curated wine grape database ? ~280 varieties with aliases and shortforms.
 * Used for autocomplete in GrapesTagInput.
 * Size: ~20 KB uncompressed, negligible after gzip.
 *
 * Sources: Wine Folly, Oxford Companion to Wine, VIVC, Jancis Robinson.
 */

// Each entry: { name, aliases: string[], color: 'red'|'white'|'rosé'|'orange' }
export const GRAPE_DB = [
  // -- Major Reds ---------------------------------------------------------------
  { name: 'Cabernet Sauvignon', aliases: ['cs', 'cab sauv', 'cab', 'cabernet', 'cab s'], color: 'red' },
  { name: 'Merlot',             aliases: ['mer', 'merlot'], color: 'red' },
  { name: 'Pinot Noir',         aliases: ['pn', 'pinot', 'spätburgunder', 'spatburgunder', 'blauburgunder', 'pinot nero'], color: 'red' },
  { name: 'Syrah',              aliases: ['sy', 'shiraz', 'hermitage', 'syra'], color: 'red' },
  { name: 'Shiraz',             aliases: ['shiraz', 'syrah', 'sy'], color: 'red' },
  { name: 'Grenache',           aliases: ['gren', 'garnacha', 'cannonau', 'alicante', 'grenache noir'], color: 'red' },
  { name: 'Garnacha',           aliases: ['garnacha tinta', 'gren', 'grenache'], color: 'red' },
  { name: 'Tempranillo',        aliases: ['temp', 'tinto fino', 'tinto del pais', 'ull de llebre', 'cencibel', 'aragonez', 'roriz', 'tinta roriz', 'tinto de toro'], color: 'red' },
  { name: 'Malbec',             aliases: ['cot', 'auxerrois', 'pressac', 'côt', 'cot noir'], color: 'red' },
  { name: 'Sangiovese',         aliases: ['san', 'san giovese', 'brunello', 'prugnolo', 'morellino', 'nielluccio'], color: 'red' },
  { name: 'Nebbiolo',           aliases: ['neb', 'spanna', 'picotener', 'chiavennasca'], color: 'red' },
  { name: 'Zinfandel',          aliases: ['zin', 'primitivo', 'tribidrag', 'crljenak'], color: 'red' },
  { name: 'Barbera',            aliases: ['bb', 'barbera d\'asti', 'barbera d\'alba'], color: 'red' },
  { name: 'Dolcetto',           aliases: ['dolc', 'ormeasco'], color: 'red' },
  { name: 'Montepulciano',      aliases: ['montepulciano d\'abruzzo', 'cordisco'], color: 'red' },
  { name: 'Cabernet Franc',     aliases: ['cf', 'cab franc', 'bouchet', 'breton', 'véron'], color: 'red' },
  { name: 'Petit Verdot',       aliases: ['pv', 'petit verdot'], color: 'red' },
  { name: 'Mourvèdre',          aliases: ['mourvedre', 'monastrell', 'mataro', 'mataró'], color: 'red' },
  { name: 'Monastrell',         aliases: ['mourvedre', 'mataro', 'mourvedre'], color: 'red' },
  { name: 'Carménère',          aliases: ['carmenere', 'grande vidure'], color: 'red' },
  { name: 'Mencía',             aliases: ['mencia', 'merenzao', 'negra'], color: 'red' },
  { name: 'Touriga Nacional',   aliases: ['touriga', 'tn'], color: 'red' },
  { name: 'Touriga Franca',     aliases: ['touriga francesa'], color: 'red' },
  { name: 'Baga',               aliases: ['tinta bairrada'], color: 'red' },
  { name: 'Aglianico',          aliases: ['aglianco', 'ellanico'], color: 'red' },
  { name: "Nero d'Avola",       aliases: ['nero', 'calabrese'], color: 'red' },
  { name: 'Primitivo',          aliases: ['zinfandel', 'zin', 'tribidrag'], color: 'red' },
  { name: 'Negroamaro',         aliases: ['negro amaro'], color: 'red' },
  { name: 'Cannonau',           aliases: ['grenache', 'garnacha'], color: 'red' },
  { name: 'Nerello Mascalese',  aliases: ['nerello masc', 'nerello'], color: 'red' },
  { name: 'Nero di Troia',      aliases: ['uva di troia', 'troia'], color: 'red' },
  { name: 'Sagrantino',         aliases: ['sagrantino di montefalco'], color: 'red' },
  { name: 'Lagrein',            aliases: ['lagrain'], color: 'red' },
  { name: 'Teroldego',          aliases: ['teroldego rotaliano'], color: 'red' },
  { name: 'Schiava',            aliases: ['trollinger', 'vernatsch', 'kleinvernatsch'], color: 'red' },
  { name: 'Corvina',            aliases: ['corvina veronese'], color: 'red' },
  { name: 'Rondinella',         aliases: [], color: 'red' },
  { name: 'Molinara',           aliases: [], color: 'red' },
  { name: 'Corvinone',          aliases: [], color: 'red' },
  { name: 'Gaglioppo',          aliases: ['magliocco'], color: 'red' },
  { name: 'Frappato',           aliases: [], color: 'red' },
  { name: 'Blaufränkisch',      aliases: ['blaufrankisch', 'lemberger', 'kekfrankos', 'kékfrankos', 'frankinja', 'franconia'], color: 'red' },
  { name: 'Zweigelt',           aliases: ['rotburger', 'zweigeltrebe'], color: 'red' },
  { name: 'St. Laurent',        aliases: ['saint laurent', 'st laurent'], color: 'red' },
  { name: 'Gamay',              aliases: ['gamay noir', 'gamay beaujolais'], color: 'red' },
  { name: 'Pinot Meunier',      aliases: ['meunier', 'schwarzriesling'], color: 'red' },
  { name: 'Trousseau',          aliases: ['bastardo'], color: 'red' },
  { name: 'Poulsard',           aliases: ['ploussard', 'pelossard'], color: 'red' },
  { name: 'Mondeuse',           aliases: ['mondeuse noire', 'refosco'], color: 'red' },
  { name: 'Tannat',             aliases: ['harriague', 'moustrou'], color: 'red' },
  { name: 'Carignan',           aliases: ['carignane', 'cariñena', 'mazuelo', 'samsø'], color: 'red' },
  { name: 'Cinsault',           aliases: ['cinsaut', 'ottavianello'], color: 'red' },
  { name: 'Petite Sirah',       aliases: ['petite syrah', 'durif'], color: 'red' },
  { name: 'Graciano',           aliases: ['morrastel', 'tintilla de rota'], color: 'red' },
  { name: 'Xinomavro',          aliases: ['xino', 'naoussa', 'amyndeon'], color: 'red' },
  { name: 'Agiorgitiko',        aliases: ['agio', 'st george', 'saint george', 'nemea'], color: 'red' },
  { name: 'Mavrodaphne',        aliases: ['mavrodafni'], color: 'red' },
  { name: 'Kotsifali',          aliases: [], color: 'red' },
  { name: 'Mandilari',          aliases: ['mandilaria'], color: 'red' },
  { name: 'Liatiko',            aliases: [], color: 'red' },
  { name: 'Saperavi',           aliases: ['sap', 'saperavi kartuli'], color: 'red' },
  { name: 'Areni',              aliases: ['areni noir'], color: 'red' },
  { name: 'Mavroud',            aliases: [], color: 'red' },
  { name: 'Feteasca Neagra',    aliases: ['fetească neagră'], color: 'red' },
  { name: 'Kadarka',            aliases: ['cadarca', 'gamza'], color: 'red' },
  { name: 'Pinotage',           aliases: ['pin', 'pinotage'], color: 'red' },
  { name: 'Tinta Barroca',      aliases: ['bastardo'], color: 'red' },
  { name: 'Alfrocheiro',        aliases: ['alphocheiro'], color: 'red' },
  { name: 'Castelão',           aliases: ['castelao', 'periquita'], color: 'red' },
  { name: 'Plavac Mali',        aliases: ['plavac'], color: 'red' },
  { name: 'Teran',              aliases: ['terrano', 'refosco', 'refosk'], color: 'red' },
  { name: 'Dornfelder',         aliases: ['dorn'], color: 'red' },
  { name: 'Regent',             aliases: [], color: 'red' },
  { name: 'Lemberger',          aliases: ['blaufrankisch', 'blaufränkisch'], color: 'red' },
  { name: 'Muscat Bailey A',    aliases: ['mba', 'muscat bailey'], color: 'red' },

  // -- Major Whites -------------------------------------------------------------
  { name: 'Chardonnay',         aliases: ['chard', 'chards', 'morillon', 'aubaine', 'beaunois'], color: 'white' },
  { name: 'Sauvignon Blanc',    aliases: ['sb', 'sauv blanc', 'sauv b', 'fume blanc', 'fumé blanc'], color: 'white' },
  { name: 'Riesling',           aliases: ['ries', 'rsl', 'johannisberg riesling', 'rhine riesling'], color: 'white' },
  { name: 'Pinot Gris',         aliases: ['pg', 'pinot grigio', 'grauburgunder', 'rulander', 'malvoisie'], color: 'white' },
  { name: 'Pinot Grigio',       aliases: ['pg', 'pinot gris', 'grauburgunder'], color: 'white' },
  { name: 'Gewürztraminer',     aliases: ['gw', 'gewurz', 'gewurztraminer', 'traminer', 'savagnin rosé'], color: 'white' },
  { name: 'Viognier',           aliases: ['vio'], color: 'white' },
  { name: 'Roussanne',          aliases: ['rous', 'bergeron'], color: 'white' },
  { name: 'Marsanne',           aliases: ['mars', 'ermitage blanc'], color: 'white' },
  { name: 'Grenache Blanc',     aliases: ['gren blanc', 'garnacha blanca'], color: 'white' },
  { name: 'Rolle',              aliases: ['vermentino', 'pigato', 'favorita'], color: 'white' },
  { name: 'Vermentino',         aliases: ['rolle', 'pigato', 'favorita'], color: 'white' },
  { name: 'Muscat Blanc',       aliases: ['muscat', 'moscato', 'moscatel', 'muskat', 'muscat blanc à petits grains', 'muscat canelli'], color: 'white' },
  { name: 'Moscato',            aliases: ['muscat', 'moscatel', 'muscat blanc'], color: 'white' },
  { name: 'Chenin Blanc',       aliases: ['cb', 'chenin', 'steen', 'pineau de la loire'], color: 'white' },
  { name: 'Sémillon',           aliases: ['sem', 'semillon', 'chevrier', 'hunter valley riesling'], color: 'white' },
  { name: 'Muscadelle',         aliases: [], color: 'white' },
  { name: 'Sauvignon Gris',     aliases: ['sg', 'sauvignon rose'], color: 'white' },
  { name: 'Trebbiano',          aliases: ['ugni blanc', 'trebbiano toscano', 'saint-émilion', 'clairette ronde'], color: 'white' },
  { name: 'Malvasia',           aliases: ['malvasia bianca', 'malvazia', 'malmsey'], color: 'white' },
  { name: 'Falanghina',         aliases: ['falanghina flegrea', 'falanghina beneventana'], color: 'white' },
  { name: 'Fiano',              aliases: ['fiano di avellino', 'fiano minutolo', 'apianum'], color: 'white' },
  { name: 'Greco',              aliases: ['greco di tufo', 'grecanico', 'greco bianco'], color: 'white' },
  { name: 'Catarratto',         aliases: ['catarratto bianco'], color: 'white' },
  { name: 'Grillo',             aliases: [], color: 'white' },
  { name: 'Inzolia',            aliases: ['ansonica', 'insolia'], color: 'white' },
  { name: 'Vernaccia',          aliases: ['vernaccia di san gimignano'], color: 'white' },
  { name: 'Verdicchio',         aliases: ['verdicchio dei castelli di jesi', 'trebbiano di soave'], color: 'white' },
  { name: 'Garganega',          aliases: ['soave', 'grecanico dorato'], color: 'white' },
  { name: 'Glera',              aliases: ['prosecco'], color: 'white' },
  { name: 'Pinot Bianco',       aliases: ['pinot blanc', 'weissburgunder', 'weiss burgunder', 'klevner'], color: 'white' },
  { name: 'Pinot Blanc',        aliases: ['pinot bianco', 'weissburgunder', 'klevner'], color: 'white' },
  { name: 'Müller-Thurgau',     aliases: ['mt', 'muller-thurgau', 'muller thurgau', 'rivaner'], color: 'white' },
  { name: 'Silvaner',           aliases: ['sylvaner'], color: 'white' },
  { name: 'Grüner Veltliner',   aliases: ['gv', 'gruner', 'gruner veltliner', 'veltliner', 'grüner'], color: 'white' },
  { name: 'Welschriesling',     aliases: ['riesling italico', 'welsch riesling', 'laski rizling'], color: 'white' },
  { name: 'Furmint',            aliases: ['tokaj', 'sipon'], color: 'white' },
  { name: 'Hárslevelű',         aliases: ['harslevelu', 'linden leaf'], color: 'white' },
  { name: 'Albariño',           aliases: ['alb', 'albarino', 'alvarinho'], color: 'white' },
  { name: 'Alvarinho',          aliases: ['alb', 'albarino', 'albariño'], color: 'white' },
  { name: 'Godello',            aliases: ['god', 'gouveio', 'verdelho'], color: 'white' },
  { name: 'Loureiro',           aliases: ['loureiro branco'], color: 'white' },
  { name: 'Arinto',             aliases: ['pedernã', 'pederna'], color: 'white' },
  { name: 'Encruzado',          aliases: [], color: 'white' },
  { name: 'Verdelho',           aliases: ['gouveio'], color: 'white' },
  { name: 'Assyrtiko',          aliases: ['assy', 'assyrtico'], color: 'white' },
  { name: 'Malagousia',         aliases: ['malagouzia'], color: 'white' },
  { name: 'Moschofilero',       aliases: ['moshofilero'], color: 'white' },
  { name: 'Robola',             aliases: ['ribola', 'rebula'], color: 'white' },
  { name: 'Savvatiano',         aliases: ['savatiano'], color: 'white' },
  { name: 'Athiri',             aliases: [], color: 'white' },
  { name: 'Vidiano',            aliases: [], color: 'white' },
  { name: 'Torrontés',          aliases: ['torrontes', 'torrontés riojano', 'torrontés sanjuanino'], color: 'white' },
  { name: 'Pedro Ximénez',      aliases: ['px', 'pedro jimenez', 'pedro ximenes'], color: 'white' },
  { name: 'Palomino',           aliases: ['palomino fino', 'listán'], color: 'white' },
  { name: 'Airén',              aliases: ['airen', 'lairén'], color: 'white' },
  { name: 'Macabeo',            aliases: ['viura', 'macabeu', 'maccabeu'], color: 'white' },
  { name: 'Xarel·lo',           aliases: ['xarello', 'xarel lo', 'pansa blanca'], color: 'white' },
  { name: 'Parellada',          aliases: [], color: 'white' },
  { name: 'Verdejo',            aliases: [], color: 'white' },
  { name: 'Txakoli',            aliases: ['hondarrabi zuri', 'txakolina', 'getariako txakolina'], color: 'white' },
  { name: 'Cortese',            aliases: ['gavi', 'cortese di gavi'], color: 'white' },
  { name: 'Arneis',             aliases: ['barolo bianco', 'nebbiolo bianco'], color: 'white' },
  { name: 'Timorasso',          aliases: ['colli tortonesi timorasso'], color: 'white' },
  { name: 'Pecorino',           aliases: ['pecorino abruzzese'], color: 'white' },
  { name: 'Ribolla Gialla',     aliases: ['ribolla', 'rebula'], color: 'white' },
  { name: 'Friulano',           aliases: ['tocai friulano', 'sauvignonasse', 'sauvignon vert'], color: 'white' },
  { name: 'Rkatsiteli',         aliases: ['rk', 'rkatsiteli'], color: 'white' },
  { name: 'Kisi',               aliases: [], color: 'white' },
  { name: 'Mtsvane',            aliases: ['mtsvane kakhuri'], color: 'white' },
  { name: 'Koshu',              aliases: ['japanese koshu'], color: 'white' },
  { name: 'Scheurebe',          aliases: ['sämling 88', 'samling 88'], color: 'white' },
  { name: 'Kerner',             aliases: [], color: 'white' },
  { name: 'Bacchus',            aliases: [], color: 'white' },
  { name: 'Ortega',             aliases: [], color: 'white' },
  { name: 'Seyval Blanc',       aliases: ['seyval'], color: 'white' },
  { name: 'Solaris',            aliases: [], color: 'white' },
  { name: 'Reichensteiner',     aliases: [], color: 'white' },
  { name: 'Auxerrois',          aliases: ['auxerrois blanc', 'pinot auxerrois'], color: 'white' },
  { name: 'Kerner',             aliases: [], color: 'white' },
  { name: 'Viura',              aliases: ['macabeo', 'macabeu'], color: 'white' },
  { name: 'Bourboulenc',        aliases: ['doucillon'], color: 'white' },
  { name: 'Clairette',          aliases: ['clairette blanche', 'bianchetta'], color: 'white' },
  { name: 'Picpoul',            aliases: ['piquepoul', 'picpoul blanc', 'folle blanche'], color: 'white' },
  { name: 'Sercial',            aliases: ['cercial', 'esgana cão'], color: 'white' },
  { name: 'Bual',               aliases: ['boal'], color: 'white' },
  { name: 'Antão Vaz',          aliases: ['antao vaz'], color: 'white' },
  { name: 'Roupeiro',           aliases: ['síria', 'siria'], color: 'white' },

  // -- Rosé / Both --------------------------------------------------------------
  { name: 'Pinot Noir (Rosé)',  aliases: ['pn rose', 'pinot noir rose'], color: 'rosé' },
  { name: 'Grenache (Rosé)',    aliases: ['grenache rose', 'garnacha rosado'], color: 'rosé' },
  { name: 'Cinsault (Rosé)',    aliases: ['cinsaut rose'], color: 'rosé' },
  { name: 'Mourvèdre (Rosé)',   aliases: ['mourvedre rose', 'monastrell rosado'], color: 'rosé' },

  // -- Classic Blends (as shorthand) --------------------------------------------
  { name: 'Grenache, Syrah, Mourvèdre', aliases: ['gsm', 'rhone blend', 'rhône blend'], color: 'red' },
  { name: 'Cabernet Sauvignon, Merlot', aliases: ['bordeaux blend', 'bx blend', 'left bank'], color: 'red' },
  { name: 'Chardonnay, Pinot Noir, Pinot Meunier', aliases: ['champagne blend', 'champ blend'], color: 'white' },
  { name: 'Macabeo, Xarel·lo, Parellada', aliases: ['cava blend'], color: 'white' },
  { name: 'Sangiovese, Cabernet Sauvignon', aliases: ['super tuscan'], color: 'red' },
  { name: 'Touriga Nacional, Touriga Franca, Tinta Roriz', aliases: ['douro blend', 'port blend'], color: 'red' },
];

/**
 * Search the grape database.
 * Returns up to `limit` matches, sorted by relevance.
 * Exact alias match > name starts with > name contains > alias contains.
 */
export function searchGrapes(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact   = [];
  const starts  = [];
  const contains = [];

  for (const grape of GRAPE_DB) {
    const nameLower = grape.name.toLowerCase();
    const aliasMatch = grape.aliases.some(a => a.toLowerCase() === q);
    const aliasStarts = grape.aliases.some(a => a.toLowerCase().startsWith(q));
    const aliasContains = grape.aliases.some(a => a.toLowerCase().includes(q));

    if (aliasMatch || nameLower === q) {
      exact.push(grape.name);
    } else if (nameLower.startsWith(q) || aliasStarts) {
      starts.push(grape.name);
    } else if (nameLower.includes(q) || aliasContains) {
      contains.push(grape.name);
    }
  }

  // dedupe preserving order
  const seen = new Set();
  const results = [];
  for (const name of [...exact, ...starts, ...contains]) {
    if (!seen.has(name)) { seen.add(name); results.push(name); }
  }
  return results.slice(0, limit);
}
