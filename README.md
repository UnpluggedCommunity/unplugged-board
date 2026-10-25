# Unplugged Board

La bacheca di Unplugged: **Jobs**, **Rooms** (e presto **Marketplace**) per la community di Perth.
Mobile-first, in inglese per gli utenti, gratis da far girare.

- **Visitor** (non loggato): vede gli annunci e i filtri, ma non i contatti.
- **Member**: login con Google + Community Access Code → vede contatti e link originali.
- **Staff**: carica, modifica, archivia, rinnova gli annunci; gestisce le richieste di rimozione.
- **Admin**: come lo staff, più cambiare il codice di accesso e aggiungere/togliere staff.

---

## Guida per lo staff

### Caricare un annuncio (oggi: con "Paste JSON")

1. Apri il sito dal telefono → **Staff** (in alto a destra) → **+ New job** oppure **+ New room**.
2. Fai gli screenshot del post Facebook (anche 2–3 se è lungo).
3. Apri il **Claude Project "Unplugged Board"** (vedi sotto), incolla gli screenshot e invia.
   Claude risponde con un blocco JSON: copialo tutto.
4. Torna sul sito, incolla nel riquadro **Paste JSON** → **Fill the form**.
5. Controlla i campi evidenziati in arancione (quelli incerti) e gli eventuali ⚠️ avvisi.
6. Premi **Publish**. Fatto: vieni portato alla scheda pubblicata.

> Nella Fase 1b arriva il pulsante per caricare gli screenshot direttamente sul sito (AI Gemini).
> Il "Paste JSON" resta come piano B.

**Creare il Claude Project (una volta sola):** su claude.ai → Projects → Create project
"Unplugged Board" → nelle *Project instructions* incolla tutto il contenuto di
[`extraction-prompt.md`](extraction-prompt.md) (dalla riga `You extract job and room listings…` in giù).
Sostituisci `{{TODAY}}` con "the date of today" oppure scrivi la data nel messaggio quando carichi gli
screenshot.

**Privacy:** prima di caricare, se possibile ritaglia via foto profilo e nomi che non servono.
Gli screenshot non vengono mai salvati sul sito.

### Pubblicare su WhatsApp

Su ogni scheda (e nella lista Staff) c'è **Copy for WhatsApp**: copia un messaggio già pronto
(titolo, paga/prezzo, data, requisiti + un solo link). Incollalo nel sottogruppo giusto:

| Sottogruppo | Cosa |
|---|---|
| Jobs Board | Jobs, tutte le categorie tranne Farm & Regional |
| Farm Jobs | Jobs Farm & Regional o "417 likely eligible" |
| Rooms | Rooms |

**Share** apre direttamente la condivisione del telefono (WhatsApp compreso).

### Moderare

Nella pagina **Staff**:

- **Live / Expired / Drafts / Archived**: le liste degli annunci.
- **Renew**: l'annuncio torna valido per altri 10 (jobs) o 14 (rooms) giorni da oggi.
- **Archive**: lo toglie dalla bacheca senza cancellarlo.
- **Delete**: lo cancella per sempre.
- **Edit**: modifica qualsiasi campo.
- **Removal requests**: in alto compaiono le richieste di rimozione (anche da non membri).
  Controlla, archivia/cancella l'annuncio se serve e premi **Done**.

**Scadenze automatiche** (contate dalla **data del post Facebook**; se manca, dalla pubblicazione):
Jobs 10 giorni · Rooms 14 giorni · Marketplace 30 giorni. Gli annunci scaduti spariscono da soli
dalla bacheca. Se metti una data troppo vecchia il form ti avvisa che l'annuncio sarebbe già scaduto.

### Community Access Code (solo Admin)

All'inizio il codice è **spento**: chiunque faccia login con Google vede i contatti (i visitatori
non loggati no).

- **Attivarlo o cambiarlo:** **Staff → Admin → Community Access Code** → scrivi il codice →
  **Set code** / **Change**. Da quel momento **tutti i membri** (non lo staff) devono inserire il
  codice: condividilo nei gruppi WhatsApp. Non distingue maiuscole/minuscole.
- **Spegnerlo di nuovo:** **Turn the code off**.

### Aggiungere o togliere staff (solo Admin)

**Staff → Admin → Staff** → scrivi l'email **Google** della persona → *Staff* o *Admin* → **Add**.
Se non ha mai fatto login, diventa staff al primo login. **Remove** la riporta a membro normale.

### Zone e suburb

La zona viene assegnata automaticamente dal suburb usando la tabella `suburb_zones`
(circa 370 suburb di Perth e città del WA). Per aggiungere o correggere un suburb:
Supabase → **Table Editor** → `suburb_zones` → *Insert row* (suburb in minuscolo, es. `osborne park`;
zone = uno di `cbd`, `north`, `south`, `east`, `freo`, `south-west`, `wheatbelt`, `great-southern`,
`pilbara-kimberley`, `goldfields`, `rest-wa`, `nsw`, `vic`, `qld`, `sa`, `tas`, `nt`, `act`).

---

## Setup tecnico (una volta sola)

Tutto gratuito, nessuna carta di credito necessaria (tranne il dominio).

### 1. Supabase (database + login)

1. Crea un account su [supabase.com](https://supabase.com) → **New project**
   - Name: `unplugged-board` · Region: **Sydney (ap-southeast-2)** · salva la password del database.
2. **SQL Editor** → incolla `supabase/migrations/0001_init.sql` → **Run**.
   Poi, uno alla volta, `0002_suburb_zones.sql` e `0003_optional_access_code.sql` → **Run**.
3. Sempre nel SQL Editor, rendi te stesso admin (metti la tua email Google):
   ```sql
   insert into staff_invites (email, role) values ('tua.email@gmail.com', 'admin');
   ```
4. **Project Settings → API Keys**: copia **Project URL** e **Publishable key**.

### 2. Google login

1. [console.cloud.google.com](https://console.cloud.google.com) → crea un progetto "Unplugged Board".
2. **APIs & Services → OAuth consent screen**: External · nome app "Unplugged Board" · la tua email.
   Poi **Publish app** (con i soli permessi email/profilo non serve la verifica di Google).
3. **Credentials → Create credentials → OAuth client ID** → *Web application*
   - Authorized redirect URI: `https://<il-tuo-progetto>.supabase.co/auth/v1/callback`
4. Copia **Client ID** e **Client secret** → Supabase → **Authentication → Sign In / Providers →
   Google** → abilita e incolla.
5. Supabase → **Authentication → URL Configuration**:
   - Site URL: l'indirizzo del sito (es. `https://unpluggedwa.com`)
   - Redirect URLs: `https://unpluggedwa.com/auth/callback`, l'indirizzo `*.workers.dev` del sito
     seguito da `/auth/callback`, e `http://localhost:5173/auth/callback`.

### 3. Cloudflare (hosting)

1. Crea un account su [cloudflare.com](https://dash.cloudflare.com).
2. Metti **Project URL** e **Publishable key** di Supabase in `wrangler.jsonc` (sezione `vars`):
   sono valori pubblici, possono stare nel codice.
3. **Workers & Pages → Create → Import a repository** → collega GitHub → scegli questo repository.
   - Build command: `npm run build` · Deploy command: `npx wrangler deploy`
4. Ogni modifica su GitHub (branch `main`) viene pubblicata da sola.

### 4. Dominio

Cloudflare → **Domain Registration → Register domains** (prezzo di costo, ~US$11/anno per un `.com`).
Poi **Workers & Pages → unplugged-board → Settings → Domains & Routes → Add → Custom domain**.

### Sviluppo locale

```bash
npm install
cp .env.example .env   # e metti URL e publishable key di Supabase
npm run dev            # http://localhost:5173
npm run check          # controllo errori
```

## Struttura

| Cartella | Cosa c'è |
|---|---|
| `src/routes/` | Le pagine (`jobs`, `rooms`, `j/[id]`, `r/[id]`, `staff`, `admin`, `login`, `join`, `privacy`) |
| `src/lib/constants.ts` | Zone, categorie, durate |
| `src/lib/fields.ts` | Tutti i campi degli annunci (form, Paste JSON, AI) |
| `src/lib/format.ts` | Formattazione prezzi/date e messaggio WhatsApp |
| `supabase/migrations/` | Database, regole di accesso, tabella zone |
| `extraction-prompt.md` | Il prompt di estrazione per l'AI |

## Sicurezza

- I contatti stanno nella tabella `listing_private`, che il database consegna **solo** ai membri con il
  codice valido e allo staff (Row Level Security). Non sono semplicemente "nascosti" nella pagina.
- Il codice di accesso è salvato cifrato (bcrypt), con un limite di 8 tentativi sbagliati all'ora.
- Il form "Request removal" ha una protezione anti-bot.
