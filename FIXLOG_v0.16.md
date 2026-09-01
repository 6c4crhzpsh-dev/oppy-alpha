# OPPY Alpha v0.16 – Recovery-Link-Härtung

Datum: 01.09.2026

## Ursache
Die Supabase-Auth-Logs zeigten einen erfolgreichen Recovery-Request (HTTP 200), direkt danach eine erfolgreiche Verifikation/Login und wenige Sekunden später `One-time token not found`. Das Muster passt zu einem vorab aufgerufenen Single-Use-Link (z. B. Mail-Link-Scanner/Preview), bevor die Nutzerin ihn selbst öffnet.

## Fix
- Neuer Zwischen-Endpunkt `/recover.html`.
- Der Token wird beim Laden **nicht** automatisch eingelöst.
- Erst ein bewusster Klick auf **Weiter** ruft `verifyOtp({ token_hash, type: "recovery" })` auf.
- Danach wird das neue Passwort via `updateUser({ password })` gesetzt.
- `detectSessionInUrl:false` auf der Recovery-Seite verhindert automatische Token-Verarbeitung.
- Die normale App fordert Reset-Mails mit Redirect auf `/recover.html` an.

## Erforderliche Supabase Recovery-E-Mail-Vorlage
Die Recovery-Mail muss auf die scanner-sichere Zwischen-Seite zeigen:

```html
<h2>Passwort zurücksetzen</h2>
<p>Tippe auf den folgenden Button, um dein OPPY-Passwort zurückzusetzen:</p>
<p><a href="{{ .SiteURL }}/recover.html?token_hash={{ .TokenHash }}&type=recovery">Passwort zurücksetzen</a></p>
<p>Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
```

Wichtig: Nicht `{{ .ConfirmationURL }}` verwenden, weil dieser Link den Single-Use-Token direkt bei Aufruf verbraucht.

## Sicherheit
Keine Secret-/Service-Role-Keys im Frontend. Verwendet wird nur der Supabase Publishable Key mit RLS.
