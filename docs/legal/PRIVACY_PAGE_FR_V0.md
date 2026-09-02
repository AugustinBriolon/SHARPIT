# Politique de confidentialité — Sharpit (brouillon V0)

> **Statut :** brouillon FR pour la page `/privacy` (Privacy mini V0).  
> **Langue :** français uniquement.  
> **Responsable :** Augustin Briolon (personne physique) — contact : `augustin.briolon@gmail.com`.  
> **Décisions verrouillées :** 2026-09-02 — voir [`PRIVACY_MINI_V0.md`](./PRIVACY_MINI_V0.md).  
> **Ne pas écrire** que le produit est « sur invitation uniquement ». Beta / cercle restreint = diffusion bouche-à-oreille (GTM), inscription classique possible.

---

## Politique de confidentialité de Sharpit

**Dernière mise à jour :** 2 septembre 2026

### 1. Qui est responsable du traitement ?

Le responsable du traitement des données personnelles collectées via Sharpit est :

**Augustin Briolon** (personne physique)  
Contact confidentialité : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)

### 2. Qu’est-ce que Sharpit ?

Sharpit est un outil d’aide à l’entraînement (wellness / coaching). En phase **bêta**, l’accès est destiné à un **cercle restreint** d’athlètes (diffusion principalement par bouche-à-oreille). L’inscription reste un parcours classique (création de compte) — Sharpit n’est pas un service « sur invitation uniquement ».

Sharpit n’est **pas** un dispositif médical et ne remplace pas un avis médical.

### 3. Quelles données traitons-nous ?

Selon votre usage et les connecteurs que vous activez, Sharpit peut traiter :

| Catégorie | Exemples |
| --- | --- |
| Compte | Identifiants et données de compte gérés via **Clerk** (ex. e-mail, identifiant technique) |
| Données physiologiques synchronisées | Données provenant de services que vous connectez (ex. **Garmin**, **Renpho**, **MyFitnessPal**) : activité, récupération / santé connectée, composition corporelle, nutrition, selon les classes activées |
| Inférences | Estimations d’entraînement dérivées de vos données (ex. récupération, fatigue, risques) — **estimations**, pas un diagnostic |
| Données techniques | Journaux techniques limités (fonctionnement, sécurité, diagnostic) — sans mots de passe ni jetons en clair, et sans métriques corporelles dans les logs applicatifs |

Certaines de ces données (physiologiques et inférences associées) sont traitées comme des **données de santé** au sens de l’**article 9 du RGPD**.

### 4. Finalités

Les données sont traitées uniquement pour :

- fournir le coaching et l’aide à l’entraînement Sharpit ;
- synchroniser et interpréter les observations que vous choisissez de connecter ;
- faire fonctionner, sécuriser et améliorer le service dans ce cadre ;
- répondre à vos demandes (export, suppression, questions confidentialité).

Pas d’usage commercial de revente de vos données. Pas d’entraînement de modèles d’IA généralistes sur vos données dans le cadre de cette V0.

### 5. Bases légales

| Traitement | Base |
| --- | --- |
| Compte, fonctionnement du service, sécurité | Exécution du contrat / mesures précontractuelles ; intérêt légitime pour la sécurité technique, le cas échéant |
| Acceptation des CGU et de la présente politique | Consentement / acceptation contractuelle lors de l’inscription |
| Synchronisation et traitement des données de santé (art. 9) et inférences associées | **Consentement explicite** (`health_data_consent`) |
| Envoi de contexte athlète à un modèle d’IA (briefing LLM, Coach IA, etc.) | **Consentement distinct** (`ai_processing_consent`) — **porte dure** : sans ce consentement, ces chemins IA sont bloqués. Les moteurs déterministes peuvent continuer à fonctionner |
| Intégrations non officielles | Accusé de réception explicite du caractère non officiel / « as-is » avant connexion |

Vous pouvez retirer un consentement à tout moment (cela peut limiter ou interrompre la fonctionnalité concernée). Contact : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com).

### 6. Intégrations non officielles

Certaines connexions à des services tiers peuvent être **non officielles** (non fournies ou non approuvées par l’éditeur du service). Elles sont proposées « en l’état », peuvent cesser de fonctionner, et impliquent un transfert de données vers / depuis ce tiers selon ses propres conditions. Un accusé de réception est requis avant connexion.

### 7. Intelligence artificielle (porte dure)

Lorsque vous consentez au traitement IA :

- Sharpit peut envoyer le **contexte nécessaire** (état, historique d’entraînement pertinent, etc.) à un prestataire de modèles d’IA pour générer des briefings ou réponses de coaching ;
- ce consentement est **séparé** du consentement données de santé ;
- **sans** `ai_processing_consent`, aucun envoi de ce type n’a lieu ;
- Sharpit n’utilise pas vos données pour **entraîner un modèle généraliste** dans le cadre de cette V0.

### 8. Destinataires et sous-traitants

Selon la configuration du service, des prestataires techniques peuvent traiter des données pour notre compte, notamment :

- **Clerk** — authentification et compte ;
- **Vercel** — hébergement / exécution de l’application ;
- **base de données** (PostgreSQL hébergé) — persistance ;
- **Upstash** — limitation de débit / cache opérationnel le cas échéant ;
- **prestataire d’IA** — uniquement si vous avez consenti au traitement IA.

Les services que **vous** connectez (Garmin, Renpho, MyFitnessPal, etc.) reçoivent ou exposent des données selon **leurs** politiques et le périmètre que vous autorisez.

### 9. Durée de conservation

- Compte actif : conservation aussi longtemps que le compte est nécessaire au service.
- **Suppression :** à votre demande, le compte est d’abord **soft-delete** (désactivé), puis les données sont **purgées au plus tard à J+30**.
- Journaux techniques : conservation limitée au besoin d’exploitation et de sécurité.

### 10. Vos droits

Conformément au RGPD, vous disposez notamment des droits d’accès, de rectification, d’effacement, de limitation, d’opposition, de portabilité, et du droit de retirer votre consentement.

- Exercice des droits / questions : [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)
- Export : export JSON des données personnelles vous concernant détenues par Sharpit (parcours produit prévu).
- Réclamation : vous pouvez saisir la **CNIL** ([www.cnil.fr](https://www.cnil.fr)).

### 11. Avertissement santé (wellness)

Sharpit est un outil d’aide à l’entraînement. Ce n’est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d’entraînement, pas un diagnostic.

### 12. Modifications

Cette politique peut évoluer. En cas de changement matériel, la version acceptée (`privacy_version`) pourra être mise à jour et une nouvelle acceptation demandée.

### 13. Contact

**Augustin Briolon** — [augustin.briolon@gmail.com](mailto:augustin.briolon@gmail.com)
