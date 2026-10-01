## Politique de confidentialité de Sharpit

**Dernière mise à jour :** 1er octobre 2026

### 1. Qui est responsable du traitement ?

Le responsable du traitement des données personnelles collectées via Sharpit est :

**Augustin Briolon** (personne physique, éditeur de Sharpit)  
Adresse postale : communiquée sur simple demande à l’adresse ci-dessous  
Contact confidentialité : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)

### 2. Qu’est-ce que Sharpit ?

Sharpit est un outil d’aide à l’entraînement (wellness / coaching), disponible sur le web et en application iPhone. En phase **bêta**, l’accès est destiné à un **cercle restreint** d’athlètes (diffusion principalement par bouche-à-oreille). L’inscription reste un parcours classique (création de compte) — Sharpit n’est pas un service « sur invitation uniquement ».

Sharpit n’est **pas** un dispositif médical et ne remplace pas un avis médical.

### 3. Quelles données traitons-nous ?

Selon votre usage et les connecteurs que vous activez, Sharpit peut traiter :

| Catégorie                      | Exemples                                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compte                         | Identifiants et données de compte gérés via **Clerk** (e-mail, prénom et nom, identifiant technique)                                                                                                                   |
| Profil sportif                 | Taille, date de naissance, sexe, seuils (FTP, FC max, allures), sports pratiqués, matériel, objectifs                                                                                                                  |
| Apple Santé (iPhone)           | Uniquement si vous l’activez : séances et tracés GPS, sommeil, fréquence cardiaque, VFC, FC de repos, pas, poids. Lues sur l’iPhone et envoyées à Sharpit ; **jamais** utilisées à des fins publicitaires ni revendues |
| Données des services connectés | Selon les services que vous connectez (**Garmin**, **Withings**, **MyFitnessPal**, **Google Agenda**) : activité, récupération, composition corporelle, nutrition, créneaux d’agenda, selon les classes activées       |
| Saisies de l’athlète           | Ressenti et effort perçu des séances et des bricks, journal du jour (y compris réponses de santé : médicaments, cycle, alcool), notes physiques, messages au coach                                                     |
| Position (iPhone)              | Uniquement si vous l’autorisez, à la précision d’environ 1 km, pour afficher la météo Apple du lieu. Elle n’est pas envoyée à Sharpit : l’iPhone l’adresse à Apple Météo                                               |
| Micro et dictée (iPhone)       | Uniquement quand vous dictez une question au coach. La transcription se fait sur l’iPhone lorsque c’est possible, sinon par la reconnaissance vocale d’Apple ; seul le texte est envoyé à Sharpit                      |
| Abonnement                     | Achats intégrés gérés par **Apple** : Sharpit reçoit l’état de l’abonnement et un identifiant de transaction, jamais vos coordonnées bancaires                                                                         |
| Notifications                  | Jeton d’appareil Apple (APNs) et vos préférences de notification                                                                                                                                                       |
| Inférences                     | Estimations d’entraînement dérivées de vos données (ex. récupération, fatigue, risques) — **estimations**, pas un diagnostic                                                                                           |
| Données techniques             | Journaux techniques limités et rapports de plantage (fonctionnement, sécurité, diagnostic) — sans mots de passe ni jetons en clair, et sans métriques corporelles dans les journaux applicatifs                        |

Certaines de ces données (physiologiques et inférences associées) sont traitées comme des **données de santé** au sens de l’**article 9 du RGPD**.

### 4. Finalités

Les données sont traitées uniquement pour :

- fournir le coaching et l’aide à l’entraînement Sharpit ;
- synchroniser et interpréter les observations que vous choisissez de connecter ;
- faire fonctionner, sécuriser et améliorer le service dans ce cadre ;
- répondre à vos demandes (export, suppression, questions confidentialité).

Pas d’usage commercial de revente de vos données. Pas de publicité, pas de pistage entre applications ou sites. Pas d’entraînement de modèles d’IA généralistes sur vos données dans le cadre de cette V0.

Les données lues dans **Apple Santé** ne servent qu’à ces finalités : elles ne sont ni partagées avec des tiers à des fins publicitaires ou commerciales, ni stockées dans iCloud.

### 5. Bases légales

| Traitement                                                                          | Base                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compte, fonctionnement du service, sécurité                                         | Exécution du contrat / mesures précontractuelles ; intérêt légitime pour la sécurité technique, le cas échéant                                                                  |
| Acceptation des CGU et de la présente politique                                     | Consentement / acceptation contractuelle lors de l’inscription                                                                                                                  |
| Synchronisation et traitement des données de santé (art. 9) et inférences associées | **Consentement explicite** — requis avant toute synchronisation ou traitement de ces données                                                                                    |
| Envoi de contexte athlète à un modèle d’IA (briefing, Coach IA, etc.)               | **Consentement distinct** pour le traitement IA — **porte dure** : sans ce consentement, ces chemins IA sont bloqués. Les moteurs déterministes peuvent continuer à fonctionner |
| Intégrations non officielles                                                        | Accusé de réception explicite du caractère non officiel / « en l’état » avant connexion                                                                                         |

Vous pouvez retirer un consentement à tout moment (cela peut limiter ou interrompre la fonctionnalité concernée). Contact : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com).

### 6. Intégrations non officielles

Certaines connexions à des services tiers sont **non officielles** (non fournies ni approuvées par l’éditeur du service) : à ce jour **Garmin Connect** et **MyFitnessPal**. Elles sont proposées « en l’état », peuvent cesser de fonctionner, et impliquent un transfert de données vers / depuis ce tiers selon ses propres conditions. Vos identifiants de connexion à ces services sont chiffrés. Un accusé de réception est requis avant connexion.

### 7. Intelligence artificielle (porte dure)

Lorsque vous consentez au traitement IA :

- Sharpit peut envoyer le **contexte nécessaire** (état, historique d’entraînement pertinent, etc.) à un prestataire de modèles d’IA, via la passerelle IA de **Vercel**, pour générer des briefings, analyses ou réponses de coaching ;
- les échanges avec le modèle sont journalisés chez **Langfuse** (hébergement UE) pour le diagnostic et la qualité, et effacés avec votre compte ;
- ce consentement est **séparé** du consentement données de santé ;
- **sans** ce consentement IA, aucun envoi de ce type n’a lieu ;
- Sharpit n’utilise pas vos données pour **entraîner un modèle généraliste** dans le cadre de cette V0.

### 8. Destinataires et sous-traitants

Selon la configuration du service, des prestataires techniques peuvent traiter des données pour notre compte, notamment :

- **Clerk** — authentification et compte ;
- **Vercel** — hébergement / exécution de l’application, passerelle IA ;
- **Neon** — base de données PostgreSQL hébergée ;
- **Upstash** — limitation de débit / cache opérationnel ;
- **Sentry** (hébergement UE) — rapports de plantage et d’erreurs, sans métriques corporelles ;
- **Apple** — notifications (APNs), achats intégrés, météo (WeatherKit), Apple Santé sur votre iPhone ;
- **prestataire d’IA** et **Langfuse** — uniquement si vous avez consenti au traitement IA.

Les services que **vous** connectez (Garmin, Withings, MyFitnessPal, Google Agenda) reçoivent ou exposent des données selon **leurs** politiques et le périmètre que vous autorisez.

Certains prestataires peuvent traiter des données hors de l’Union européenne ; ces transferts sont encadrés par les garanties prévues par le RGPD (clauses contractuelles types ou décision d’adéquation).

### 9. Durée de conservation

- Compte actif : conservation aussi longtemps que le compte est nécessaire au service.
- **Suppression :** à votre demande, le compte, l’identifiant de connexion et les données associées sont **supprimés immédiatement et définitivement**.
- Journaux techniques et rapports de plantage : conservation limitée au besoin d’exploitation et de sécurité.
- Sur l’iPhone, un cache local (dernières données lues) reste sur l’appareil ; il est effacé à la déconnexion d’un autre compte et à la suppression du compte. Il n’est pas copié dans iCloud.

### 10. Vos droits

Conformément au RGPD, vous disposez notamment des droits d’accès, de rectification, d’effacement, de limitation, d’opposition, de portabilité, et du droit de retirer votre consentement.

- Exercice des droits / questions : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)
- Export : export JSON des données personnelles vous concernant détenues par Sharpit, depuis Réglages → Confidentialité sur le web.
- Suppression : depuis Réglages → Confidentialité, sur le web comme sur l’iPhone.
- Réclamation : vous pouvez saisir la **CNIL** ([www.cnil.fr](https://www.cnil.fr)).

### 11. Avertissement santé (wellness)

Sharpit est un outil d’aide à l’entraînement. Ce n’est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d’entraînement, pas un diagnostic.

### 12. Modifications

Cette politique peut évoluer. En cas de changement matériel, la version acceptée de cette politique pourra être mise à jour et une nouvelle acceptation demandée.

### 13. Contact

**Augustin Briolon** — [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)
