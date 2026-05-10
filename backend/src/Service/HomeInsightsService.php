<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Service\Webservice\OpenAiService;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class HomeInsightsService
{
    public function __construct(
        private OpenAiService $openAiService,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private NatalChartRepository $natalChartRepository,
        private CacheInterface $cache,
    ) {}

    /**
     * Get weekly energy insight (cached 7 days, key = userId + ISO week)
     */
    public function getWeeklyEnergy(User $user, string $locale = 'fr'): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $weekKey = $now->format('Y') . 'W' . $now->format('W');
        $cacheKey = sprintf('home_weekly_energy_%d_%s_%s', $user->getId(), $weekKey, $locale);

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($user, $locale) {
            $item->expiresAfter(7 * 24 * 3600);
            return $this->computeWeeklyEnergy($user, $locale);
        });
    }

    /**
     * Get current period insight (cached 3 days, key = userId + date truncated to 3-day block)
     */
    public function getCurrentPeriod(User $user, string $locale = 'fr'): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $dayBlock = (int) floor((int) $now->format('z') / 3);
        $cacheKey = sprintf('home_current_period_%d_%s_%d_%s', $user->getId(), $now->format('Y'), $dayBlock, $locale);

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($user, $locale) {
            $item->expiresAfter(3 * 24 * 3600);
            return $this->computeCurrentPeriod($user, $locale);
        });
    }

    private function computeWeeklyEnergy(User $user, string $locale): array
    {
        $transitsData = $this->getTransitsSummary($user);
        $natalSummary = $this->getNatalSummary($user);

        if ($locale === 'en') {
            $instructions = <<<'INST'
You are a sharp advisor who uses astrology as a lens — not a fortune teller. Your job is to translate planetary influences into concrete life themes: what the person will feel, what tensions will surface, what opportunities are real. No jargon, no planet names in the output, no "the universe". Write like a trusted friend who happens to read charts.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Based on these influences, describe what this week will feel like for this person — in human terms, not astrological ones.

Respond ONLY with valid JSON:
{
  "titre": "3-5 words, a punchy theme for the week — like a headline, not an astro term. Examples: 'Time to hold your ground', 'A week for bold moves', 'Clarity arrives late'",
  "resume": "2-3 sentences. What will the person feel or face this week? What's the dominant dynamic? Be specific and concrete — no 'the stars say', no planet names",
  "intensite": <integer 1-10, reflects how charged or demanding the week is>,
  "domaines": ["2-4 life areas affected — e.g. 'Relationships', 'Work', 'Finances', 'Self-confidence', 'Communication'"],
  "conseil": "One sharp, actionable sentence. What's the one thing worth doing or avoiding this week?"
}
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un astrologue praticien dans la lignée de Robert Hand et Stephen Arroyo. Tu lis les transits comme des dynamiques concrètes — pas des influences vagues.

Ton rôle : donner à cette personne le fil rouge de sa semaine. Pas un résumé d'horoscopes quotidiens — un thème directeur, une tension ou un élan qui va traverser les 7 prochains jours.

Comment tu écris :
- Parle de la personne, pas des astres. Aucun nom de planète dans le texte final. Aucun terme astrologique. Tu traduis les transits en situations, tensions, et ressentis humains.
- Sois spécifique au thème natal. Deux personnes avec les mêmes transits ne vivent pas la même semaine. Le natal te dit COMMENT cette personne va encaisser ou profiter de ce qui arrive. Utilise-le.
- Nomme les choses franchement. Si la semaine est tendue, dis-le. Si c'est fluide, dis-le. Pas de langue de bois, pas de faux positif pour rassurer.
- Première phrase = la plus forte. Le titre et le résumé doivent accrocher immédiatement.
- Le conseil doit être un vrai geste. Pas "reste à l'écoute". Quelque chose de précis, applicable, ancré dans le concret de la semaine.

Ce qui est interdit :
- Noms de planètes ou de signes dans le texte final
- Jargon : trigone, carré, aspect, transit, orbe, maison
- Vocabulaire New Age : "univers", "énergies", "vibration", "invitation à", "potentiel"
- Modaux mous : "peut-être", "pourrait", "il est possible"
- Injonctions creuses : "fais confiance", "reste ouvert", "accueille"
- Généralités interchangeables : "une semaine riche en émotions", "des changements se profilent"
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

En te basant sur le thème natal ET les transits, décris le fil rouge de la semaine de cette personne. Pas une liste de jours — un thème directeur, ce qui pousse et ce qui freine sur ces 7 jours.

L'objectif : que la personne lise et se dise "ok, c'est exactement l'ambiance que je sens venir".

Retourne UNIQUEMENT du JSON valide :
{
  "titre": "3-5 mots. Un titre de presse, pas un terme astro. Ça doit donner envie de lire la suite. Exemples : 'Le moment de tenir bon', 'Quelque chose lâche enfin', 'Une semaine sous tension utile'",
  "resume": "2-4 phrases. Qu'est-ce que cette personne va ressentir ou affronter cette semaine ? Quelle est la dynamique dominante ? Décris une situation ou une tension reconnaissable — pas un survol vague. Première phrase = la plus percutante.",
  "intensite": <entier de 1 à 10 — reflète la charge réelle de la semaine pour CETTE personne avec CE thème>,
  "domaines": ["2-4 domaines de vie concernés — ex. 'Relations', 'Travail', 'Finances', 'Confiance en soi', 'Communication', 'Vie intérieure', 'Famille'"],
  "conseil": "Une phrase courte, concrète, applicable. Quel est LE geste ou LA posture qui change la donne cette semaine pour cette personne ?"
}
PROMPT;
        }

        $this->openAiService->setLocale($locale);
        $result = $this->openAiService->callSimplePrompt($prompt, $instructions);

        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI error'];
        }

        $content = $this->extractJson($result['content']);
        if ($content === null) {
            return ['success' => false, 'error' => 'Invalid AI response'];
        }

        return ['success' => true, 'weeklyEnergy' => $content];
    }

    private function computeCurrentPeriod(User $user, string $locale): array
    {
        $transitsData = $this->getTransitsSummary($user);
        $natalSummary = $this->getNatalSummary($user);

        if ($locale === 'en') {
            $instructions = <<<'INST'
You are a sharp advisor who uses astrology as a lens — not a fortune teller. Translate planetary influences into what the person is actually living through right now: a theme, a challenge, a phase of life. No jargon, no planet names in the output, no "the cosmos". Be frank, human, specific.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Based on these influences, describe the current life phase this person is in — what's happening under the surface, what pattern is at play.

Respond ONLY with valid JSON:
{
  "titre": "3-5 words that name the phase or theme. Like a chapter title. Examples: 'The weight of choices', 'A slow reconstruction', 'Where loyalty is tested'",
  "contenu": [
    "First paragraph: What is this person going through right now? What's the underlying tension or dynamic? 2-3 sentences, concrete and personal — no planet names, no astro terms",
    "Second paragraph: What does this phase ask of them, and what becomes possible if they lean into it? 2-3 sentences"
  ],
  "tonalite": "positive" | "neutre" | "tendu"
}
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un astrologue praticien dans la lignée de Liz Greene et Howard Sasportas. Tu lis les transits lents comme des phases de vie — des processus psychologiques profonds qui se jouent sur des semaines ou des mois.

Ton rôle : nommer ce que cette personne traverse EN CE MOMENT. Pas la journée, pas la semaine — la toile de fond. Le truc qui est là quand elle se réveille à 3h du matin, la question qui revient en boucle, le schéma qui se rejoue.

Comment tu écris :
- Parle de la personne, pas des astres. Aucun nom de planète ni de signe dans le texte final. Tu décris un vécu, une phase, un mécanisme intérieur — pas une configuration céleste.
- Va en profondeur psychologique. Tu parles de patterns, de besoins inconscients, de tensions entre ce que la personne veut et ce qu'elle fait. Pas de surface.
- Le premier paragraphe nomme la tension. Qu'est-ce qui se passe ? Qu'est-ce qui frotte, qui pèse, qui pousse ? Sois franc et précis.
- Le deuxième paragraphe ouvre une direction. Pas une solution miracle. Ce que cette phase demande, et ce qui devient possible si la personne arrête de lutter contre. Un recadrage, pas un conseil bateau.
- Sois spécifique au thème natal. Le natal te dit pourquoi CETTE personne vit cette période de CETTE façon.
- Première phrase de chaque paragraphe = la plus forte.

Ce qui est interdit :
- Noms de planètes ou de signes dans le texte final
- Jargon : trigone, carré, aspect, transit, orbe, maison
- Vocabulaire New Age : "univers", "chemin de l'âme", "vibration", "transformation", "invitation à"
- Modaux mous : "peut-être", "pourrait", "il est possible"
- Psychologie de comptoir : "apprends à t'aimer", "tout arrive pour une raison"
- Formules fourre-tout : "une période de remise en question", "un moment charnière"
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

En te basant sur le thème natal ET les transits lents en cours, décris la phase de vie actuelle de cette personne. Ce qui se joue en profondeur — pas l'humeur du jour, pas le thème de la semaine, mais le processus de fond.

L'objectif : que la personne lise et ressente "c'est exactement ce que je traverse". Comme si quelqu'un mettait enfin des mots sur ce qu'elle n'arrive pas à formuler.

Retourne UNIQUEMENT du JSON valide :
{
  "titre": "3-5 mots qui nomment la phase. Comme un titre de chapitre de sa vie. Exemples : 'Le prix de la loyauté', 'Apprendre à lâcher le contrôle', 'Ce que le silence révèle'",
  "contenu": [
    "Premier paragraphe : Qu'est-ce que cette personne traverse en ce moment ? Quelle est la tension, le schéma, la question de fond ? 2-4 phrases, concrètes et psychologiquement précises. Première phrase = la plus forte. Pas de survol — rentre dans le vif.",
    "Deuxième paragraphe : Qu'est-ce que cette phase lui demande ? Qu'est-ce qui bouge si elle accepte ce qui se joue au lieu de résister ? 2-3 phrases. Un recadrage honnête, pas un encouragement vide."
  ],
  "tonalite": "positive" | "neutre" | "tendu"
}
PROMPT;
        }

        $this->openAiService->setLocale($locale);
        $result = $this->openAiService->callSimplePrompt($prompt, $instructions);

        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI error'];
        }

        $content = $this->extractJson($result['content']);
        if ($content === null) {
            return ['success' => false, 'error' => 'Invalid AI response'];
        }

        return ['success' => true, 'currentPeriod' => $content];
    }

    private function getTransitsSummary(User $user): string
    {
        try {
            $transits = $this->astrologyAnalysisService->getTransitsForSpecificMonth($user, 0);
            if (empty($transits['aspects'])) {
                return 'No major transits this month';
            }
            $parts = array_map(fn($a) => sprintf('%s %s natal %s (orb %.1f°)', $a['transit'], $a['type'], $a['natal'], $a['orb']), $transits['aspects']);
            return implode(', ', $parts);
        } catch (\Throwable) {
            return 'Transit data unavailable';
        }
    }

    private function getNatalSummary(User $user): string
    {
        try {
            $chart = $this->natalChartRepository->findByUser($user);
            if (!$chart) {
                return 'Natal chart unavailable';
            }
            $positions = $chart->getPlanetaryPositions();
            $key = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant'];
            $parts = [];
            foreach ($key as $planet) {
                if (isset($positions[$planet])) {
                    $parts[] = sprintf('%s in %s', $planet, $positions[$planet]['Sign'] ?? '?');
                }
            }
            return implode(', ', $parts) ?: 'Natal chart unavailable';
        } catch (\Throwable) {
            return 'Natal chart unavailable';
        }
    }

    private function extractJson(string $text): ?array
    {
        // Strip markdown code block if present
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/```\s*$/m', '', $text);
        $text = trim($text);

        // Find first { ... }
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false) {
            return null;
        }
        $jsonStr = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($jsonStr, true);
        return is_array($decoded) ? $decoded : null;
    }
}
