<?php

namespace App\Enum;

/**
 * Conversation subject chosen by the user when opening a new Lyra chat.
 *
 * The topic focuses the astrological context (transit/natal selection) and the
 * system prompt, replacing the unreliable free-text classifierDomaine() for every
 * topic except LIBRE. It is the single source of truth (PHP, no LLM) for the static
 * welcome message and the suggestion chips returned to the frontend.
 */
enum TopicLyra: string
{
    case AMOUR       = 'amour';
    case ARGENT      = 'argent';
    case TRAVAIL     = 'travail';
    case ASTROLOGIE  = 'astrologie';
    case PSYCHOLOGIE = 'psychologie';
    case LIBRE       = 'libre';

    /** Short human label injected into the system prompt and shown in the header badge. */
    public function label(): string
    {
        return match ($this) {
            self::AMOUR       => 'Amour',
            self::ARGENT      => 'Argent',
            self::TRAVAIL     => 'Travail',
            self::ASTROLOGIE  => 'Astrologie',
            self::PSYCHOLOGIE => 'Psychologie',
            self::LIBRE       => 'Libre',
        };
    }

    /** Static welcome message (no LLM call) shown right after the topic is chosen. */
    public function welcomeMessage(): string
    {
        return match ($this) {
            self::AMOUR => "Parlons de ce qui se passe dans ta vie amoureuse. Qu'est-ce qui t'occupe en ce moment, une relation, quelqu'un de nouveau, ou quelque chose que tu cherches à comprendre ?",
            self::ARGENT => "On regarde ensemble ce qui se joue autour de l'argent et des ressources. Qu'est-ce qui se passe, une décision à prendre, une période tendue, ou simplement envie de comprendre ce que le ciel dit là-dessus ?",
            self::TRAVAIL => "On parle travail. Qu'est-ce qui se joue pour toi en ce moment, une évolution, une difficulté, ou un choix à faire ?",
            self::ASTROLOGIE => "Je suis là pour t'expliquer ce que tu vois dans ton thème ou ce que tu veux comprendre. Pose ta question, je t'explique le mécanisme.",
            self::PSYCHOLOGIE => "On plonge dans ce que les planètes disent sur toi, ton caractère, tes patterns, ce qui se transforme. Par où tu veux commencer ?",
            self::LIBRE => "Je t'écoute. De quoi tu veux parler ?",
        };
    }

    /**
     * Three short suggestion chips (static, PHP) returned with the welcome message.
     *
     * @return string[]
     */
    public function suggestions(): array
    {
        return match ($this) {
            self::AMOUR => [
                "Comment se passe ma vie amoureuse en ce moment ?",
                "Est-ce une bonne période pour rencontrer quelqu'un ?",
                "Qu'est-ce que mon thème dit sur mes relations ?",
            ],
            self::ARGENT => [
                "C'est quoi la tendance pour mes finances en ce moment ?",
                "Est-ce une bonne période pour investir ou dépenser ?",
                "Qu'est-ce qui bloque ma relation à l'argent ?",
            ],
            self::TRAVAIL => [
                "Comment se passe ma période professionnelle ?",
                "Est-ce le bon moment pour changer de travail ?",
                "Qu'est-ce que le ciel dit sur ma carrière ?",
            ],
            self::ASTROLOGIE => [
                "Explique-moi mes transits du moment",
                "C'est quoi mon signe ascendant et ce que ça veut dire ?",
                "Comment lire une maison astrologique ?",
            ],
            self::PSYCHOLOGIE => [
                "Qu'est-ce que mon thème dit sur mon caractère ?",
                "Quels sont mes patterns émotionnels selon les astres ?",
                "Qu'est-ce qui se transforme en moi en ce moment ?",
            ],
            self::LIBRE => [
                "Quel est le grand thème de cette période pour moi ?",
                "Par où commencer pour comprendre mon thème ?",
                "Qu'est-ce que les planètes me disent en ce moment ?",
            ],
        };
    }
}
