# Registre des traitements — données dérivées (Lunestia)

> Note technique destinée à alimenter le registre des traitements RGPD officiel.
> La rédaction juridique (base légale formelle, DPO, durées exactes) reste à valider
> côté produit/juridique. Ce fichier documente seulement ce que le code produit et stocke.

## Profil psychologique persistant (`user_psy_profile`)

- **Nature** : digest psychologique compact (patterns de fond, besoins, réflexe sous
  stress, sensibilités, axes de vie), **dérivé** de l'analyse du thème natal.
- **Catégorie** : donnée sensible dérivée (profilage psychologique). À traiter avec le
  même soin que les données de naissance.
- **Finalité** : personnaliser les réponses du chat (Lyra) et l'horoscope quotidien
  (« c'est exactement moi »).
- **Source** : extraite une seule fois des sections d'analyse natale déjà générées
  (`natal_chart_section`), via un appel LLM dédié. Voir `PsyProfileService::extract()`.
- **Stockage** : table `user_psy_profile` (`user_id`, `version`, `genere_le`, `data` JSON).
- **Durée de conservation** : tant que le compte existe. Non régénéré sauf correction des
  données de naissance ou bump de `PsyProfileService::VERSION`.
- **Base légale** : exécution du service / consentement à la création du compte.
- **Sous-traitant** : OpenAI (appel d'extraction `gpt-4.1`, et appels conversationnels
  `gpt-4.1-mini` où le digest est injecté comme contexte).
- **Effacement** : automatique à la suppression du compte via `ON DELETE CASCADE` sur la
  clé étrangère `user_id` (cf. `Version20260603000001`, et `ProfileController::deleteAccount`).
- **Minimisation à l'injection** : seul le noyau + un axe pertinent sont injectés dans les
  prompts (`PsyProfileService::profilPourContexte()`), jamais le profil complet recité.

## Rappel — autres données dérivées déjà couvertes par le même cascade
- `natal_chart_section` : contenu d'analyse natale généré par IA.
- `daily_horoscope`, `synastry_history`, `chat_session`, `lyra_conversation_log`.
