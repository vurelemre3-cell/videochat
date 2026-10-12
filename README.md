# VideoMeet

Een eenvoudige website om via browser video te bellen in kamers tot maximaal 8 deelnemers.

## Lokaal starten
1. Installeer Node.js.
2. Voer `npm install` uit.
3. Voer `npm start` uit.
4. Open http://localhost:3000.

## Deployen op Render
Koppel deze GitHub-repository aan Render als een Node Web Service.
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

Gebruik HTTPS (Render levert dit automatisch) en geef de browser toestemming voor camera en microfoon.

## Belangrijk
De app gebruikt WebRTC met publieke STUN-servers. Sommige netwerken hebben een TURN-server nodig voor betrouwbare verbindingen. Gebruik de site niet voor gevoelige gesprekken zonder aanvullende beveiligings- en privacymaatregelen.