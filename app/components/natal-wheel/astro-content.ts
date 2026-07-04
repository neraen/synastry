/**
 * Carte du ciel — contenu statique FR + définitions astrologiques.
 * Signes, planètes (+ Lilith, Nœud Nord), maisons, aspects.
 * Les clés planètes sont alignées sur l'API natal-chart (Sun…Pluto, Lilith, NorthNode).
 */

// ─── Tokens visuels de la carte (palette des maquettes, cf. horoscope.tsx) ────

export const WHEEL_T = {
    bg:      '#120A24',
    card:    '#1F1740',
    border:  'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
    gold:    '#E5C266',
    goldSoft: 'rgba(229,194,102,0.16)',
    text:    '#ECE5F7',
    text2:   '#BDB2D4',
    text3:   '#8A82A6',
    violet:  '#9B5CFF',

    aspConj:    '#E5C266',
    aspSextile: '#5DA9F5',
    aspSquare:  '#E89B4C',
    aspTrine:   '#4ADE80',
    aspOppos:   '#E55A8C',
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SignDef = {
    id: string;
    name: string;
    glyph: string;
    element: 'Feu' | 'Terre' | 'Air' | 'Eau';
    modality: 'Cardinal' | 'Fixe' | 'Mutable';
    ruler: string;
    range: [number, number];
    desc: string;
};

export type PlanetDef = {
    key: string;      // clé API (Sun, Moon, …, Lilith, NorthNode)
    name: string;
    glyph: string;
    /** Point calculé (Lilith, Nœud Nord) : cliquable mais exclu des aspects */
    isPoint?: boolean;
    desc: string;
};

export type AspectDef = {
    id: string;
    name: string;
    short: string;
    angle: number;
    orb: number;
    color: string;
    glyph: string;
    desc: string;
};

// ─── Signes ────────────────────────────────────────────────────────────────────

export const SIGNS: SignDef[] = [
    { id: 'aries',       name: 'Bélier',      glyph: '♈', element: 'Feu',   modality: 'Cardinal', ruler: 'Mars',     range: [0, 30],
        desc: "Premier signe du zodiaque, le Bélier porte en lui l'énergie de tous les commencements. C'est l'étincelle qui précède la réflexion, le courage de se lancer quand rien n'est garanti. Son moteur : le désir, l'urgence de vivre, le besoin d'exister par l'action. Il excelle partout où il faut oser, trancher, ouvrir la voie. Son ombre : l'impatience, la colère vite montée, la difficulté à finir ce qu'il commence. Sa leçon de vie consiste à transformer son feu brut en force durable — apprendre que le vrai courage inclut parfois d'attendre." },
    { id: 'taurus',      name: 'Taureau',     glyph: '♉', element: 'Terre', modality: 'Fixe',     ruler: 'Vénus',    range: [30, 60],
        desc: "Le Taureau incarne la force tranquille du vivant : après l'élan du Bélier, il enracine, stabilise, fait fructifier. C'est un signe sensoriel, qui connaît le monde par le toucher, le goût, la matière. Il a besoin de sécurité, de beauté concrète, de temps long — rien de bon ne se fait dans la précipitation. Fiable et endurant, il tient quand les autres lâchent. Son ombre : la possessivité et un entêtement qui confond stabilité et immobilité. Sa leçon : comprendre que la vraie sécurité est intérieure, et que lâcher prise n'est pas tout perdre." },
    { id: 'gemini',      name: 'Gémeaux',     glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercure',  range: [60, 90],
        desc: "Les Gémeaux sont le signe du lien : entre les idées, entre les gens, entre deux mondes. Curiosité insatiable, esprit rapide, besoin vital de comprendre et de raconter. C'est l'éternel étudiant du zodiaque, celui qui pose les questions que les autres n'osent pas. Il respire par l'échange — priver un Gémeaux de conversation, c'est le priver d'air. Son ombre : la dispersion, le survol, une nervosité qui l'empêche d'habiter l'instant. Sa leçon : accepter que la profondeur ne trahit pas la légèreté, et qu'on peut choisir sans se fermer." },
    { id: 'cancer',      name: 'Cancer',      glyph: '♋', element: 'Eau',   modality: 'Cardinal', ruler: 'Lune',     range: [90, 120],
        desc: "Le Cancer est le gardien de la mémoire et du foyer. Il ressent tout, avant tout le monde, souvent plus fort que tout le monde — c'est une sensibilité radar, qui capte l'humeur d'une pièce en un instant. Son besoin fondamental : un territoire sûr, des liens fidèles, une appartenance. Il protège ce qu'il aime avec une ténacité insoupçonnée sous sa douceur. Son ombre : la carapace, les humeurs changeantes, la tentation de vivre dans le passé. Sa leçon : faire de sa sensibilité une force qui nourrit, plutôt qu'une frontière qui isole." },
    { id: 'leo',         name: 'Lion',        glyph: '♌', element: 'Feu',   modality: 'Fixe',     ruler: 'Soleil',   range: [120, 150],
        desc: "Le Lion vient au monde pour rayonner. Ce n'est pas de la vanité : c'est un besoin vital d'exprimer ce qu'il a d'unique, de créer, d'aimer en grand, d'être vu pour ce qu'il est vraiment. Généreux jusqu'à l'excès, loyal, il réchauffe son entourage comme un feu de camp. Il a le sens du geste, du panache, de la fête. Son ombre : l'orgueil blessé, le besoin d'approbation qui le rend dépendant du regard des autres. Sa leçon : briller pour éclairer, pas pour être applaudi — la vraie noblesse n'a pas besoin de public." },
    { id: 'virgo',       name: 'Vierge',      glyph: '♍', element: 'Terre', modality: 'Mutable',  ruler: 'Mercure',  range: [150, 180],
        desc: "La Vierge est l'intelligence du détail au service du vivant. Elle observe, trie, affine, répare — son talent est de rendre les choses meilleures, plus justes, plus utiles. Modeste en apparence, elle porte une exigence intérieure immense, d'abord tournée contre elle-même. Elle aime se rendre utile concrètement : c'est sa façon d'aimer. Son ombre : l'autocritique corrosive, l'anxiété du contrôle, le perfectionnisme qui paralyse. Sa leçon : accepter l'imperfection comme partie de la vie, et se traiter avec la même bienveillance qu'elle offre aux autres." },
    { id: 'libra',       name: 'Balance',     glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Vénus',    range: [180, 210],
        desc: "La Balance ouvre la moitié relationnelle du zodiaque : avec elle, l'autre devient le miroir où l'on apprend qui l'on est. Signe de l'harmonie, du tact et de l'esthétique, elle cherche l'équilibre en toute chose — dans un couple, une conversation, une pièce. Elle a un vrai génie du compromis et un sens inné de la justice. Son ombre : l'indécision, la peur du conflit qui la pousse à s'oublier pour maintenir la paix. Sa leçon : comprendre qu'une harmonie qui exige son propre effacement n'en est pas une — dire non fait aussi partie de l'amour." },
    { id: 'scorpio',     name: 'Scorpion',    glyph: '♏', element: 'Eau',   modality: 'Fixe',     ruler: 'Pluton',   range: [210, 240],
        desc: "Le Scorpion vit dans les profondeurs que les autres évitent. Rien de tiède chez lui : il veut le vrai, l'entier, l'essentiel — quitte à traverser des crises qui le transforment de fond en comble. C'est le signe de la métamorphose : il meurt et renaît plusieurs fois dans une vie. Intuitif, loyal jusqu'à la mort, il voit derrière les masques. Son ombre : la jalousie, le contrôle, la rumination des blessures. Sa leçon : utiliser sa puissance pour se transformer lui-même plutôt que pour retenir les autres — la confiance est son plus grand saut." },
    { id: 'sagittarius', name: 'Sagittaire',  glyph: '♐', element: 'Feu',   modality: 'Mutable',  ruler: 'Jupiter',  range: [240, 270],
        desc: "Le Sagittaire est l'archer qui vise plus loin que ce qu'il voit. Voyageur dans l'espace comme dans les idées, il a besoin d'horizon, de sens, de croissance — l'enfermement, géographique ou mental, l'éteint. Optimiste de nature, il a le don de remettre les choses en perspective et de redonner foi à ceux qui doutent. Franc, parfois brutalement. Son ombre : la fuite en avant, les promesses plus grandes que ses moyens, la morale donnée aux autres. Sa leçon : comprendre que la vraie sagesse s'incarne dans le quotidien — l'aventure la plus exigeante est parfois de rester." },
    { id: 'capricorn',   name: 'Capricorne',  glyph: '♑', element: 'Terre', modality: 'Cardinal', ruler: 'Saturne',  range: [270, 300],
        desc: "Le Capricorne gravit sa montagne, quoi qu'il en coûte. Ambitieux au sens noble, il pense en années là où d'autres pensent en jours, et construit des choses qui lui survivront. Discipline, patience, sens des responsabilités : il porte souvent plus que sa part, sans se plaindre. Sous l'écorce sérieuse se cache un humour sec et une fidélité à toute épreuve. Son ombre : la dureté envers lui-même, la peur de la vulnérabilité, le devoir qui étouffe le désir. Sa leçon : découvrir que la réussite n'a de goût que partagée, et qu'il a le droit de se reposer avant le sommet." },
    { id: 'aquarius',    name: 'Verseau',     glyph: '♒', element: 'Air',   modality: 'Fixe',     ruler: 'Uranus',   range: [300, 330],
        desc: "Le Verseau regarde le monde depuis un pas de côté. Esprit libre, il questionne les règles, détecte ce qui est figé et imagine ce qui pourrait être autrement — c'est le visionnaire du zodiaque, souvent en avance d'une saison sur son époque. Profondément humaniste, il pense en termes de collectif, de réseau, d'idéal partagé. Son paradoxe : proche de l'humanité entière, parfois distant avec ceux qui l'aiment. Son ombre : la fuite dans les idées, la rébellion par principe. Sa leçon : descendre du ciel des concepts pour laisser le lien le toucher vraiment — l'intime aussi est un territoire à libérer." },
    { id: 'pisces',      name: 'Poissons',    glyph: '♓', element: 'Eau',   modality: 'Mutable',  ruler: 'Neptune',  range: [330, 360],
        desc: "Dernier signe du zodiaque, les Poissons contiennent un peu de tous les autres. Leur frontière avec le monde est poreuse : ils ressentent ce que les autres vivent comme si c'était en eux, d'où une compassion immense et un vrai don artistique ou spirituel. Ils naviguent à l'intuition, comprennent sans qu'on explique. Leur ombre : la fuite — dans le rêve, l'idéalisation ou le sacrifice de soi — et la difficulté à poser des limites. Leur leçon : rester relié au subtil sans se dissoudre dedans ; la sensibilité a besoin de rives pour devenir une force." },
];

export const ELEMENT_COLOR: Record<SignDef['element'], string> = {
    'Feu':   '#E89B4C',
    'Terre': '#A3B86C',
    'Air':   '#7DB5E8',
    'Eau':   '#9B7BE8',
};

// ─── Planètes & points ─────────────────────────────────────────────────────────

export const PLANETS: PlanetDef[] = [
    { key: 'Sun',     name: 'Soleil',   glyph: '☉',
        desc: "Le Soleil est le centre de gravité de ton thème : ton identité profonde, ta vitalité, la raison pour laquelle tu te lèves le matin. Il ne décrit pas qui tu parais être, mais qui tu deviens quand tu es aligné avec toi-même. C'est ta lumière propre — ce que tu es venu exprimer, créer, incarner dans cette vie. Quand tu vis en accord avec ton Soleil, l'énergie circule, les choses ont du sens. Quand tu t'en éloignes trop longtemps, tout devient lourd, même les succès. Le signe où il se trouve colore ta manière fondamentale de rayonner." },
    { key: 'Moon',    name: 'Lune',     glyph: '☽',
        desc: "La Lune est ton monde intérieur : tes émotions, tes besoins, tes réflexes affectifs — tout ce qui vit en toi avant les mots. Elle raconte l'enfant que tu as été, la façon dont on a pris soin de toi et celle dont tu prends soin de toi aujourd'hui. C'est elle qui parle quand tu réagis à chaud, quand tu cherches du réconfort, quand tu te sens chez toi quelque part. Comprendre sa Lune, c'est apprendre à se rassurer soi-même. Là où le Soleil montre où tu vas, la Lune montre ce dont tu as besoin pour y aller en sécurité." },
    { key: 'Mercury', name: 'Mercure',  glyph: '☿',
        desc: "Mercure est ton intelligence en mouvement : ta façon de penser, d'apprendre, de parler, d'écouter. Il décrit le rythme de ton mental — rapide ou posé, linéaire ou associatif — et le style de ta parole. C'est aussi le messager : la qualité de tes échanges, ta curiosité, ton humour, ta manière de convaincre ou de raconter. Un Mercure bien vécu rend le monde lisible et les liens fluides ; malmené, il devient nervosité, malentendus, mental qui tourne en boucle. Son signe indique comment ton esprit digère la réalité." },
    { key: 'Venus',   name: 'Vénus',    glyph: '♀',
        desc: "Vénus est ta manière d'aimer et d'être aimé : ce qui t'attire, ce que tu trouves beau, ce dont ton cœur a besoin pour s'ouvrir. Elle gouverne le goût, le plaisir, la douceur de vivre — mais aussi ta valeur propre, car on n'accueille de l'amour que ce qu'on croit mériter. Elle décrit ton langage affectif : comment tu séduis, comment tu montres ton attachement, ce qui te fait te sentir choisi. Une Vénus épanouie rend la vie savoureuse ; frustrée, elle cherche à combler le manque par la dépendance ou les compensations. Son signe révèle ton style d'amour." },
    { key: 'Mars',    name: 'Mars',     glyph: '♂',
        desc: "Mars est ta force de vie à l'état brut : le désir, le courage, la capacité d'agir et de défendre ce qui compte pour toi. C'est lui qui passe à l'acte quand les autres hésitent, lui qui dit non, lui qui veut. Il décrit ta manière de te battre — de front ou en stratège, à chaud ou à froid — et ta relation à la colère, cette énergie mal-aimée qui est d'abord une information. Un Mars assumé donne de l'élan et des limites claires ; refoulé, il devient irritabilité, épuisement ou agressivité détournée. Son signe montre comment tu conquiers." },
    { key: 'Jupiter', name: 'Jupiter',  glyph: '♃',
        desc: "Jupiter est le grand bienfaiteur du thème : là où il se trouve, la vie voit grand. Il gouverne la croissance, la confiance, l'optimisme, le sens — cette conviction intime que l'existence a une direction et qu'elle vaut la peine. Il montre où tu as naturellement de l'aisance, où les portes s'ouvrent, où ta générosité attire celle des autres. Mais l'abondance a son revers : l'excès, la promesse facile, le trop qui dilue. Bien vécu, Jupiter est ta foi en la vie ; mal canalisé, il gonfle tout sans rien approfondir. Son signe indique ta façon de grandir." },
    { key: 'Saturn',  name: 'Saturne',  glyph: '♄',
        desc: "Saturne est le maître du temps et des structures : il montre où la vie te demande de mûrir, de faire tes preuves, de construire lentement ce qui tiendra. Longtemps redouté des astrologues, c'est en réalité un allié exigeant : là où il se trouve, rien n'est donné, tout se gagne — et ce que tu gagnes là, personne ne peut te le prendre. Il parle de tes peurs fondatrices, de ton rapport à l'autorité et à la responsabilité. Sa promesse est réelle : la maîtrise vient avec les années. Son signe décrit la matière de tes leçons de vie." },
    { key: 'Uranus',  name: 'Uranus',   glyph: '♅',
        desc: "Uranus est l'éveilleur : la part de toi qui refuse de rentrer dans le rang, qui a besoin d'air, d'espace, d'authenticité. Il gouverne les ruptures libératrices, les intuitions fulgurantes, le génie personnel — cette façon unique de voir que personne ne t'a apprise. Là où il se trouve, tu ne peux pas faire comme tout le monde, et ce n'est pas un défaut : c'est une fonction. Mal vécu, il devient instabilité chronique ou rébellion sans cause. Bien intégré, il fait de toi un innovateur. Planète lente, son signe colore toute ta génération ; sa maison le rend personnel." },
    { key: 'Neptune', name: 'Neptune',  glyph: '♆',
        desc: "Neptune dissout les frontières : entre toi et les autres, entre le réel et le rêve, entre le visible et l'invisible. Il gouverne l'imaginaire, la compassion, l'inspiration artistique et spirituelle — tout ce qui te dépasse et t'appelle. Là où il se trouve, tu perçois plus finement, mais tu peux aussi te perdre : idéaliser, fuir, te sacrifier sans compter. Son défi est le discernement : garder le lien au subtil sans quitter le sol. Planète lente, son signe marque toute une génération ; sa maison montre où, toi, tu rêves — et où tu dois rester lucide." },
    { key: 'Pluto',   name: 'Pluton',   glyph: '♇',
        desc: "Pluton est la force de transformation la plus profonde du thème : là où il se trouve, tu ne peux pas rester en surface. Il gouverne les crises qui métamorphosent, le pouvoir — le tien et celui que tu subis —, les vérités enterrées qui finissent toujours par remonter. Son processus est radical : quelque chose doit mourir pour que quelque chose naisse. C'est inconfortable, et c'est là que se cache ta plus grande puissance de régénération. Planète très lente, son signe marque une génération entière ; sa maison montre où, dans ta vie, opère cette alchimie." },
    { key: 'Lilith',  name: 'Lilith',   glyph: '⚸', isPoint: true,
        desc: "Lilith — la Lune noire — n'est pas une planète mais un point sensible : le point de l'orbite lunaire le plus éloigné de la Terre. Elle incarne la part de toi qui refuse de se soumettre : l'instinct brut, le désir sans excuse, la vérité qui dérange. Là où elle se trouve, tu as souvent été jugé, rejeté ou incompris — et c'est précisément là que se cache ta puissance la plus authentique. Elle demande à être reconnue, pas domestiquée. Apprivoiser sa Lilith, c'est cesser de s'excuser d'exister et transformer une vieille honte en souveraineté tranquille." },
    { key: 'NorthNode', name: 'Nœud Nord', glyph: '☊', isPoint: true,
        desc: "Le Nœud Nord n'est pas une planète mais un point de destinée : l'intersection entre le chemin de la Lune et celui du Soleil. La tradition y lit ta direction d'évolution — ce que ta vie cherche à développer, par opposition aux réflexes du passé (le Nœud Sud, juste en face) où tu excelles déjà mais qui ne te font plus grandir. Ce qui se trouve là te semble souvent étranger, inconfortable, presque interdit : c'est le signe que c'est le bon cap. Chaque pas dans cette direction apporte une sensation rare de justesse. Non pas un destin subi, mais une invitation." },
];

/** Clés participant au calcul des aspects (planètes classiques uniquement). */
export const ASPECT_PLANET_KEYS = PLANETS.filter((p) => !p.isPoint).map((p) => p.key);

// ─── Maisons ───────────────────────────────────────────────────────────────────

export const HOUSE_MEANINGS = [
    "La maison I est ta porte d'entrée dans le monde : ton apparence, ton énergie de départ, la première impression que tu laisses. C'est le masque et le tempérament à la fois — la manière instinctive dont tu abordes toute nouvelle situation. Son signe (l'Ascendant) colore tout le thème : il agit comme le filtre à travers lequel le reste de ta personnalité s'exprime.",
    "La maison II parle de ce qui te fait te sentir en sécurité : l'argent, les biens, mais plus profondément tes ressources propres — talents, valeurs, estime de toi. Elle décrit ta façon de gagner ta vie et ton rapport au concret. Sa question centrale : sur quoi peux-tu vraiment compter, et connais-tu ta propre valeur ?",
    "La maison III est celle du mental en mouvement : la parole, l'écriture, les apprentissages, les trajets du quotidien. Elle gouverne aussi les frères et sœurs, les voisins, ce tissu de liens proches qui forme ton premier réseau. Elle raconte ta curiosité, ta manière d'échanger et de nommer le monde qui t'entoure.",
    "La maison IV est le fond de ton thème et le fond de toi : la famille, les racines, ce que tu as reçu (ou pas) comme base. C'est ton chez-toi intérieur autant que ta maison réelle — l'endroit où tu retires ton armure et te ressources. Elle parle de ton héritage émotionnel et de ce dont tu as besoin pour te sentir enraciné.",
    "La maison V est celle de la joie créatrice : tout ce que tu mets au monde parce que ça te rend vivant — œuvres, projets, amours, enfants. Elle gouverne le jeu, le plaisir, le romantisme, l'expression de soi. Sa question : oses-tu créer et aimer pour le plaisir, sans garantie ni justification ?",
    "La maison VI est l'atelier du quotidien : le travail de tous les jours, les routines, la santé, le service rendu. C'est là que les grands idéaux se confrontent au concret — ce que tu fais réellement de tes journées. Elle parle de ton corps comme baromètre : quand la vie quotidienne ne te convient plus, c'est souvent lui qui le dit en premier.",
    "La maison VII est le miroir : le couple, les associations, tous les face-à-face durables. Ce que tu n'as pas reconnu en toi, tu le rencontres ici, chez l'autre — c'est la maison où l'on apprend qui l'on est par la relation. Elle décrit ce que tu cherches chez un partenaire et ta manière de t'engager.",
    "La maison VIII est celle des profondeurs : l'intimité vraie, la sexualité, les ressources partagées, les crises qui transforment. On y perd le contrôle — et c'est le but : apprendre à faire confiance, à fusionner, à lâcher. Maison des héritages matériels et psychiques, elle est réputée intense : ce qui s'y joue ne laisse jamais indemne, mais fait renaître.",
    "La maison IX est l'appel du large : les voyages lointains, les études supérieures, la philosophie, la spiritualité. Après l'intensité de la VIII, elle cherche du sens et de la hauteur — une vision du monde qui tienne debout. Elle raconte ta quête personnelle de vérité et ce qui élargit ton horizon.",
    "La maison X est ton sommet visible : la vocation, la carrière, la place que tu prends dans la société. C'est ce que tu construis aux yeux de tous, ta contribution publique, ta réputation. Son signe (le Milieu du Ciel) indique la direction de l'accomplissement — non pas juste un métier, mais une œuvre de vie.",
    "La maison XI est celle des alliés et de l'avenir : les amitiés, les groupes, les causes, les projets à long terme. Elle décrit ta place dans le collectif — ce que tu apportes au groupe et ce que le groupe éveille en toi. Maison des espoirs et des idéaux, elle demande : vers quel futur tends-tu, et avec qui ?",
    "La maison XII est la plus secrète : l'inconscient, la solitude choisie ou subie, la spiritualité, tout ce qui se vit en retrait du monde. On y trouve ses fantômes et ses trésors cachés — ce qui doit être déposé, pardonné, ou offert sans retour. Loin d'être une maison maudite, c'est celle de l'intériorité : le silence d'où tout renaît.",
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ─── Aspects ───────────────────────────────────────────────────────────────────

export const ASPECTS_DEF: AspectDef[] = [
    { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: WHEEL_T.aspConj,    glyph: '☌',
        desc: "Deux planètes côte à côte fusionnent leurs énergies : elles ne peuvent plus agir l'une sans l'autre. C'est l'aspect le plus puissant du thème — une alliance permanente, ni bonne ni mauvaise en soi, tout dépend des planètes mariées. Leurs forces s'amplifient mutuellement, leurs défauts aussi. Celui qui porte une conjonction la vit rarement comme un trait de caractère : c'est plutôt une évidence intérieure, un réflexe si fondamental qu'il ne le remarque plus. Le travail consiste à différencier les deux voix pour que l'une n'étouffe pas l'autre, puis à jouer leur duo en conscience." },
    { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: WHEEL_T.aspSextile, glyph: '⚹',
        desc: "Le sextile relie deux planètes complices : leurs énergies se comprennent et peuvent coopérer facilement — à condition que tu fasses le premier pas. C'est l'aspect des opportunités : une porte déverrouillée, mais qu'il faut tout de même pousser. Contrairement au trigone qui coule tout seul, le sextile récompense l'initiative : chaque fois que tu actives consciemment ce lien, il répond, et il se renforce avec l'usage. Les astrologues y voient un potentiel d'apprentissage : un talent en devenir plutôt qu'un don acquis. Sa seule faiblesse : il est si discret qu'on peut passer une vie sans s'en servir." },
    { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: WHEEL_T.aspSquare,  glyph: '□',
        desc: "Le carré met deux planètes en friction : elles veulent des choses différentes, en même temps, et aucune ne cédera. C'est l'aspect le plus inconfortable — et, de l'avis de la plupart des astrologues, le plus fécond. Cette tension interne crée une énergie énorme qui cherche une issue : ignorée, elle se répète en conflits extérieurs ; travaillée, elle devient un moteur de réalisation hors du commun. Les personnes qui accomplissent de grandes choses ont rarement des thèmes tout en douceur. Le carré ne se résout jamais complètement : il s'apprivoise, et c'est lui qui te muscle." },
    { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: WHEEL_T.aspTrine,   glyph: '△',
        desc: "Le trigone relie deux planètes du même élément : leurs énergies circulent naturellement, sans effort ni résistance. C'est le don du thème — un talent inné, une facilité qui te semble si normale que tu peines à croire que tout le monde ne l'a pas. Là où le carré force à grandir, le trigone offre : harmonie, fluidité, chance apparente. Son paradoxe : ce qui ne coûte rien est rarement valorisé. Beaucoup de trigones dorment toute une vie, faute d'avoir été mis au travail. Reconnaître ce don, puis l'exercer délibérément, c'est transformer une facilité en véritable maîtrise." },
    { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: WHEEL_T.aspOppos,   glyph: '☍',
        desc: "L'opposition place deux planètes face à face, aux deux bouts du ciel : deux besoins légitimes qui semblent s'exclure. C'est l'aspect de la polarité — et souvent celui qu'on vit à travers les autres : on incarne un pôle, et on attire des personnes ou des situations qui incarnent l'autre, jusqu'à ce qu'on reconnaisse que les deux vivent en soi. Comme un balancier, elle fait osciller d'un extrême à l'autre avant de trouver le point d'équilibre. Sa promesse est belle : l'intégration. Non pas choisir un camp, mais devenir assez vaste pour contenir les deux." },
];
