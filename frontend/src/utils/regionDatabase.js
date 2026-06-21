/**
 * Curated wine region database — ~400 appellations with aliases and shortforms.
 * Used for autocomplete in the Region field.
 *
 * Sources: Wine Folly, Oxford Companion to Wine, CIVB, appellation bodies.
 */

// Each entry: { name, aliases: string[], country }
export const REGION_DB = [

  // ── France ──────────────────────────────────────────────────────────────────
  // Bordeaux
  { name: 'Bordeaux',                  aliases: ['bx', 'bdx'], country: 'France' },
  { name: 'Médoc',                     aliases: ['medoc'], country: 'France' },
  { name: 'Haut-Médoc',               aliases: ['haut medoc'], country: 'France' },
  { name: 'Pauillac',                  aliases: [], country: 'France' },
  { name: 'Saint-Estèphe',            aliases: ['saint estephe', 'st estephe'], country: 'France' },
  { name: 'Saint-Julien',             aliases: ['saint julien', 'st julien'], country: 'France' },
  { name: 'Margaux',                   aliases: [], country: 'France' },
  { name: 'Listrac-Médoc',            aliases: ['listrac'], country: 'France' },
  { name: 'Moulis-en-Médoc',          aliases: ['moulis'], country: 'France' },
  { name: 'Saint-Émilion',            aliases: ['saint emilion', 'st emilion'], country: 'France' },
  { name: 'Pomerol',                   aliases: [], country: 'France' },
  { name: 'Fronsac',                   aliases: [], country: 'France' },
  { name: 'Graves',                    aliases: [], country: 'France' },
  { name: 'Pessac-Léognan',           aliases: ['pessac leognan', 'pessac'], country: 'France' },
  { name: 'Sauternes',                 aliases: ['saut'], country: 'France' },
  { name: 'Barsac',                    aliases: [], country: 'France' },
  { name: 'Entre-Deux-Mers',          aliases: ['entre deux mers', 'edm'], country: 'France' },
  // Burgundy
  { name: 'Burgundy',                  aliases: ['burg', 'bourgogne'], country: 'France' },
  { name: 'Côte de Nuits',            aliases: ['cote de nuits', 'cdn'], country: 'France' },
  { name: 'Côte de Beaune',           aliases: ['cote de beaune', 'cdb'], country: 'France' },
  { name: "Côte d'Or",                aliases: ["cote d'or", 'cdo'], country: 'France' },
  { name: 'Gevrey-Chambertin',        aliases: ['gevrey', 'chambertin'], country: 'France' },
  { name: 'Morey-Saint-Denis',        aliases: ['morey'], country: 'France' },
  { name: 'Chambolle-Musigny',        aliases: ['chambolle'], country: 'France' },
  { name: 'Vougeot',                   aliases: ['clos de vougeot'], country: 'France' },
  { name: 'Vosne-Romanée',           aliases: ['vosne romanee', 'vosne'], country: 'France' },
  { name: 'Nuits-Saint-Georges',      aliases: ['nuits', 'nsg'], country: 'France' },
  { name: 'Aloxe-Corton',            aliases: ['aloxe corton', 'corton'], country: 'France' },
  { name: 'Beaune',                    aliases: [], country: 'France' },
  { name: 'Pommard',                   aliases: [], country: 'France' },
  { name: 'Volnay',                    aliases: [], country: 'France' },
  { name: 'Meursault',                 aliases: [], country: 'France' },
  { name: 'Puligny-Montrachet',       aliases: ['puligny'], country: 'France' },
  { name: 'Chassagne-Montrachet',     aliases: ['chassagne'], country: 'France' },
  { name: 'Santenay',                  aliases: [], country: 'France' },
  { name: 'Mâconnais',                aliases: ['maconnais', 'macon'], country: 'France' },
  { name: 'Pouilly-Fuissé',           aliases: ['pouilly fuisse', 'pf'], country: 'France' },
  { name: 'Chablis',                   aliases: [], country: 'France' },
  { name: 'Petit Chablis',            aliases: [], country: 'France' },
  // Beaujolais
  { name: 'Beaujolais',                aliases: ['bj', 'beauj'], country: 'France' },
  { name: 'Beaujolais-Villages',      aliases: ['bj villages'], country: 'France' },
  { name: 'Moulin-à-Vent',           aliases: ['moulin a vent', 'mav'], country: 'France' },
  { name: 'Fleurie',                   aliases: [], country: 'France' },
  { name: 'Morgon',                    aliases: [], country: 'France' },
  { name: 'Brouilly',                  aliases: [], country: 'France' },
  { name: 'Côte de Brouilly',        aliases: ['cote de brouilly'], country: 'France' },
  { name: 'Chiroubles',               aliases: [], country: 'France' },
  { name: 'Régnié',                   aliases: ['regnie'], country: 'France' },
  { name: 'Chénas',                   aliases: ['chenas'], country: 'France' },
  { name: 'Juliénas',                 aliases: ['julienas'], country: 'France' },
  { name: 'Saint-Amour',             aliases: ['saint amour'], country: 'France' },
  // Champagne
  { name: 'Champagne',                 aliases: ['champ'], country: 'France' },
  { name: 'Montagne de Reims',        aliases: ['reims'], country: 'France' },
  { name: 'Vallée de la Marne',      aliases: ['epernay', 'épernay', 'marne'], country: 'France' },
  { name: 'Côte des Blancs',         aliases: ['cote des blancs'], country: 'France' },
  { name: 'Côte des Bar',            aliases: ['aube', 'cote des bar'], country: 'France' },
  // Loire
  { name: 'Loire Valley',             aliases: ['loire', 'val de loire'], country: 'France' },
  { name: 'Sancerre',                  aliases: [], country: 'France' },
  { name: 'Pouilly-Fumé',            aliases: ['pouilly fume', 'pf'], country: 'France' },
  { name: 'Muscadet',                  aliases: ['muscadet sevre et maine'], country: 'France' },
  { name: 'Vouvray',                   aliases: [], country: 'France' },
  { name: 'Chinon',                    aliases: [], country: 'France' },
  { name: 'Bourgueil',                 aliases: ['st nicolas de bourgueil'], country: 'France' },
  { name: 'Anjou',                     aliases: ['anjou-saumur'], country: 'France' },
  { name: 'Saumur',                    aliases: ['saumur-champigny'], country: 'France' },
  { name: 'Touraine',                  aliases: [], country: 'France' },
  { name: 'Menetou-Salon',           aliases: ['menetou salon'], country: 'France' },
  { name: 'Quincy',                    aliases: [], country: 'France' },
  { name: 'Reuilly',                   aliases: [], country: 'France' },
  // Rhône
  { name: 'Rhône Valley',             aliases: ['rhone', 'rhône', 'rhone valley'], country: 'France' },
  { name: 'Châteauneuf-du-Pape',     aliases: ['cdp', 'cnp', 'chateauneuf du pape', 'chateauneuf'], country: 'France' },
  { name: 'Gigondas',                  aliases: [], country: 'France' },
  { name: 'Vacqueyras',               aliases: [], country: 'France' },
  { name: 'Beaumes-de-Venise',       aliases: ['beaumes de venise'], country: 'France' },
  { name: 'Rasteau',                   aliases: [], country: 'France' },
  { name: 'Lirac',                     aliases: [], country: 'France' },
  { name: 'Tavel',                     aliases: [], country: 'France' },
  { name: 'Côtes du Rhône',          aliases: ['cdr', 'cotes du rhone'], country: 'France' },
  { name: 'Côte-Rôtie',              aliases: ['cote rotie', 'cr'], country: 'France' },
  { name: 'Condrieu',                  aliases: [], country: 'France' },
  { name: 'Hermitage',                 aliases: ['ermitage'], country: 'France' },
  { name: 'Crozes-Hermitage',        aliases: ['crozes hermitage', 'crozes'], country: 'France' },
  { name: 'Saint-Joseph',            aliases: ['saint joseph', 'st joseph'], country: 'France' },
  { name: 'Cornas',                    aliases: [], country: 'France' },
  { name: 'Saint-Péray',             aliases: ['saint peray'], country: 'France' },
  // Provence & South
  { name: 'Provence',                  aliases: ['prov'], country: 'France' },
  { name: 'Bandol',                    aliases: [], country: 'France' },
  { name: 'Cassis',                    aliases: [], country: 'France' },
  { name: 'Côtes de Provence',       aliases: ['cotes de provence', 'cdp'], country: 'France' },
  { name: 'Languedoc',               aliases: ['lang', 'languedoc-roussillon'], country: 'France' },
  { name: 'Roussillon',               aliases: ['russ'], country: 'France' },
  { name: 'Corbières',               aliases: ['corbieres'], country: 'France' },
  { name: 'Minervois',                aliases: [], country: 'France' },
  { name: 'Fitou',                    aliases: [], country: 'France' },
  { name: 'Pic Saint-Loup',         aliases: ['pic saint loup', 'psl'], country: 'France' },
  { name: 'Faugères',               aliases: ['faugeres'], country: 'France' },
  { name: 'Banyuls',                 aliases: [], country: 'France' },
  { name: 'Maury',                   aliases: [], country: 'France' },
  { name: 'Rivesaltes',              aliases: [], country: 'France' },
  // Alsace & others
  { name: 'Alsace',                   aliases: ['als', 'alsatian'], country: 'France' },
  { name: 'Jura',                     aliases: [], country: 'France' },
  { name: 'Savoie',                   aliases: [], country: 'France' },
  { name: 'Bergerac',                 aliases: [], country: 'France' },
  { name: 'Cahors',                   aliases: [], country: 'France' },
  { name: 'Madiran',                  aliases: [], country: 'France' },
  { name: 'Jurançon',                aliases: ['jurancon'], country: 'France' },
  { name: 'Gaillac',                  aliases: [], country: 'France' },
  { name: 'Irouléguy',               aliases: ['irouleguy', 'pays basque'], country: 'France' },

  // ── Italy ────────────────────────────────────────────────────────────────────
  // Tuscany
  { name: 'Tuscany',                  aliases: ['tus', 'toscana'], country: 'Italy' },
  { name: 'Chianti',                  aliases: ['chianti classico', 'cc'], country: 'Italy' },
  { name: 'Chianti Classico',        aliases: ['cc', 'chianti class'], country: 'Italy' },
  { name: 'Brunello di Montalcino',  aliases: ['brunello', 'montalcino', 'bdm'], country: 'Italy' },
  { name: 'Vino Nobile di Montepulciano', aliases: ['vino nobile', 'montepulciano', 'vnm'], country: 'Italy' },
  { name: 'Bolgheri',                 aliases: ['super tuscan', 'sassicaia'], country: 'Italy' },
  { name: 'Morellino di Scansano',   aliases: ['morellino', 'scansano'], country: 'Italy' },
  { name: 'Vernaccia di San Gimignano', aliases: ['vernaccia', 'san gimignano'], country: 'Italy' },
  { name: 'Maremma',                  aliases: [], country: 'Italy' },
  // Piedmont
  { name: 'Piedmont',                 aliases: ['pied', 'piemonte'], country: 'Italy' },
  { name: 'Barolo',                   aliases: ['king of wines'], country: 'Italy' },
  { name: 'Barbaresco',               aliases: [], country: 'Italy' },
  { name: 'Barbera d\'Asti',         aliases: ['barbera asti', 'bb asti'], country: 'Italy' },
  { name: 'Barbera d\'Alba',         aliases: ['barbera alba', 'bb alba'], country: 'Italy' },
  { name: 'Dolcetto d\'Alba',        aliases: ['dolcetto'], country: 'Italy' },
  { name: 'Gavi',                     aliases: ['cortese di gavi'], country: 'Italy' },
  { name: 'Asti',                     aliases: ['moscato d\'asti', 'asti spumante'], country: 'Italy' },
  { name: 'Roero',                    aliases: [], country: 'Italy' },
  { name: 'Langhe',                   aliases: [], country: 'Italy' },
  { name: 'Monferrato',               aliases: [], country: 'Italy' },
  // Veneto
  { name: 'Veneto',                   aliases: [], country: 'Italy' },
  { name: 'Amarone della Valpolicella', aliases: ['amarone', 'amarone valpolicella'], country: 'Italy' },
  { name: 'Valpolicella',             aliases: ['valp'], country: 'Italy' },
  { name: 'Soave',                    aliases: ['soave classico'], country: 'Italy' },
  { name: 'Prosecco',                 aliases: ['prosecco doc', 'prosecco docg', 'conegliano valdobbiadene'], country: 'Italy' },
  { name: 'Bardolino',                aliases: [], country: 'Italy' },
  // Other Italian
  { name: 'Friuli',                   aliases: ['friuli venezia giulia', 'fvg'], country: 'Italy' },
  { name: 'Alto Adige',              aliases: ['südtirol', 'sudtirol', 'trentino alto adige'], country: 'Italy' },
  { name: 'Trentino',                 aliases: [], country: 'Italy' },
  { name: 'Lombardy',                 aliases: ['lombardia', 'franciacorta'], country: 'Italy' },
  { name: 'Franciacorta',            aliases: [], country: 'Italy' },
  { name: 'Emilia-Romagna',          aliases: ['emilia romagna', 'lambrusco'], country: 'Italy' },
  { name: 'Umbria',                   aliases: ['sagrantino di montefalco', 'torgiano'], country: 'Italy' },
  { name: 'Abruzzo',                  aliases: ['montepulciano d\'abruzzo'], country: 'Italy' },
  { name: 'Campania',                 aliases: ['irpinia', 'taurasi'], country: 'Italy' },
  { name: 'Puglia',                   aliases: ['apulia', 'salento', 'primitivo di manduria'], country: 'Italy' },
  { name: 'Basilicata',              aliases: ['aglianico del vulture'], country: 'Italy' },
  { name: 'Calabria',                aliases: ['cirò'], country: 'Italy' },
  { name: 'Sicily',                   aliases: ['sicilia', 'sicily', 'etna', 'marsala'], country: 'Italy' },
  { name: 'Etna',                     aliases: ['etna rosso', 'etna bianco'], country: 'Italy' },
  { name: 'Sardinia',                 aliases: ['sardegna', 'vermentino di sardegna', 'cannonau di sardegna'], country: 'Italy' },
  { name: 'Marche',                   aliases: ['verdicchio dei castelli di jesi', 'rosso conero'], country: 'Italy' },
  { name: 'Lazio',                    aliases: ['frascati', 'est est est'], country: 'Italy' },

  // ── Spain ────────────────────────────────────────────────────────────────────
  { name: 'Rioja',                    aliases: ['doca rioja', 'rioja alta', 'rioja alavesa', 'rioja baja'], country: 'Spain' },
  { name: 'Rioja Alta',              aliases: [], country: 'Spain' },
  { name: 'Rioja Alavesa',           aliases: [], country: 'Spain' },
  { name: 'Ribera del Duero',        aliases: ['rdd', 'ribera'], country: 'Spain' },
  { name: 'Priorat',                  aliases: ['priorat docq', 'priorato'], country: 'Spain' },
  { name: 'Penedès',                 aliases: ['penedes'], country: 'Spain' },
  { name: 'Rías Baixas',             aliases: ['rias baixas', 'rb', 'galicia'], country: 'Spain' },
  { name: 'Rueda',                    aliases: [], country: 'Spain' },
  { name: 'Toro',                     aliases: [], country: 'Spain' },
  { name: 'Bierzo',                   aliases: [], country: 'Spain' },
  { name: 'Jumilla',                  aliases: [], country: 'Spain' },
  { name: 'Yecla',                    aliases: [], country: 'Spain' },
  { name: 'Cava',                     aliases: ['cava do'], country: 'Spain' },
  { name: 'Navarra',                  aliases: [], country: 'Spain' },
  { name: 'Somontano',               aliases: [], country: 'Spain' },
  { name: 'Jerez',                    aliases: ['sherry', 'jerez-xérès-sherry', 'manzanilla'], country: 'Spain' },
  { name: 'Montsant',                aliases: [], country: 'Spain' },
  { name: 'Terra Alta',              aliases: [], country: 'Spain' },
  { name: 'Costers del Segre',      aliases: [], country: 'Spain' },
  { name: 'Empordà',                aliases: ['emporda'], country: 'Spain' },
  { name: 'Valencia',                aliases: [], country: 'Spain' },
  { name: 'Utiel-Requena',          aliases: ['utiel requena'], country: 'Spain' },
  { name: 'La Mancha',              aliases: ['castilla la mancha'], country: 'Spain' },
  { name: 'Valdepeñas',             aliases: ['valdepenas'], country: 'Spain' },
  { name: 'Txakoli',                aliases: ['getariako txakolina', 'txakolina', 'hondarribia'], country: 'Spain' },
  { name: 'Lanzarote',              aliases: [], country: 'Spain' },
  { name: 'Canary Islands',         aliases: ['islas canarias', 'tenerife'], country: 'Spain' },

  // ── Portugal ─────────────────────────────────────────────────────────────────
  { name: 'Douro',                    aliases: ['dour', 'douro doc'], country: 'Portugal' },
  { name: 'Port',                     aliases: ['porto', 'port wine', 'vintage port', 'lbv'], country: 'Portugal' },
  { name: 'Alentejo',                 aliases: ['alent'], country: 'Portugal' },
  { name: 'Vinho Verde',             aliases: ['vv', 'green wine'], country: 'Portugal' },
  { name: 'Dão',                      aliases: ['dao'], country: 'Portugal' },
  { name: 'Bairrada',                 aliases: [], country: 'Portugal' },
  { name: 'Lisboa',                   aliases: ['lisbon', 'estremadura'], country: 'Portugal' },
  { name: 'Tejo',                     aliases: ['ribatejo'], country: 'Portugal' },
  { name: 'Setúbal',                 aliases: ['setubal', 'palmela'], country: 'Portugal' },
  { name: 'Madeira',                  aliases: ['madeira wine', 'madeirense'], country: 'Portugal' },
  { name: 'Algarve',                  aliases: [], country: 'Portugal' },
  { name: 'Trás-os-Montes',         aliases: ['tras os montes'], country: 'Portugal' },

  // ── Germany ──────────────────────────────────────────────────────────────────
  { name: 'Mosel',                    aliases: ['mos', 'mosel-saar-ruwer'], country: 'Germany' },
  { name: 'Saar',                     aliases: [], country: 'Germany' },
  { name: 'Ruwer',                    aliases: [], country: 'Germany' },
  { name: 'Rheingau',                 aliases: ['rg'], country: 'Germany' },
  { name: 'Rheinhessen',              aliases: ['rh'], country: 'Germany' },
  { name: 'Pfalz',                    aliases: ['palatinate'], country: 'Germany' },
  { name: 'Nahe',                     aliases: [], country: 'Germany' },
  { name: 'Ahr',                      aliases: [], country: 'Germany' },
  { name: 'Franken',                  aliases: ['franconia', 'frankenwein'], country: 'Germany' },
  { name: 'Baden',                    aliases: [], country: 'Germany' },
  { name: 'Württemberg',             aliases: ['wurttemberg'], country: 'Germany' },
  { name: 'Mittelrhein',             aliases: [], country: 'Germany' },

  // ── Austria ──────────────────────────────────────────────────────────────────
  { name: 'Wachau',                   aliases: ['smaragd', 'federspiel'], country: 'Austria' },
  { name: 'Kamptal',                  aliases: [], country: 'Austria' },
  { name: 'Kremstal',                 aliases: [], country: 'Austria' },
  { name: 'Traisental',              aliases: [], country: 'Austria' },
  { name: 'Weinviertel',             aliases: ['weinviertel dac'], country: 'Austria' },
  { name: 'Burgenland',              aliases: ['neusiedlersee', 'neusiedl'], country: 'Austria' },
  { name: 'Steiermark',              aliases: ['styria', 'southern styria', 'south styria'], country: 'Austria' },
  { name: 'Wien',                     aliases: ['vienna', 'viennese'], country: 'Austria' },
  { name: 'Carnuntum',               aliases: [], country: 'Austria' },

  // ── New Zealand ──────────────────────────────────────────────────────────────
  { name: 'Marlborough',             aliases: ['marlb', 'marlborough nz'], country: 'New Zealand' },
  { name: 'Central Otago',          aliases: ['co', 'central otago nz'], country: 'New Zealand' },
  { name: 'Hawke\'s Bay',           aliases: ['hb', 'hawkes bay'], country: 'New Zealand' },
  { name: 'Martinborough',          aliases: ['wairarapa'], country: 'New Zealand' },
  { name: 'Waipara',                aliases: ['north canterbury'], country: 'New Zealand' },
  { name: 'Nelson',                  aliases: [], country: 'New Zealand' },
  { name: 'Gisborne',               aliases: [], country: 'New Zealand' },
  { name: 'Auckland',               aliases: ['waiheke island', 'kumeu'], country: 'New Zealand' },
  { name: 'Wairarapa',              aliases: ['martinborough'], country: 'New Zealand' },

  // ── Australia ─────────────────────────────────────────────────────────────────
  { name: 'Barossa Valley',          aliases: ['bv', 'barossa'], country: 'Australia' },
  { name: 'Eden Valley',             aliases: ['ev', 'high eden'], country: 'Australia' },
  { name: 'Clare Valley',            aliases: ['cv'], country: 'Australia' },
  { name: 'McLaren Vale',            aliases: ['mcv', 'mclaren'], country: 'Australia' },
  { name: 'Adelaide Hills',         aliases: ['ah'], country: 'Australia' },
  { name: 'Coonawarra',              aliases: [], country: 'Australia' },
  { name: 'Yarra Valley',           aliases: ['yv'], country: 'Australia' },
  { name: 'Mornington Peninsula',   aliases: ['mornington'], country: 'Australia' },
  { name: 'Heathcote',              aliases: [], country: 'Australia' },
  { name: 'Grampians',              aliases: ['great western'], country: 'Australia' },
  { name: 'Rutherglen',             aliases: [], country: 'Australia' },
  { name: 'Hunter Valley',          aliases: ['hv', 'hunter'], country: 'Australia' },
  { name: 'Margaret River',         aliases: ['mr', 'margaret'], country: 'Australia' },
  { name: 'Great Southern',         aliases: ['mount barker'], country: 'Australia' },
  { name: 'Tasmania',               aliases: ['tassie'], country: 'Australia' },
  { name: 'Mudgee',                 aliases: [], country: 'Australia' },
  { name: 'Orange',                 aliases: [], country: 'Australia' },
  { name: 'Tumbarumba',             aliases: [], country: 'Australia' },
  { name: 'Langhorne Creek',        aliases: [], country: 'Australia' },
  { name: 'Padthaway',              aliases: [], country: 'Australia' },

  // ── USA ──────────────────────────────────────────────────────────────────────
  { name: 'Napa Valley',             aliases: ['nv', 'napa'], country: 'USA' },
  { name: 'Sonoma',                  aliases: ['sr', 'sonoma county'], country: 'USA' },
  { name: 'Russian River Valley',   aliases: ['rrv', 'russian river'], country: 'USA' },
  { name: 'Alexander Valley',       aliases: ['av'], country: 'USA' },
  { name: 'Dry Creek Valley',       aliases: ['dcv', 'dry creek'], country: 'USA' },
  { name: 'Stags Leap District',    aliases: ['stags leap'], country: 'USA' },
  { name: 'Rutherford',             aliases: [], country: 'USA' },
  { name: 'Oakville',               aliases: [], country: 'USA' },
  { name: 'Carneros',               aliases: ['los carneros'], country: 'USA' },
  { name: 'Santa Barbara',          aliases: ['sb', 'santa barbara county'], country: 'USA' },
  { name: 'Santa Ynez Valley',      aliases: ['santa ynez'], country: 'USA' },
  { name: 'Santa Rita Hills',       aliases: ['sta rita hills', 'srh'], country: 'USA' },
  { name: 'Santa Cruz Mountains',   aliases: ['scm', 'santa cruz'], country: 'USA' },
  { name: 'Paso Robles',            aliases: ['paso', 'pr'], country: 'USA' },
  { name: 'Willamette Valley',      aliases: ['wv', 'willamette'], country: 'USA' },
  { name: 'Dundee Hills',           aliases: ['dundee'], country: 'USA' },
  { name: 'Eola-Amity Hills',      aliases: ['eola amity'], country: 'USA' },
  { name: 'Columbia Valley',        aliases: ['cv', 'columbia'], country: 'USA' },
  { name: 'Walla Walla Valley',     aliases: ['walla walla', 'ww'], country: 'USA' },
  { name: 'Yakima Valley',          aliases: ['yakima'], country: 'USA' },
  { name: 'Finger Lakes',           aliases: ['fl'], country: 'USA' },
  { name: 'Long Island',            aliases: ['north fork', 'hamptons'], country: 'USA' },

  // ── Argentina ─────────────────────────────────────────────────────────────────
  { name: 'Mendoza',                 aliases: ['mend'], country: 'Argentina' },
  { name: 'Luján de Cuyo',          aliases: ['lujan de cuyo', 'lujan'], country: 'Argentina' },
  { name: 'Maipú',                  aliases: ['maipu'], country: 'Argentina' },
  { name: 'Valle de Uco',           aliases: ['uco valley', 'uco'], country: 'Argentina' },
  { name: 'Tupungato',              aliases: [], country: 'Argentina' },
  { name: 'Salta',                  aliases: ['cafayate'], country: 'Argentina' },
  { name: 'Cafayate',               aliases: ['valles calchaquies'], country: 'Argentina' },
  { name: 'San Juan',               aliases: [], country: 'Argentina' },
  { name: 'Patagonia',              aliases: ['río negro', 'rio negro', 'neuquén'], country: 'Argentina' },

  // ── Chile ─────────────────────────────────────────────────────────────────────
  { name: 'Maipo Valley',           aliases: ['maipo', 'alto maipo'], country: 'Chile' },
  { name: 'Colchagua Valley',       aliases: ['colchagua', 'rapel'], country: 'Chile' },
  { name: 'Casablanca Valley',      aliases: ['casablanca'], country: 'Chile' },
  { name: 'San Antonio Valley',     aliases: ['san antonio', 'leyda'], country: 'Chile' },
  { name: 'Aconcagua',              aliases: ['aconcagua valley', 'panquehue'], country: 'Chile' },
  { name: 'Cachapoal Valley',       aliases: ['cachapoal'], country: 'Chile' },
  { name: 'Curicó Valley',         aliases: ['curico'], country: 'Chile' },
  { name: 'Maule Valley',           aliases: ['maule'], country: 'Chile' },
  { name: 'Bío-Bío Valley',        aliases: ['bio bio'], country: 'Chile' },
  { name: 'Elqui Valley',          aliases: ['elqui'], country: 'Chile' },
  { name: 'Limarí Valley',         aliases: ['limari'], country: 'Chile' },

  // ── South Africa ─────────────────────────────────────────────────────────────
  { name: 'Stellenbosch',           aliases: ['stell'], country: 'South Africa' },
  { name: 'Franschhoek',            aliases: ['franschhoek valley'], country: 'South Africa' },
  { name: 'Paarl',                  aliases: ['paarl winelands'], country: 'South Africa' },
  { name: 'Swartland',              aliases: [], country: 'South Africa' },
  { name: 'Constantia',             aliases: [], country: 'South Africa' },
  { name: 'Walker Bay',             aliases: [], country: 'South Africa' },
  { name: 'Elgin',                  aliases: [], country: 'South Africa' },
  { name: 'Robertson',              aliases: [], country: 'South Africa' },
  { name: 'Hemel-en-Aarde',        aliases: ['hemel en aarde'], country: 'South Africa' },

  // ── Greece ───────────────────────────────────────────────────────────────────
  { name: 'Santorini',              aliases: [], country: 'Greece' },
  { name: 'Nemea',                  aliases: [], country: 'Greece' },
  { name: 'Naoussa',                aliases: [], country: 'Greece' },
  { name: 'Crete',                  aliases: ['kriti', 'heraklion'], country: 'Greece' },
  { name: 'Peloponnese',            aliases: ['peloponnesos'], country: 'Greece' },
  { name: 'Kefalonia',              aliases: ['cephalonia'], country: 'Greece' },
  { name: 'Mantinia',               aliases: [], country: 'Greece' },
  { name: 'Amyndeon',               aliases: ['amindeon'], country: 'Greece' },

  // ── Other Notable ────────────────────────────────────────────────────────────
  { name: 'Tokaj',                  aliases: ['tokay', 'tokaji'], country: 'Hungary' },
  { name: 'Eger',                   aliases: ["egri bikavér", 'bull\'s blood'], country: 'Hungary' },
  { name: 'Villány',                aliases: ['villany'], country: 'Hungary' },
  { name: 'Kakheti',                aliases: ['kakhetia'], country: 'Georgia' },
  { name: 'Bekaa Valley',          aliases: ['beqaa', 'bekaa'], country: 'Lebanon' },
  { name: 'Golan Heights',         aliases: ['galilee'], country: 'Israel' },
  { name: 'Wachau',                 aliases: [], country: 'Austria' },
  { name: 'Okanagan Valley',        aliases: ['okanagan'], country: 'Canada' },
  { name: 'Niagara Peninsula',     aliases: ['niagara'], country: 'Canada' },
  { name: 'Yamanashi',             aliases: ['koshu'], country: 'Japan' },
  { name: 'Ningxia',               aliases: ['helan mountain'], country: 'China' },
  { name: 'Valle de Guadalupe',    aliases: ['guadalupe valley', 'baja california'], country: 'Mexico' },
  { name: 'Dalmatia',              aliases: ['dalmatian coast'], country: 'Croatia' },
  { name: 'Istria',                aliases: ['istrian peninsula'], country: 'Croatia' },
  { name: 'Goriška Brda',          aliases: ['goriska brda', 'brda'], country: 'Slovenia' },
];

/**
 * Search the region database.
 * Returns up to `limit` matches sorted by relevance.
 */
export function searchRegions(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact    = [];
  const starts   = [];
  const contains = [];

  for (const region of REGION_DB) {
    const nameLower    = region.name.toLowerCase();
    const countryLower = region.country.toLowerCase();
    const aliasExact   = region.aliases.some(a => a.toLowerCase() === q);
    const aliasStarts  = region.aliases.some(a => a.toLowerCase().startsWith(q));
    const aliasContains= region.aliases.some(a => a.toLowerCase().includes(q));

    if (aliasExact || nameLower === q) {
      exact.push(region.name);
    } else if (nameLower.startsWith(q) || aliasStarts || countryLower.startsWith(q)) {
      starts.push(region.name);
    } else if (nameLower.includes(q) || aliasContains || countryLower.includes(q)) {
      contains.push(region.name);
    }
  }

  const seen = new Set();
  const results = [];
  for (const name of [...exact, ...starts, ...contains]) {
    if (!seen.has(name)) { seen.add(name); results.push(name); }
  }
  return results.slice(0, limit);
}
