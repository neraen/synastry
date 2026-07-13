/**
 * Carte du ciel — descriptions des aspects par paire de planètes.
 * Trois textes par paire : conjonction / harmonique (sextile, trigone) /
 * tension (carré, opposition). La différence de nature entre sextile et
 * trigone, ou carré et opposition, est expliquée dans l'aide de la carte.
 *
 * Clés : `${a}-${b}` dans l'ordre de PLANETS (astro-content.ts) —
 * Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
 * Les combinaisons astronomiquement impossibles sont omises
 * (ex. Soleil-Mercure ne peut être que conjoint).
 */

export type AspectPairTexts = {
    /** Conjonction (0°) */
    conjunction?: string;
    /** Sextile (60°) et trigone (120°) */
    soft?: string;
    /** Carré (90°) et opposition (180°) */
    hard?: string;
};

/**
 * Texte spécifique d'un aspect (paire + type), ou null si absent.
 * Tolère les clés dans les deux sens.
 */
export function aspectPairText(aKey: string, bKey: string, aspectId: string): string | null {
    const entry = ASPECT_PAIRS[`${aKey}-${bKey}`] ?? ASPECT_PAIRS[`${bKey}-${aKey}`];
    if (!entry) return null;
    if (aspectId === 'conjunction') return entry.conjunction ?? null;
    if (aspectId === 'sextile' || aspectId === 'trine') return entry.soft ?? null;
    return entry.hard ?? null;
}

export const ASPECT_PAIRS: Record<string, AspectPairTexts> = {

    // ── Soleil ────────────────────────────────────────────────────────────────

    'Sun-Moon': {
        conjunction: "Ta volonté et tes émotions parlent d'une seule voix : ce que tu veux et ce dont tu as besoin se confondent. C'est la signature d'une naissance de nouvelle lune : une belle cohérence intérieure et une grande force d'élan. Son revers : peu de recul sur toi-même. L'autre te sert de miroir : écoute ce qu'il te renvoie.",
        soft: "Ce que tu veux et ce dont tu as besoin vont dans le même sens : tes décisions respectent tes émotions sans que tu aies à y penser. Cela donne un tempérament équilibré, à l'aise avec lui-même, souvent apaisant pour les autres. Ce confort intérieur est un vrai capital : appuie-toi dessus dans les périodes de tempête.",
        hard: "Ta volonté tire d'un côté, tes besoins émotionnels de l'autre : ce que tu décides ne nourrit pas toujours ce que tu ressens. D'où une impression récurrente de tiraillement intérieur, parfois d'insatisfaction sans cause visible. La clé : cesser de choisir un camp. Tes objectifs et ta sensibilité sont deux associés à mettre autour de la même table.",
    },
    'Sun-Mercury': {
        conjunction: "Ton identité et ton intelligence sont soudées : tu penses ce que tu es, tu dis ce que tu penses. Cela donne un esprit vif, subjectif, très identifié à ses idées : une critique de tes opinions peut sembler viser ta personne. Ta force : une parole incarnée et convaincante. Ton exercice : accueillir la contradiction comme une information, pas comme une attaque.",
    },
    'Sun-Venus': {
        conjunction: "Le charme fait partie de ton identité : besoin d'aimer, d'être apprécié, de mettre de la beauté dans ce que tu fais. Cette conjonction adoucit la personnalité et attire naturellement la sympathie. Son piège : arrondir les angles pour plaire, au point de t'oublier. Ta vraie séduction commence là où tu restes fidèle à toi-même.",
    },
    'Sun-Mars': {
        conjunction: "Volonté et action ne font qu'un : tu veux, donc tu fais. Cette conjonction donne du courage, de l'endurance et un tempérament direct qui ne triche pas. L'énergie est immense, l'impatience aussi : la colère peut monter vite quand quelque chose freine ton élan. Canalisée dans un projet, un sport, un combat qui en vaut la peine, c'est une force de pionnier.",
        soft: "Ton énergie est bien branchée : quand tu décides, le corps suit, sans forcer. Tu sais te battre pour ce qui compte sans écraser personne, et ton assurance tranquille inspire confiance. Ce talent est si naturel que tu peux le sous-estimer : mets-le au service d'objectifs ambitieux, il est fait pour ça.",
        hard: "Ton énergie dépasse parfois ta volonté : impatience, précipitation, mots qui partent trop vite. Cet aspect donne une combativité réelle qui a besoin d'un terrain d'expression, faute de quoi elle se retourne en irritabilité ou en conflits répétitifs. Bien apprivoisé, c'est un moteur : les grandes capacités de travail et de dépassement se logent souvent ici.",
    },
    'Sun-Jupiter': {
        conjunction: "L'optimisme est ta base : confiance en la vie, besoin de voir grand, générosité naturelle. Cette conjonction attire les opportunités parce que tu oses demander et que ton enthousiasme est contagieux. Son excès : promettre trop, te disperser, croire que tout ira toujours bien. Garde l'élan, ajoute la mesure : c'est la recette de ta réussite.",
        soft: "La confiance te vient facilement : tu vois les possibilités là où d'autres voient les obstacles, et la vie semble souvent te rendre la pareille. C'est un vrai facteur de chance, mais une chance qui dort si tu ne la sollicites pas. Ose viser plus haut que le raisonnable : cet aspect est fait pour soutenir tes audaces.",
        hard: "Ton besoin de grandir se heurte à ta mesure : tendance à l'excès, à trop promettre, à voir plus grand que tes moyens du moment. L'enthousiasme est réel mais il déborde. Cet aspect apprend le discernement : toutes les portes ouvertes ne méritent pas d'être franchies. Quand tu choisis tes batailles, ton ambition devient une force redoutable.",
    },
    'Sun-Saturn': {
        conjunction: "Le sérieux est entré tôt dans ta vie : sens du devoir, exigence envers toi-même, sentiment de devoir mériter ta place. Cette conjonction donne une étoffe rare : patience, fiabilité, capacité à construire sur la durée. Son ombre : une autocritique sévère et la difficulté à savourer tes réussites. Ce que tu bâtis tient debout : accorde-toi le droit d'en être fier.",
        soft: "Ambition et patience travaillent main dans la main : tu sais où tu vas et tu acceptes que ça prenne du temps. Cet aspect donne une maturité naturelle, un jugement sûr, une autorité tranquille qui inspire confiance. C'est le profil du bâtisseur : ce que tu entreprends sérieusement finit par tenir debout, et longtemps.",
        hard: "Ton élan rencontre un frein intérieur : doute, peur de l'échec, sentiment que rien ne te sera donné. Cet aspect pèse dans la jeunesse puis devient un atout : il forge une ténacité que les facilités ne donnent jamais. Le point de bascule : cesser de chercher l'approbation d'une autorité, réelle ou intérieure, et devenir ta propre référence.",
    },
    'Sun-Uranus': {
        conjunction: "L'indépendance n'est pas un choix chez toi, c'est une nécessité : besoin d'être toi-même, quitte à détonner. Cette conjonction donne de l'intuition, du magnétisme, un refus viscéral des cases. Son défi : la stabilité, que tu confonds parfois avec l'enfermement. Ta voie : construire une vie assez originale pour ne pas avoir à la fuir.",
        soft: "Ton originalité s'exprime sans provoquer : tu innoves, tu surprends, tu gardes ta liberté sans casser ce qui tient. Intuitions rapides, aisance avec la nouveauté, don pour réinventer ce qui s'essouffle. C'est une modernité naturelle : fais-lui confiance quand la routine s'installe, elle trouve toujours une porte de sortie.",
        hard: "Ton besoin d'être toi-même bouscule ta stabilité : coups de tête, ruptures, envie soudaine de tout envoyer promener quand tu te sens à l'étroit. Derrière l'agitation, une vraie question : où est ta liberté non négociable ? Tant qu'elle n'a pas sa place dans ta vie, elle la prendra par surprise. Donne-lui un territoire, elle deviendra créativité.",
    },
    'Sun-Neptune': {
        conjunction: "Ton identité a des frontières poreuses : grande sensibilité, imagination, intuition des ambiances et des gens. Cette conjonction donne un charisme doux, presque insaisissable, et un vrai potentiel artistique ou spirituel. Son risque : te perdre dans les attentes des autres ou dans tes rêves. Ton ancrage : une pratique concrète qui donne un corps à l'inspiration.",
        soft: "Inspiration et identité coopèrent : tu captes finement les atmosphères, les non-dits, ce qui se joue sous la surface, et tu peux en faire quelque chose : de l'art, de l'aide, une intuition juste au bon moment. Cette sensibilité ne te déstabilise pas, elle t'informe. C'est un radar discret : plus tu l'écoutes, plus il devient précis.",
        hard: "Ton image de toi se brouille par moments : idéalisation, doutes sur ta valeur, tentation de fuir dans le rêve quand le réel déçoit. Cet aspect demande de la lucidité : distinguer ce que tu es de ce qu'on projette sur toi, et de ce que tu projettes sur les autres. Bien travaillé, il affine une intuition et une compassion rares.",
    },
    'Sun-Pluto': {
        conjunction: "Une intensité de fond habite ta personnalité : volonté puissante, regard qui perce les façades, besoin d'aller au bout des choses. Cette conjonction donne une capacité de transformation hors norme : tu peux te réinventer là où d'autres s'effondrent. Son ombre : le contrôle. Apprendre à faire confiance sans tout maîtriser, c'est ton grand œuvre.",
        soft: "Ta force intérieure est bien intégrée : tu sais tenir dans les crises, comprendre ce qui se joue en profondeur, et te régénérer. Les autres sentent cette solidité et viennent s'y appuyer. C'est un pouvoir discret qui grandit avec l'usage : chaque épreuve traversée consciemment le rend plus disponible.",
        hard: "Ta volonté rencontre une force plus grande qu'elle : besoin de contrôle, rapports de pouvoir, crises qui te transforment de fond en comble. Cet aspect est exigeant mais il forge les personnalités les plus profondes : chaque lâcher-prise consenti libère une énergie énorme. Le pouvoir que tu cherches à l'extérieur t'attend à l'intérieur.",
    },

    // ── Lune ──────────────────────────────────────────────────────────────────

    'Moon-Mercury': {
        conjunction: "Chez toi, sentir et penser sont une seule opération : tes émotions se mettent en mots presque instantanément. Cela donne une intelligence du vécu, une mémoire affective précise, un vrai talent pour raconter. Le revers : le mental rumine ce que le cœur ressent. Écrire, parler, poser les choses : c'est ta façon naturelle de digérer la vie.",
        soft: "Ton cœur et ton esprit se parlent facilement : tu sais dire ce que tu ressens avec justesse, et écouter sans déformer. Ce don rend tes échanges nourrissants : les gens se sentent compris à ton contact. C'est aussi un atout d'écriture et de récit : ta parole touche parce qu'elle vient du vécu.",
        hard: "Ta tête et ton cœur ne racontent pas toujours la même histoire : le mental analyse ce que l'émotion vit, l'émotion parasite ce que le mental décide. D'où des ruminations, des mots qui dépassent la pensée sous le coup de l'humeur. La clé : donner un canal aux deux. Écris ce que tu ressens, dis les choses à froid.",
    },
    'Moon-Venus': {
        conjunction: "La douceur est ton langage natal : besoin d'harmonie, d'affection, de beauté dans le quotidien. Cette conjonction donne du charme, du goût, une manière chaleureuse d'accueillir les autres. Son piège : acheter la paix au prix de tes besoins réels. Tu mérites la tendresse que tu offres : apprends aussi à la demander.",
        soft: "Aimer et être aimé te semble naturel : tes besoins affectifs et ta façon d'aimer s'accordent sans effort. Cela donne un contact facile, un goût sûr, un talent pour créer des moments et des lieux où l'on se sent bien. Ce confort relationnel est précieux : il fait de toi un port d'attache pour les tiens.",
        hard: "Tes besoins de sécurité et tes élans affectifs se contrarient : envie de plaire mais besoin d'être rassuré, désir de douceur mais humeurs qui compliquent. D'où parfois des compensations : sucre, achats, dépendance au regard de l'autre. Le travail : nourrir toi-même ta sécurité intérieure au lieu d'attendre que l'amour le fasse à ta place.",
    },
    'Moon-Mars': {
        conjunction: "Tes émotions passent directement à l'action : réactivité, spontanéité, courage du cœur. Tu défends les tiens comme une place forte et tu ne sais pas faire semblant. Le revers : l'irritabilité, les réactions à chaud regrettées à froid. Ton énergie émotionnelle est une force motrice : offre-lui du mouvement, du sport, des projets, plutôt que des disputes.",
        soft: "Ta sensibilité et ton énergie font équipe : tu réagis vite mais juste, tu défends sans agresser, tu oses dire ce qui te touche. Cela donne une vitalité émotionnelle communicative : on sait où l'on en est avec toi, et ça rassure. C'est le courage du cœur : celui d'agir en accord avec ce que tu ressens.",
        hard: "Tes émotions et ton agressivité s'allument ensemble : susceptibilité, réactions vives, colères qui montent plus vite que tu ne voudrais. Derrière l'inflammable, un cœur qui se sent vite menacé. L'enjeu n'est pas de te calmer mais de traduire : la colère dit toujours qu'un besoin est piétiné. Nomme le besoin avant que le ton monte.",
    },
    'Moon-Jupiter': {
        conjunction: "Un cœur généreux, presque trop grand : besoin de donner, d'accueillir, de voir la vie du bon côté. Cette conjonction donne un optimisme émotionnel qui protège des vrais découragements et attire la sympathie. Son excès : trop donner, trop consommer, trop promettre pour faire plaisir. Ta bonne humeur est un don public : garde-t'en une part pour toi.",
        soft: "Ton monde émotionnel est naturellement confiant : tu rebondis vite, tu vois le bon chez les gens, tu sais consoler. Cette générosité du cœur crée autour de toi un climat où l'on respire mieux. C'est une chance affective réelle : les liens te réussissent quand tu oses les élargir.",
        hard: "Tes émotions voient grand : enthousiasmes démesurés, déceptions à la même échelle, difficulté à dire non quand le cœur s'emballe. Cet aspect donne beaucoup de chaleur mais peu de freins : les excès consolent les creux. Le travail : distinguer le besoin réel de l'envie du moment. La mesure rendra ta générosité durable.",
    },
    'Moon-Saturn': {
        conjunction: "Tes émotions ont appris tôt à se tenir : retenue, pudeur, sentiment d'avoir dû grandir vite. Cette conjonction donne une fiabilité affective rare : tu es là, vraiment, dans la durée. Son ombre : la difficulté à demander du réconfort, comme si tes besoins dérangeaient. Ils ne dérangent pas. La solidité que tu offres, autorise-toi à la recevoir.",
        soft: "Ta sensibilité est bien charpentée : tu ressens profondément sans te laisser déborder, et ta stabilité rassure ceux qui t'entourent. Cet aspect donne une maturité émotionnelle précoce, le sens des responsabilités affectives, une loyauté à toute épreuve. C'est un roc discret : les tiens savent qu'ils peuvent construire dessus.",
        hard: "Entre ton besoin de tendresse et ta peur du rejet, un vieux mur : tu contiens, tu anticipes la déception, tu fais l'économie de demander. Cette retenue vient de loin, mais elle n'est pas une fatalité. Chaque fois que tu exprimes un besoin et que le monde ne s'écroule pas, le mur perd une pierre. La sécurité se construit, elle ne s'attend pas.",
    },
    'Moon-Uranus': {
        conjunction: "Ton monde émotionnel est branché sur courant alternatif : humeurs changeantes, intuitions fulgurantes, besoin d'air dans les liens. Cette conjonction donne une sensibilité originale, imprévisible, réfractaire à la routine affective. Son défi : laisser les autres s'approcher sans te sentir piégé. La bonne distance existe : proche, mais jamais captif.",
        soft: "Ta sensibilité aime la liberté sans en faire un drame : tu as besoin d'espace dans tes liens et tu sais le prendre sans blesser. Intuition rapide, ouverture aux gens différents, capacité à dédramatiser : ton détachement est une élégance, pas une froideur. Tu rappelles aux autres qu'aimer et respirer ne s'opposent pas.",
        hard: "Tes besoins de sécurité et de liberté se disputent : envie de proximité, puis besoin urgent de distance dès que le lien se resserre. D'où des humeurs en zigzag et des ruptures parfois brutales. Derrière : la peur d'être englouti. Le travail : annoncer tes besoins d'espace au lieu de les prendre en fuyant. La liberté négociée ne détruit pas le lien.",
    },
    'Moon-Neptune': {
        conjunction: "Ton cœur est une éponge : tu ressens les émotions des autres comme les tiennes, parfois avant eux. Cette conjonction donne une compassion immense, une imagination féconde, un lien naturel au subtil. Son risque : la confusion entre ce qui est à toi et ce qui ne l'est pas. Les limites ne trahissent pas ta douceur : elles la rendent durable.",
        soft: "Ta sensibilité voit loin : empathie fine, imagination apaisante, intuition qui devine ce dont les autres ont besoin. Ce don fait de toi un refuge naturel, et il nourrit tout ce qui est créatif ou spirituel dans ta vie. Il fonctionne mieux ressourcé : ménage-toi des temps de solitude pour déposer ce que tu as absorbé.",
        hard: "Ta sensibilité déborde son lit : émotions floues, nostalgies sans objet, tendance à idéaliser puis à être déçu. Tu absorbes les ambiances au point de perdre ton propre signal. Cet aspect demande un tri quotidien : qu'est-ce qui est à moi, qu'est-ce qui vient des autres ? Ancrée dans le concret, ta sensibilité devient une boussole d'une justesse rare.",
    },
    'Moon-Pluto': {
        conjunction: "Tes émotions vivent en eaux profondes : rien n'est tiède, tout laisse une empreinte. Cette conjonction donne une intuition presque radiographique des gens, et des liens d'une intensité rare. Son ombre : la peur de l'abandon, qui peut serrer trop fort. Ton cœur sait renaître de tout : c'est sa vraie puissance, fais-lui confiance.",
        soft: "Ta profondeur émotionnelle est un atout tranquille : tu sens ce qui se joue sous la surface, tu tiens bon dans les tempêtes des autres, tu sais accompagner les vrais passages difficiles. Cette intensité maîtrisée attire la confiance : on te confie ce qu'on ne dit à personne. C'est un don d'accompagnant, quel que soit ton métier.",
        hard: "Tes attachements sont intenses jusqu'à la crispation : peur de perdre, jalousie, besoin de contrôler le lien pour te rassurer. Ces tempêtes viennent de loin, souvent d'une mémoire d'abandon. La sortie n'est pas de moins aimer, mais d'aimer sans retenir : plus tu desserres la prise, plus le lien devient sûr. Ce paradoxe est ta leçon.",
    },

    // ── Mercure ───────────────────────────────────────────────────────────────

    'Mercury-Venus': {
        conjunction: "Ton intelligence a du charme : mots choisis, ton juste, sens de la formule qui met à l'aise. Cette conjonction donne un esprit esthète, doué pour la diplomatie, la négociation, tous les arts du lien. Son revers : édulcorer le message pour préserver l'harmonie. Ta parole séduit déjà : elle peut aussi se permettre d'être franche.",
        soft: "Penser et plaire coopèrent chez toi : tu sais dire les choses avec tact, trouver le mot qui apaise, donner de l'élégance à une idée. C'est un talent social et artistique : conversation, écriture, goût. Il s'entretient comme une langue vivante : plus tu l'exerces, plus il devient précis.",
    },
    'Mercury-Mars': {
        conjunction: "Ton esprit est une lame : rapide, incisif, direct. Tu penses en avançant et tes mots portent, parfois plus fort que tu ne le mesures. Cette conjonction donne du répondant, un vrai courage intellectuel, un talent pour trancher. Son revers : la parole qui blesse ou qui s'impose. Ta force de frappe mentale mérite mieux que des joutes : donne-lui des causes.",
        soft: "Ton intelligence sait se battre proprement : arguments nets, décisions rapides, franchise sans brutalité. Tu penses vite et tu oses dire, ce qui fait de toi un allié précieux dans les débats et les urgences. Ce tranchant naturel gagne à servir des projets exigeants : il s'émousse dans les petites polémiques.",
        hard: "Ton mental et ton impulsivité s'embrasent ensemble : mots trop rapides, ton qui monte, esprit de contradiction. Les discussions tournent vite au duel, souvent malgré toi. Derrière : un esprit combatif qui a besoin d'adversité à sa mesure. Trouve-lui de vrais problèmes à résoudre : il fera des étincelles utiles au lieu de brûler les échanges.",
    },
    'Mercury-Jupiter': {
        conjunction: "Ton esprit voit large : besoin de comprendre le sens, pas seulement les faits. Cette conjonction donne un mental optimiste, doué pour enseigner, convaincre, relier les idées entre elles. Son excès : les généralisations et les promesses de trop. Quand ta vision s'appuie sur des détails vérifiés, elle devient une vraie sagesse communicative.",
        soft: "Comprendre et transmettre te viennent ensemble : tu expliques clairement, tu donnes envie d'apprendre, tu vois le schéma d'ensemble sans perdre ton interlocuteur. Cet aspect favorise les études, les voyages, tout ce qui élargit l'esprit. C'est une intelligence généreuse : elle grandit en se partageant.",
        hard: "Ton esprit veut tout embrasser : trop de projets, trop de promesses, des conclusions plus rapides que les vérifications. L'enthousiasme intellectuel est réel mais il survole. Cet aspect apprend la rigueur : une grande idée vérifiée vaut dix intuitions brillantes. Ta vision a besoin de méthode pour devenir influence.",
    },
    'Mercury-Saturn': {
        conjunction: "Ton esprit construit : pensée méthodique, parole mesurée, mémoire du long terme. Tu ne dis rien que tu ne puisses tenir, et cette parole rare a du poids. Cette conjonction donne la profondeur, parfois au prix du doute : tu peux sous-estimer ton intelligence parce qu'elle est lente à conclure. Elle conclut juste : c'est mieux.",
        soft: "Ta pensée a des fondations : concentration, logique, sens du détail qui compte. Tu apprends pour de bon, tu structures ce que d'autres laissent en vrac, et ta parole engagée vaut contrat. C'est l'intelligence des bâtisseurs : elle brille moins vite que d'autres, mais elle tient, et on finit toujours par s'appuyer dessus.",
        hard: "Ton esprit se censure : peur de dire une bêtise, pensées ruminées, pessimisme qui filtre les idées neuves. Ce doute a souvent une vieille histoire. Mais il cache une vraie rigueur : quand tu oses, tes analyses sont solides. Traite ton scepticisme comme un outil de vérification, pas comme un verdict sur ta valeur.",
    },
    'Mercury-Uranus': {
        conjunction: "Ton cerveau va plus vite que la moyenne : intuitions brusques, associations inattendues, solutions qui surgissent d'ailleurs. Cette conjonction donne un esprit inventif, original, allergique aux raisonnements convenus. Son revers : nervosité et impatience envers les esprits plus lents. Ton génie est réel : la pédagogie est son dernier kilomètre.",
        soft: "Ton intelligence innove sans effort : tu vois les raccourcis, les angles neufs, ce que la routine empêche les autres de voir. À l'aise avec la technique et la nouveauté, tu apprends vite et autrement. Ce talent aime les problèmes inédits : plus la question est neuve, plus ton esprit s'allume.",
        hard: "Ton mental est électrique : idées en rafale, difficulté à tenir une ligne, ennui foudroyant dès que ça se répète. Tu contredis parfois par réflexe, pour faire de l'air. Cette nervosité est le prix d'un esprit réellement original : il lui faut des projets à sa hauteur et des respirations. Structure ton génie sans le dresser.",
    },
    'Mercury-Neptune': {
        conjunction: "Ton esprit pense en images : imagination riche, intuition verbale, don pour la poésie, la musique des mots, les langages indirects. Cette conjonction brouille parfois la frontière entre le perçu et l'imaginé : distraction, flou, malentendus. Ton mental n'est pas fait pour la comptabilité : il est fait pour traduire l'invisible. Donne-lui ses vrais sujets.",
        soft: "Intuition et raison collaborent : tu comprends à la fois le texte et la musique, les faits et le non-dit. Ce don nourrit l'écoute, la créativité, les métiers du sens et de l'image. Il rend aussi tes explications vivantes : tu fais voir ce que tu racontes. C'est une intelligence poétique : le monde pratique en a plus besoin qu'il ne croit.",
        hard: "Ton mental et ton imaginaire se parasitent : idées floues, oublis, tendance à enjoliver ou à comprendre ce que tu espérais entendre. Les malentendus te suivent tant que tu ne vérifies pas. La discipline du concret — écrire, reformuler, confirmer — libère le meilleur : une pensée réellement inspirée, capable de capter ce que la logique seule ne voit pas.",
    },
    'Mercury-Pluto': {
        conjunction: "Ton esprit creuse : besoin de comprendre ce qui se cache sous les apparences, flair pour les non-dits, questions qui vont droit au point sensible. Cette conjonction donne une intelligence d'enquêteur et une parole qui marque. Son ombre : la rumination et le soupçon. Ta lucidité est une lampe puissante : éclaire, sans interroger tout le monde en suspect.",
        soft: "Ta pensée va naturellement à l'essentiel : tu détectes les enjeux cachés, tu comprends les motivations, tu sais garder un secret. Cette profondeur fait de toi un conseiller précieux dans les situations complexes. C'est une intelligence stratégique tranquille : elle voit loin parce qu'elle voit dessous.",
        hard: "Ton mental peut devenir obsessionnel : idées fixes, soupçons, discussions vécues comme des rapports de force. Tu veux la vérité, toute la vérité, parfois au bulldozer. Cette intensité intellectuelle est une force d'investigation rare : dirigée vers des énigmes dignes d'elle, elle perce ce que personne ne voit. Vers les proches, elle épuise. Choisis tes enquêtes.",
    },

    // ── Vénus ─────────────────────────────────────────────────────────────────

    'Venus-Mars': {
        conjunction: "Le désir et la tendresse habitent la même maison : quand tu aimes, tout ton être s'engage. Cette conjonction donne du magnétisme, une chaleur directe, un art d'aimer entier. Son revers : l'impatience amoureuse et les liens qui s'enflamment vite. Ta passion est un feu de qualité : il mérite des bois qui durent.",
        soft: "Chez toi, aimer et désirer s'accordent : ni guerre des sentiments, ni tiédeur. Tu exprimes ton attirance simplement, tu reçois l'affection sans te méfier, et cette aisance rend tes liens vivants. C'est une harmonie précieuse entre douceur et intensité : celle des amours qui ne s'éteignent pas.",
        hard: "Ton cœur et ton désir ne battent pas toujours ensemble : attiré par ce qui ne t'apaise pas, apaisé par ce qui ne t'attire plus. Cette tension anime tes liens d'une vibration réelle mais fatigante : conquêtes, frictions, redémarrages. L'enjeu : cesser d'exiger d'une même personne l'incendie et le refuge en alternance rapide. Les deux existent au même endroit, mais pas au même rythme.",
    },
    'Venus-Jupiter': {
        conjunction: "Aimer en grand : générosité affective, goût du beau, plaisir de recevoir et d'offrir. Cette conjonction attire la sympathie, et souvent la chance par les rencontres. Son excès : l'abondance qui déborde : trop de plaisirs, trop de dépenses, trop de oui. Ton cœur est une fête : veille juste à ce qu'elle ne tourne pas sans toi.",
        soft: "Le lien te réussit : chaleur naturelle, goût sûr, générosité qui attire la générosité. Les rencontres t'ouvrent des portes et ton optimisme affectif embellit la vie des tiens. Cette facilité est une chance réelle : elle donne le meilleur quand tu la mets au service de liens profonds, pas seulement agréables.",
        hard: "Ton cœur en veut toujours un peu plus : idéalisation, plaisirs compensatoires, difficulté à te contenter de ce qui est là. Cette soif d'absolu affectif est belle, mais elle épuise les liens réels, toujours plus petits que le rêve. La bascule : chercher l'intensité dans la profondeur plutôt que dans la nouveauté. Le « plus » que tu cherches est un « mieux ».",
    },
    'Venus-Saturn': {
        conjunction: "Tu prends l'amour au sérieux : fidélité, pudeur, engagement qui ne se donne pas à la légère. Cette conjonction donne des liens qui durent et une loyauté rare. Son ombre : la peur de ne pas mériter d'être aimé, qui fait garder ses distances. Ta réserve n'est pas de la froideur : mais dis-le à ceux qui t'aiment.",
        soft: "Ton cœur sait construire : constance, loyauté, préférence du vrai sur le brillant. Tu n'aimes pas vite, tu aimes bien : tes liens vieillissent comme les bonnes maisons, en prenant de la valeur. Cette fiabilité affective est un trésor discret : ceux qui te connaissent savent ce qu'elle vaut.",
        hard: "Entre l'envie d'aimer et la peur d'être déçu, ton cœur hésite : distances protectrices, sentiment de devoir mériter l'affection, liens où quelque chose retient. Cette prudence a une histoire, mais elle n'est pas ton destin : cet aspect fait les amours qui mûrissent tard et tiennent longtemps. Chaque risque affectif pris en conscience assouplit la vieille armure.",
    },
    'Venus-Uranus': {
        conjunction: "Ton cœur a besoin d'air : attirances soudaines, refus des liens qui enferment, amour et liberté exigés ensemble. Cette conjonction donne un charme atypique et des relations hors des sentiers battus. Son défi : la durée, que tu confonds parfois avec la cage. Le lien qui te convient existe : il aura des fenêtres ouvertes.",
        soft: "Tu aimes sans emprisonner : ton affection laisse respirer, ton originalité rafraîchit les liens, tu restes curieux de l'autre au lieu de le tenir pour acquis. Ce mélange de chaleur et de liberté est rare : il fait les couples qui restent vivants et les amitiés qui traversent les années sans se figer.",
        hard: "Ton besoin d'amour et ton besoin de liberté se marchent dessus : engouements brusques, lassitudes tout aussi brusques, sensation d'étouffer dès que le lien se stabilise. Ce n'est pas de l'inconstance : c'est une liberté qui n'a pas encore trouvé sa place dans l'intimité. Négocie l'espace au lieu de le prendre en fuyant : l'amour durable peut être un espace ouvert.",
    },
    'Venus-Neptune': {
        conjunction: "Tu aimes avec l'âme : romantisme profond, compassion, attirance pour la beauté qui élève. Cette conjonction donne un cœur d'artiste et une capacité d'amour presque sans condition. Son risque : aimer un rêve plutôt qu'une personne, et le payer en désillusions. Ton idéal est précieux : offre-le à des êtres réels.",
        soft: "Ton cœur perçoit la beauté partout : dans les gens, l'art, les instants. Cette sensibilité affective donne de la douceur à tes liens et une inspiration réelle : tu embellis ce que tu touches. Elle attire aussi les confidences : on sent chez toi un accueil sans jugement. C'est un amour qui fait du bien, à doser sans t'oublier.",
        hard: "L'amour rêvé et l'amour réel se disputent ton cœur : idéalisations, déceptions, parfois attirance pour ceux qu'il faudrait sauver. Tu aimes ce que la personne pourrait être ; elle, pendant ce temps, est. Ce chemin mène à une grande sagesse affective : aimer lucidement, sans fermer le cœur. La tendresse sans illusion est ta destination.",
    },
    'Venus-Pluto': {
        conjunction: "Tu aimes en profondeur ou pas du tout : attachements intenses, loyauté absolue, besoin de vérité dans le lien. Cette conjonction donne un magnétisme réel et des amours qui transforment. Son ombre : la possessivité et les jeux de pouvoir affectifs. Aimer sans retenir : c'est l'apprentissage qui libère toute ta puissance de cœur.",
        soft: "Ta profondeur affective est apprivoisée : tu sais aimer intensément sans étouffer, traverser les crises d'un lien sans le rompre, et régénérer les relations qui comptent. Les autres sentent qu'avec toi, on peut être entier. C'est un amour qui n'a pas peur du réel : il en sort toujours plus solide.",
        hard: "En amour, l'intensité te tient lieu de preuve : passions, jalousies, peur de perdre qui serre trop fort. Les liens tièdes t'ennuient, les liens forts te consument. Derrière ce feu : une mémoire de manque ou de trahison qui demande réparation. Le lien sûr n'est pas celui qu'on contrôle : c'est celui où l'on peut être vu entièrement. Vise celui-là.",
    },

    // ── Mars ──────────────────────────────────────────────────────────────────

    'Mars-Jupiter': {
        conjunction: "L'énergie et la foi réunies : quand tu crois en quelque chose, ta force est démultipliée. Cette conjonction donne de l'audace, de l'endurance, un enthousiasme entraînant : un vrai tempérament d'entrepreneur ou de capitaine. Son excès : trop d'un coup, puis plus rien. La régularité est ton seul vrai adversaire : bats-le, et peu de choses te résisteront.",
        soft: "Ton énergie est bien orientée : tu agis avec confiance, tu oses au bon moment, et tes initiatives tombent souvent juste. Ce mélange d'élan et de vision fait avancer les projets et motive les équipes. C'est une chance dynamique : elle se multiplie quand tu vises grand et honnête.",
        hard: "Ta fougue dépasse tes forces : trop de fronts ouverts, promesses d'énergie que le corps doit payer, impatience quand les résultats traînent. Cet aspect donne une puissance d'action réelle mais mal dosée. Apprends le tempo : un grand objectif, des étapes, du repos assumé. Ta ferveur canalisée peut soulever une montagne — pas dix.",
    },
    'Mars-Saturn': {
        conjunction: "Le frein et l'accélérateur dans le même pied : ton énergie est puissante mais contrôlée, parfois jusqu'à l'inhibition. Cette conjonction forge l'endurance des marathoniens : effort long, discipline, précision. Son ombre : la dureté envers toi-même. Ta force n'a pas besoin d'être punie pour être fiable : elle l'est déjà.",
        soft: "Ton énergie est disciplinée sans être bridée : tu sais doser l'effort, tenir la distance, finir ce que tu commences. Cette maîtrise donne une efficacité redoutable et une autorité naturelle dans l'action. C'est la force des artisans et des stratèges : moins spectaculaire que la fougue, infiniment plus sûre.",
        hard: "Ton élan rencontre un mur intérieur : alternance d'efforts intenses et de blocages, frustration, sensation de freiner et d'accélérer en même temps. Cette friction, exaspérante dans la jeunesse, forge une ténacité exceptionnelle : tu apprends à avancer avec la résistance. Les plus grandes endurances naissent ici. Sois patient avec ta patience.",
    },
    'Mars-Uranus': {
        conjunction: "Ton énergie est un éclair : décisions instantanées, réflexes hors norme, besoin d'une action libre et non surveillée. Cette conjonction donne du courage pour l'inédit : tu oses ce que personne n'a essayé. Son revers : l'imprudence et les coups de tête. Ton audace est un don rare : garde-la pour les sauts qui en valent la peine.",
        soft: "Ton audace est bien câblée : tu oses vite mais rarement à tort, tu improvises avec sang-froid, tu rafraîchis l'action collective par des initiatives inattendues. Ce mélange de nerf et d'intuition est précieux dans l'urgence et l'innovation. Il s'use dans la routine : offre-lui régulièrement du neuf.",
        hard: "Ton énergie déteste les contraintes : impulsivité, impatience, gestes brusques, révolte quand on t'impose un cadre. Les accidents de parcours viennent de là : agir avant de sentir. Cette électricité est pourtant une vraie force d'innovation. Le travail : mettre une demi-seconde entre l'impulsion et l'acte. Ce minuscule espace change tout.",
    },
    'Mars-Neptune': {
        conjunction: "Ton action suit une boussole invisible : tu agis par inspiration, pour un idéal, rarement pour la simple victoire. Cette conjonction donne une énergie subtile : charme agissant, stratégie intuitive, dévouement. Son risque : la dispersion et les combats flous. Quand la cause est claire et incarnée, ta force devient étonnamment efficace.",
        soft: "Ton énergie et ton intuition dansent ensemble : tu sens quand agir, comment approcher, où l'effort portera. Cela donne une efficacité douce, sans forcing, et un vrai talent pour les actions qui ont du sens : aider, créer, transmettre. C'est la force de l'eau : elle n'attaque pas, elle trouve le passage.",
        hard: "Ton énergie se brouille par moments : motivations floues, coups de mou inexpliqués, actions sabotées par le doute ou l'idéal impossible. Tu peux te battre pour des mirages et rester passif devant l'essentiel. La clé : des objectifs concrets, courts, vérifiables. L'inspiration revient plus vite par les actes que par l'attente.",
    },
    'Mars-Pluto': {
        conjunction: "Une force de fond peu commune : volonté totale, endurance dans l'extrême, capacité à renaître de tes cendres. Cette conjonction ne fait rien à moitié : quand tu t'engages, c'est entier. Son ombre : l'écrasement, de toi ou des autres, quand la puissance déborde. Dompter cette force sans l'éteindre : voilà ton art martial intérieur.",
        soft: "Ta puissance est intégrée : tu agis avec une détermination profonde mais sans violence, tu tiens dans les épreuves qui couchent les autres, et tu sais où porter l'effort. Cette force tranquille impressionne sans menacer. Elle donne le meilleur dans les grands défis : reconstruire, transformer, assainir.",
        hard: "Ta volonté peut devenir rouleau compresseur : rapports de force, colères froides, obstination au-delà du raisonnable. Quand tu veux, le monde doit plier : et il résiste, évidemment. Cette énergie colossale demande un adversaire à sa taille : une œuvre, une cause, un défi immense. Contre les personnes, elle détruit ; contre les problèmes, elle accomplit.",
    },

    // ── Jupiter ───────────────────────────────────────────────────────────────

    'Jupiter-Saturn': {
        conjunction: "L'élan et la structure réunis : tu veux grandir, mais du solide. Cette conjonction, rare — une fois tous les vingt ans —, donne le sens du projet à long terme : la vision plus la méthode. Son défi : l'alternance de foi et de doute. Quand les deux coopèrent, tu bâtis ce qui reste : c'est la signature des grands constructeurs.",
        soft: "L'optimisme et le réalisme s'équilibrent chez toi : tu vois grand sans perdre le sol, tu doutes sans te décourager. Ce jugement sûr fait de toi un pilier dans les projets : celui qui sait quand accélérer et quand consolider. C'est une sagesse pratique : elle transforme les ambitions en réalisations.",
        hard: "Ta confiance et ta prudence se contredisent : élans coupés par le doute, prudences regrettées, sensation de deux voix qui débattent chaque décision. Ce balancier est fatigant, mais il affine un jugement rare : ni naïf, ni frileux. Apprends à les faire parler dans l'ordre : l'enthousiasme propose, la rigueur dispose. Ensemble, ils font les grandes trajectoires.",
    },
    'Jupiter-Uranus': {
        conjunction: "La foi dans le nouveau : besoin d'explorer, d'inventer, de casser les plafonds. Cette conjonction donne des éclairs d'opportunité : des chances soudaines que tu es l'un des seuls à oser saisir. Son revers : l'instabilité des projets. Ta liberté est féconde quand elle construit : révolutionne, mais laisse des fondations.",
        soft: "La chance te vient par l'inattendu : rencontres fortuites, virages heureux, intuitions qui ouvrent des portes. Tu accueilles le changement en allié, et il te le rend bien. Ce flair pour les opportunités inédites est un capital : les grandes avancées de ta vie porteront rarement l'étiquette « prévu ».",
        hard: "Ton besoin d'expansion s'impatiente : envie de tout changer d'un coup, paris risqués, rébellion contre les limites même utiles. Les emballements retombent parfois durement. Cette énergie visionnaire a besoin d'un fil rouge : une direction stable dans laquelle tes révolutions successives s'additionnent au lieu de s'annuler.",
    },
    'Jupiter-Neptune': {
        conjunction: "La foi à l'état pur : besoin d'un idéal, d'une transcendance, d'un horizon plus grand que la vie ordinaire. Cette conjonction donne l'inspiration, la générosité, parfois une vraie dimension spirituelle ou artistique. Son risque : les mirages — promesses trop belles, paradis faciles. Garde ta foi immense : vérifie juste les adresses.",
        soft: "Idéal et confiance s'allient : tu crois au sens des choses et cette foi discrète te porte, notamment dans les passages difficiles. Elle donne aussi de la générosité : envie d'élever, d'aider, de partager le beau. C'est une richesse intérieure qui rayonne : les autres repartent de chez toi avec plus d'espoir.",
        hard: "Ta soif d'idéal déborde le réel : attentes immenses, désillusions à proportion, tentation de fuir dans le rêve, la croyance ou l'excès. Le monde semble toujours en dessous de ce qu'il devrait être. La maturité de cet aspect : incarner ton idéal en actes modestes et réguliers. Le paradis se plante comme un jardin, pas comme un décor.",
    },
    'Jupiter-Pluto': {
        conjunction: "L'ambition en profondeur : besoin de réussir grand et vrai, de transformer plutôt que d'accumuler. Cette conjonction donne un pouvoir de conviction impressionnant et une capacité à régénérer tout ce que tu touches. Son ombre : la démesure et l'appétit de pouvoir. Ta puissance est réelle : mets-la au service de ce qui grandit les autres.",
        soft: "Ta confiance a des racines profondes : tu sais mobiliser les ressources — les tiennes, celles des autres — et faire grandir ce qui en vaut la peine. Ce talent discret pour la transformation fructueuse attire naturellement les responsabilités. Utilisé avec éthique, il fait les réussites solides qui profitent au-delà de toi.",
        hard: "Ton ambition peut devenir dévorante : tout ou rien, victoires qui appellent la suivante, convictions imposées plus que partagées. Cette faim est en réalité une quête de sens qui se trompe de nourriture. La vraie question n'est pas « plus », mais « pour quoi ». Trouve la cause qui te dépasse : ta puissance y trouvera enfin sa paix.",
    },

    // ── Saturne ───────────────────────────────────────────────────────────────

    'Saturn-Uranus': {
        conjunction: "L'ordre et la rupture cohabitent en toi : respect du solide, besoin du neuf. Cette conjonction donne un talent rare : réformer sans détruire, moderniser ce qui mérite de durer. Son défi : les tiraillements entre sécurité et liberté. Tu es un pont entre deux mondes : c'est inconfortable, et précieux.",
        soft: "Tu sais changer sans casser : innover méthodiquement, libérer progressivement, donner une structure aux idées neuves. Ce mélange de rigueur et d'audace est très recherché : c'est celui des réformateurs efficaces. Ta liberté a des fondations : elle peut donc aller loin.",
        hard: "La stabilité et le changement se battent en toi : des périodes de discipline rigide, puis le besoin brutal de tout casser ; la tension entre le devoir et la liberté. Sa résolution : des cadres choisis, révisables, à toi. Ni prison, ni table rase : des structures vivantes, que tu peux faire évoluer sans les renverser.",
    },
    'Saturn-Neptune': {
        conjunction: "Le rêve et la rigueur mariés : tu peux donner un corps aux idéaux, une forme au subtil. Cette conjonction fait les artistes disciplinés, les idéalistes pragmatiques, les aidants organisés. Son défi : l'oscillation entre désenchantement et évasion. Ton œuvre : construire du sens, patiemment, dans le réel.",
        soft: "Idéal et réalisme coopèrent : tu sais ce qui compte, et comment le faire exister. C'est un don discret : rendre concret l'invisible — un projet qui a une âme, une aide qui s'organise, une œuvre qui tient. Ni cynisme, ni naïveté : le monde a grand besoin de ce mélange.",
        hard: "Tes rêves et tes peurs se renvoient la balle : idéaux découragés par le réalisme, devoirs sabotés par l'évasion, doutes sur le sens de tes efforts. Ce brouillard pose une question profonde : à quoi bon construire ? La réponse vient en construisant petit et vrai : chaque acte aligné dissipe un peu de brume. Le sens se fabrique.",
    },
    'Saturn-Pluto': {
        conjunction: "L'endurance à l'état pur : la capacité de traverser le pire et d'en sortir reconstruit. Cette conjonction donne une gravité, une profondeur, une résistance que rien d'artificiel ne peut donner. Son ombre : la dureté et le pessimisme de fond. Tu es taillé dans le roc : n'oublie pas que le roc peut aussi abriter.",
        soft: "Ta solidité va jusqu'à l'os : tu sais durer, assainir, reconstruire sur des bases saines. Les crises ne te trouvent pas désarmé : tu en connais la grammaire. Cette maîtrise profonde fait de toi un pilier dans les tempêtes collectives. C'est une force austère et précieuse : celle qui reste quand tout le reste a cédé.",
        hard: "La vie t'a semblé exiger beaucoup : épreuves structurantes, sentiment de devoir tenir seul, méfiance envers la facilité. Cet aspect forge dur : il donne une puissance de reconstruction exceptionnelle, au risque de la fermeture. Le défi n'est pas de tenir — tu sais faire — mais de rester ouvert en tenant. La vraie force n'a pas besoin d'armure.",
    },

    // ── Uranus, Neptune, Pluton (aspects de génération) ───────────────────────

    'Uranus-Neptune': {
        conjunction: "Aspect de génération : l'intuition du changement et le rêve d'un monde autre, portés par toute une classe d'âge. Personnellement, il donne une sensibilité aux mutations invisibles : tu sens les bascules d'époque avant qu'elles se voient. Sa maison dans ton thème montre où cette antenne capte le mieux.",
        soft: "Ton originalité et ton intuition s'accordent : tu innoves avec du sens, tu rêves avec de l'audace. Cet aspect générationnel devient personnel par sa maison : là, tu sais réinventer sans trahir l'essentiel. C'est un talent d'éclaireur discret : suivre ce qui te rend différent t'amène rarement au mauvais endroit.",
        hard: "L'agitation et le flou peuvent se relayer : besoin de changement sans direction claire, idéaux qui se succèdent sans se poser. Cet aspect générationnel se personnalise par sa maison : là, apprends à distinguer la vraie intuition du simple vertige. Un cap choisi et révisable vaut mieux que cent révélations successives.",
    },
    'Uranus-Pluto': {
        conjunction: "Aspect de génération : le besoin de transformer radicalement ce qui est figé. Personnellement, sa maison montre où tu portes cette énergie de mutation : là, tu ne peux pas te contenter de retouches. Ta radicalité y est légitime : donne-lui une œuvre plutôt qu'une guerre.",
        soft: "Changement et profondeur coopèrent : tu sais transformer sans brutalité, moderniser ce qui est bloqué, accompagner les mutations. Cet aspect générationnel devient un talent personnel dans sa maison : là, les crises te trouvent étonnamment compétent. Tu fais du neuf avec les décombres : c'est un vrai pouvoir.",
        hard: "Une tension entre rupture et pouvoir traverse ta génération : tout casser, ou tout contrôler. Personnellement, sa maison montre où cette intensité te bouscule : changements imposés, besoins de liberté qui se heurtent à des forces plus grandes. Ta marge : choisir tes révolutions au lieu de les subir.",
    },
    'Neptune-Pluto': {
        conjunction: "Aspect d'époque plus que de personne : la dissolution et la renaissance des grands récits collectifs. Sa maison dans ton thème indique où tu ressens le plus ces courants de fond : là, ta vie personnelle croise l'histoire commune.",
        soft: "Cet aspect, partagé par plusieurs générations, relie le rêve collectif et la transformation profonde. Personnellement, il agit en toile de fond : une capacité discrète à sentir les évolutions souterraines de ton époque. Sa maison montre où cette perception peut devenir un atout concret.",
        hard: "Aspect rare et générationnel : la tension entre les idéaux collectifs et les forces de transformation. Sa maison dans ton thème indique où tu ressens le plus ce tiraillement d'époque : là, garde ton propre cap au milieu des courants contraires.",
    },
};
