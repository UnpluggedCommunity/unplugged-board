# Verifica Google — testi pronti

Google Cloud → **Google Auth Platform** → **Verification Center** → **Prepare for verification**.
Copia i testi in inglese qui sotto nei campi corrispondenti. Le note in italiano sono solo per te.

---

## 1. Branding (Google Auth Platform → Branding)

| Campo | Valore |
|---|---|
| App name | `Unplugged Board` |
| User support email | la Gmail di Unplugged (o `hello@unplugged-au.com` quando è attiva) |
| App logo | il logo Unplugged, quadrato 120×120 px (te lo preparo io se serve) |
| Application home page | `https://unplugged-au.com/about` |
| Application privacy policy link | `https://unplugged-au.com/privacy` |
| Application terms of service link | lascialo vuoto (facoltativo) |
| Authorized domains | `unplugged-au.com` |
| Developer contact email | la Gmail di Unplugged |

> ⚠️ Google chiede di dimostrare che il dominio è vostro: ti manda su **Google Search Console** →
> aggiungi la proprietà `unplugged-au.com` → scegli la verifica **DNS (TXT)** → copia il record TXT →
> su Cloudflare → **DNS** → **Add record** → Type `TXT`, Name `@`, Content = il codice → Save →
> torna su Search Console → **Verify**.

---

## 2. Scope (Google Auth Platform → Data Access)

Scope richiesti:
- `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid` (non sensibili, per il login)
- `https://www.googleapis.com/auth/gmail.send` (**sensibile**)

### Testo — "How will the scopes be used?" / justification for `gmail.send`

```
Unplugged Board (https://unplugged-au.com) is a free job board run by Unplugged, a volunteer community
of backpackers and working holiday makers in Perth, Western Australia. Members keep a job profile and
up to 3 CVs on the site. For each job listing, the member can review an application email (drafted from
their own profile) and choose "Send from my Gmail".

We request gmail.send only at that moment (incremental authorization), not at sign-in. It is used for one
purpose: to send that single application email, which the member has just reviewed and edited on screen,
from the member's own Gmail account to the employer's contact address shown on the listing, with the CV
the member selected as an attachment. Each send is triggered by an explicit click on "Send from my Gmail".

Why gmail.send is needed: employers (small cafes, farms, builders) expect applications to come from the
applicant's personal address, and applicants need the email to appear in their own Sent folder so they
can follow up. Sending from a shared platform address would look like spam and break the conversation
with the employer.

We do not request any read, modify or metadata scope. We never read, search, list or delete the user's
emails. The access token is requested online (no refresh token), kept only in an httpOnly session cookie
for about one hour, and never stored in our database. Users can revoke access at any time from their
Google Account. Our use of information received from Google APIs adheres to the Google API Services User
Data Policy, including the Limited Use requirements.
```

### Testo — "Why can't a narrower scope be used?" (se richiesto)

```
gmail.send is already the narrowest Gmail scope that allows sending an email with an attachment on the
user's behalf. We do not request gmail.compose, gmail.modify or any read scope.
```

---

## 3. Video demo (YouTube, visibilità "Non in elenco")

Google vuole un video che mostri **l'URL nella barra del browser**, la **schermata di consenso con il nome
dell'app** e **come viene usato lo scope**. Registralo dal computer (meglio: si vede l'indirizzo), in
inglese o senza voce, 2–3 minuti. Usa un tuo annuncio di prova con la **tua email come contatto**.

**Copione:**
1. Apri `https://unplugged-au.com/about` — scorri piano la sezione "How we use your Google account".
2. Apri `https://unplugged-au.com/privacy` — mostra la sezione "Google account and Gmail".
3. Vai su **Log in** → **Continue with Google** → mostra la schermata di Google con "Unplugged Board" →
   completa il login.
4. **Me → Job profile** (già compilato) e **My CVs** (un CV caricato), per far vedere da dove arrivano i dati.
5. Apri l'annuncio di prova → **Apply with Unplugged** → scegli il CV → **Write it for me** → modifica una
   riga del testo (si deve vedere che l'utente controlla tutto).
6. Clicca **Connect Gmail & send** → **ferma il video sulla schermata di consenso di Google**: deve
   vedersi chiaramente il nome "Unplugged Board" e il permesso "Send email on your behalf". Clicca Allow.
7. Torni sulla pagina con la bozza → **Send from my Gmail** → schermata "Application sent".
8. Apri la **tua Gmail** → cartella **Inviati** → mostra l'email con il CV allegato.
9. Apri `https://myaccount.google.com/permissions` → mostra "Unplugged Board" → si può rimuovere l'accesso.

Didascalia da incollare nella descrizione del video:

```
Unplugged Board — demo of the gmail.send scope. The user signs in with Google, reviews an application
email drafted from their own profile, grants gmail.send when clicking "Connect Gmail & send", and the
email is sent from their Gmail to the employer with their CV attached. The app never reads the mailbox.
```

---

## 4. Checklist prima di inviare
- [ ] Il sito risponde su `https://unplugged-au.com` e le pagine `/about` e `/privacy` sono pubbliche
- [ ] Dominio verificato in Google Search Console
- [ ] Branding compilato (logo, home page, privacy, dominio)
- [ ] Gmail API abilitata e scope `gmail.send` aggiunto in Data Access
- [ ] App pubblicata (**Audience → Publish app**)
- [ ] Video caricato su YouTube come "Non in elenco"
- [ ] Email `hello@unplugged-au.com` attiva (Cloudflare → Email → Email Routing → inoltro alla Gmail)

Dopo l'invio Google risponde **via email** (di solito in pochi giorni, a volte qualche settimana) e può
chiedere chiarimenti: girami le loro domande e ti preparo la risposta.
