/**
 * Legal Texts Constants
 * GDPR compliant legal content for AstroMatch
 */

const TODAY_DATE = '16 mars 2026';

export const privacyPolicyText = {
    title: 'Politique de Confidentialité',
    lastUpdate: `Dernière mise à jour : ${TODAY_DATE}`,
    sections: [
        {
            title: 'Introduction',
            content: `AstroMatch respecte la vie privée de ses utilisateurs et s'engage à protéger les données personnelles collectées via l'application.`,
        },
        {
            title: '1. Données collectées',
            content: `Nous pouvons collecter les informations suivantes :

• Adresse email
• Date de naissance
• Heure de naissance
• Lieu de naissance
• Préférences utilisateur
• Données d'utilisation de l'application

Ces informations sont nécessaires pour générer les analyses astrologiques et améliorer l'expérience utilisateur.`,
        },
        {
            title: '2. Utilisation des données',
            content: `Les données collectées sont utilisées pour :

• Générer les analyses astrologiques
• Améliorer les fonctionnalités de l'application
• Personnaliser l'expérience utilisateur
• Assurer la sécurité de l'application`,
        },
        {
            title: '3. Intelligence Artificielle',
            content: `Certaines analyses fournies dans l'application sont générées à l'aide de systèmes d'intelligence artificielle.

Les données nécessaires à ces analyses peuvent être traitées par des prestataires techniques.`,
        },
        {
            title: '4. Partage des données',
            content: `Les données personnelles ne sont jamais vendues.

Certaines données peuvent être traitées par des prestataires techniques nécessaires au fonctionnement de l'application (hébergement, analytics, services IA).`,
        },
        {
            title: '5. Conservation des données',
            content: `Les données sont conservées uniquement pendant la durée nécessaire à la fourniture du service.`,
        },
        {
            title: '6. Droits des utilisateurs',
            content: `Conformément au RGPD, les utilisateurs disposent des droits suivants :

• Droit d'accès
• Droit de rectification
• Droit de suppression
• Droit à la limitation du traitement

Les utilisateurs peuvent supprimer leur compte directement depuis l'application.`,
        },
        {
            title: '7. Contact',
            content: `Pour toute question relative à la confidentialité :

contact@astromatch.app`,
        },
    ],
};

export const termsOfServiceText = {
    title: "Conditions Générales d'Utilisation",
    lastUpdate: `Dernière mise à jour : ${TODAY_DATE}`,
    sections: [
        {
            title: '1. Objet',
            content: `AstroMatch fournit des analyses de compatibilité astrologique entre utilisateurs.`,
        },
        {
            title: '2. Nature du service',
            content: `Les analyses astrologiques fournies par l'application sont destinées uniquement à des fins de divertissement.

Elles ne constituent pas des conseils médicaux, psychologiques, financiers ou professionnels.`,
        },
        {
            title: '3. Création de compte',
            content: `Les utilisateurs sont responsables de l'exactitude des informations fournies.`,
        },
        {
            title: "4. Utilisation de l'application",
            content: `Les utilisateurs doivent utiliser l'application conformément aux lois applicables.`,
        },
        {
            title: '5. Limitation de responsabilité',
            content: `L'éditeur ne peut être tenu responsable des décisions prises sur la base des analyses générées par l'application.`,
        },
        {
            title: '6. Propriété intellectuelle',
            content: `Tous les contenus de l'application sont protégés par les lois sur la propriété intellectuelle.`,
        },
        {
            title: '7. Résiliation de compte',
            content: `Les utilisateurs peuvent supprimer leur compte à tout moment.`,
        },
        {
            title: '8. Modification des conditions',
            content: `L'éditeur se réserve le droit de modifier ces conditions à tout moment.`,
        },
    ],
};

export const legalNoticeText = {
    title: 'Mentions Légales',
    lastUpdate: `Dernière mise à jour : ${TODAY_DATE}`,
    sections: [
        {
            title: 'Éditeur',
            content: `L'application AstroMatch est éditée par :

Clément Silvestre

Email : contact@astromatch.app`,
        },
        {
            title: 'Directeur de la publication',
            content: `Clément Silvestre`,
        },
        {
            title: 'Hébergement',
            content: `Les données de l'application sont hébergées par des prestataires cloud techniques nécessaires à son fonctionnement.`,
        },
        {
            title: 'Propriété intellectuelle',
            content: `Tous les éléments de l'application (code, interface, contenu) sont protégés par le droit de la propriété intellectuelle.`,
        },
    ],
};

export const aiDisclaimerText = `Les analyses astrologiques fournies par cette application sont destinées uniquement à des fins de divertissement.`;

export const consentText = {
    prefix: "J'accepte les ",
    termsLink: "Conditions d'utilisation",
    separator: ' et la ',
    privacyLink: 'Politique de confidentialité',
};

export const deleteAccountText = {
    title: 'Supprimer le compte',
    warning: 'La suppression de votre compte entraînera la suppression définitive de toutes vos données. Cette action est irréversible.',
    confirm: 'Confirmer la suppression',
    cancel: 'Annuler',
};
