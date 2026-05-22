import type { CompatibilityV2Data } from './types';

export const MOCK_COMPAT_V2: CompatibilityV2Data = {
    userName: 'Clément',
    userInitial: 'C',
    partnerName: 'Test',
    partnerInitial: 'T',
    score: 95,
    tagline: 'Un lien puissant, alliant stabilité et vivacité d\'esprit',
    dimensions: [
        {
            id: 'amour',
            name: 'Amour',
            value: 92,
            detail: 'Vénus de Clément harmonise les besoins affectifs de Test : tendresse spontanée, gestes attentifs au quotidien.',
        },
        {
            id: 'conflits',
            name: 'Conflits',
            value: 78,
            detail: 'Mars en Bélier double : les désaccords éclatent vite, mais se résolvent aussi vite. Pas de rancune installée.',
        },
        {
            id: 'attirance',
            name: 'Attirance',
            value: 96,
            detail: 'Conjonction Pluton-Pluton : magnétisme intense, fascination réciproque qui dépasse la simple alchimie physique.',
        },
        {
            id: 'long_terme',
            name: 'Long terme',
            value: 88,
            detail: 'Jupiter en Cancer chez les deux : foyer, famille et stabilité comme socle commun pour bâtir dans la durée.',
        },
        {
            id: 'communication',
            name: 'Communication',
            value: 74,
            detail: 'Tension Mercure / Ascendant : façons de penser différentes. À travailler en prenant le temps de reformuler.',
        },
    ],
    analyse: {
        headline: 'Un lien puissant, alliant stabilité et vivacité d\'esprit',
        summary: [
            'Clément et Test partagent une profondeur émotionnelle rare et beaucoup de points communs dans leurs valeurs, grâce à des énergies très similaires.',
            'Cependant, leurs différences dans la communication et l\'ambition génèrent des malentendus et de la tension, exigeant un effort constant pour s\'écouter.',
        ],
        long_text: [
            'Leur complicité martienne et vénusienne stimule un équilibre entre passion et douceur, mais les défis liés à leur exigence mutuelle les mettent en difficulté.',
            'Cette relation fonctionne comme un miroir intensifiant : chacun révèle à l\'autre des facettes profondes, et l\'évolution personnelle de l\'un nourrit celle de l\'autre.',
        ],
    },
    forces: [
        {
            planet: 'pluto',
            badge: 'scorpio',
            title: 'Conjonction Pluton — Pluton',
            summary: 'Transformation commune, lien intense',
            detail: 'La conjonction de leurs Pluton respectifs révèle une transformation commune. Clément et Test vivent une relation intense où les remises en question profondes renforcent leur union plutôt que de la fragiliser.',
            tags: [
                { icon: 'sparkle', label: 'Transformation' },
                { icon: 'bolt', label: 'Intensité' },
            ],
        },
        {
            planet: 'mars',
            badge: 'aries',
            title: 'Mars en Bélier coordonné',
            summary: 'Énergie d\'action partagée',
            detail: 'Leur Mars en Bélier coordonné et soutenu par l\'Ascendant crée une dynamique d\'action et d\'initiatives partagées — un couple énergique, capable de surmonter ensemble les obstacles.',
            tags: [
                { icon: 'bolt', label: 'Initiative' },
                { icon: 'heart', label: 'Élan commun' },
            ],
        },
        {
            planet: 'jupiter',
            badge: 'cancer',
            title: 'Jupiter en Cancer',
            summary: 'Empathie et soutien émotionnel',
            detail: 'L\'accord entre leurs Jupiter en Cancer génère un sens commun de l\'empathie et du soutien émotionnel, favorisant un climat rassurant malgré la fougue qui peut s\'exprimer entre eux.',
            tags: [
                { icon: 'heart', label: 'Empathie' },
                { icon: 'anchor', label: 'Sécurité' },
            ],
        },
    ],
    vigilance: [
        {
            planet: 'mercury',
            badge: 'gemini',
            title: 'Mercure ↔ Ascendant en tension',
            summary: 'Communication parfois frustrante',
            detail: 'La tension entre Mercure de Clément et l\'Ascendant de Test indique que leurs façons de penser et d\'exprimer leurs idées entrent en conflit, ce qui occasionne des incompréhensions frustrantes.',
            tags: [
                { icon: 'chat', label: 'Reformuler' },
                { icon: 'pulse', label: 'Patience' },
            ],
        },
        {
            planet: 'sun',
            badge: 'capricorn',
            title: 'Soleil carré Milieu du Ciel',
            summary: 'Ambitions à harmoniser',
            detail: 'Le Soleil de Clément en carré avec le Milieu du Ciel de Test traduit des défis dans la gestion des ambitions et projets personnels, rendant difficile l\'harmonisation de leurs objectifs.',
            tags: [
                { icon: 'anchor', label: 'Aligner les caps' },
            ],
        },
    ],
    aspect_cle: {
        planet_a: 'pluto',
        planet_b: 'pluto',
        name: 'Pluton ☌ Pluton',
        desc: 'La conjonction parfaite entre les Pluton de Clément et Test symbolise un lien aussi profond qu\'exceptionnel, où chacun agit comme un miroir intensifiant les transformations intérieures de l\'autre. Au quotidien, cela se traduit par une relation où le changement personnel est constant, parfois exigeant et bouleversant, mais absolument stimulant pour leur croissance commune.',
    },
    conseil: {
        title: 'Conseil de Lyra',
        text: 'Clément et Test doivent cultiver la patience en communication, en étant attentifs aux façons très différentes dont ils expriment leurs idées et émotions. Apprendre à ralentir les débats pour vraiment écouter sans juger améliorera considérablement leur harmonie.',
    },
};
