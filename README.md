# Mes Loyers — factures et reçus de location

Application web pour propriétaires : créez les **factures** et **reçus de loyer** de vos locataires
en quelques secondes et **envoyez-les directement sur WhatsApp** (PDF + message prêt à l'emploi).

## Fonctionnalités

- **Locataires** : nom, numéro WhatsApp, logement, loyer, charges fixes détaillées (eau, gardiennage…) et électricité au compteur.
- **Électricité au kWh** : le prix du kWh se règle dans les paramètres (ex. 1 kWh = 300 FCFA). Sur la facture, saisissez
  l'ancien et le nouvel index (ou directement les kWh) : la consommation et le montant sont calculés automatiquement.
  L'ancien index est repris de la facture précédente du locataire.
- **Charges détaillées** : chaque charge apparaît sur sa propre ligne avec son prix ; une liste de charges habituelles
  (Paramètres) permet de les ajouter en un clic.
- **Signature** : dessinez-la au doigt ou à la souris, ou importez une photo (le fond blanc est retiré) ; elle est
  ajoutée automatiquement sur tous les documents.
- **Historique** : récapitulatif par locataire et par année (facturé, payé, reste à payer, kWh), grille mois par mois,
  relevés d'électricité, et récapitulatif PDF à télécharger ou envoyer sur WhatsApp.
- **Factures et reçus** numérotés automatiquement (`FAC-2026-001`, `REC-2026-001`), avec aperçu en direct.
  - Montant écrit en toutes lettres (« soixante-quinze mille francs CFA »), mention « Dont quittance » sur les reçus.
  - Modes de paiement : espèces, T-Money, Flooz, virement, chèque.
  - Une facture payée se transforme en reçu en un clic.
- **Envoi WhatsApp**
  - Sur téléphone : le PDF est partagé directement via le menu de partage (choisissez WhatsApp, puis le locataire).
  - Sur ordinateur : le PDF est téléchargé et WhatsApp s'ouvre sur la discussion du locataire avec le message rédigé ; il suffit de joindre le PDF.
- **Tableau de bord** : encaissé du mois, factures impayées, qui a payé ce mois-ci.
- **Sauvegarde / restauration** des données en fichier JSON (Paramètres).

Les numéros sans indicatif sont considérés comme togolais (+228) ; l'indicatif par défaut se change dans les paramètres.

## Données

Aucune inscription, aucun serveur de base de données : tout est enregistré dans le navigateur (`localStorage`)
de l'appareil utilisé. Pensez à faire des sauvegardes depuis la page Paramètres.

## Lancer en local

Prérequis : Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:4317
```

Production :

```bash
npm run build
npm start          # http://localhost:4317
```

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, jsPDF.
