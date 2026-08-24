# 🌿 NatureQuest

Application web de découverte de la nature avec :

- 🗺️ carte interactive
- 📍 points GPS
- 📷 scan QR
- ❓ questions
- 🏆 système de points
- 👤 comptes joueurs
- 🔐 administration
- 🔲 génération de QR codes
- 🔓 déblocage de quêtes
- ☁️ Supabase
- 🚀 GitHub Pages

---

## Installation

### 1. Créer Supabase

Créer un projet Supabase.

Puis ouvrir :

SQL Editor

et exécuter :

database.sql

---

### 2. Récupérer les informations Supabase

Dans Supabase :

Project Settings → API

Récupérer :

Project URL

et

Publishable Key

Puis modifier :

config.js

---

### 3. Créer un compte

Ouvrir :

index.html

Créer un compte.

---

### 4. Donner les droits administrateur

Dans Supabase SQL Editor :

update profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
and u.email = 'TON_EMAIL';

Remplacer TON_EMAIL.

---

### 5. Administrateur

Ouvrir :

admin.html

Tu peux ensuite :

- créer une quête
- mettre une question
- choisir le nombre de points
- mettre un QR code
- placer le point GPS
- publier la quête
- générer le QR code

---

## Exemple

QR :

PARC-001

Question :

Imagine ton parc de rêve.

Réponse :

Libre.

Points :

10

GPS :

position du panneau dans le parc.

---

## Fonctionnement

Un joueur arrive devant un panneau.

Il ouvre NatureQuest.

Il appuie sur :

Scanner un QR code

Il scanne :

PARC-001

NatureQuest affiche :

Imagine ton parc de rêve.

Le joueur répond.

La quête est validée.

Il gagne des points.

Une nouvelle quête peut ensuite être débloquée.

---

## Sécurité

Ne jamais mettre une clé :

service_role

ou

secret

dans config.js.

La clé utilisée dans l'application doit être la clé publique/publishable.

---

## HTTPS

La caméra QR et la géolocalisation nécessitent généralement HTTPS.

GitHub Pages fournit HTTPS.