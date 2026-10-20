## v0.6.2 — GitHub release preparation
- GitHub Actions bundles the Node.js 24 Windows runtime and its license inside the Inno Setup installer; Node.js no longer needs to be installed separately when using the `.exe`.
- Desktop VBS launcher and stop command prefer the bundled `node.exe` while continuing to support the existing Node.js installation.
- Git ignore rules exclude CV exports, PDFs, encrypted sessions, local archives and packaged runtimes.
- User archive and DPAPI credentials remain in Documents and are never part of the installer.

# FlowCV Manager v0.6.1 — Login nel browser abituale

- Eliminato il login automatico con Edge in modalità debugging, bloccato da Google.
- **Apri FlowCV nel mio Edge** usa il normale profilo Edge (fallback al browser predefinito).
- Le istruzioni per copiare `flowcvsidapp` e il campo sessione sono ora visibili senza aprire opzioni avanzate.
- Sessione cifrata DPAPI e import dalla CLI conservati; non cambia alcun archivio CV.
- Nessun CDP, flag di debugging o tentativo di leggere i cookie dal profilo personale del browser.

# v0.6.0 — Sessione tramite Edge e installazione

- Pulsante «Accedi con Edge» in Connessione e impostazioni.
- Profilo di accesso isolato dal browser predefinito; acquisizione FlowCV via CDP, con verifica lato server e DPAPI.
- Recupero da sessione CLI e incolla manuale lasciati nelle opzioni avanzate.
- Supporto a installer per utente (PowerShell/desktop/start menu) e template Inno Setup/GitHub Actions per EXE.
- Archivio Master, CV locali, pubblicazione con un clic e PDF originale invariati.

# v0.5.4 — 2026-10-20

- **Pubblica e scarica PDF:** un solo clic sulla scheda selezionata carica il JSON su FlowCV, verifica tutte le sezioni/dati personali/stile/lingua, pubblica il CV sul web se necessario e scarica il PDF originale.
- Nessun popup di conferma e nessun backup automatico; il Master e tutte le varianti salvate localmente restano invariati.
- Rimosso il pulsante separato «PDF online»: non si rischia più di scaricare il CV sbagliato dopo avere selezionato una variante locale.
- Foto online conservata, titolo PDF ricavato da azienda e ruolo della scheda, controlli su identità del CV e sessione.
- Se la verifica fallisce non procede alla pubblicazione né al download; se il PDF non riesce, avvisa che il CV è già stato pubblicato.

# Changelog

## v0.5.3
- Scarica direttamente il PDF **originale** del CV online selezionato tramite FlowCV, senza passare dal browser.
- Solo una nuova azione in alto. Non vengono creati backup e non vengono pubblicati nuovi CV.
- Controlli di autenticazione, appartenenza, firma PDF e limiti dimensione.

## v0.5.2
- Evita il campo HTML `type="password"` per il cookie nella pagina HTTP locale; alcuni browser mostrano un avviso HTTPS sopra o vicino al modulo anche se il servizio è soltanto su `127.0.0.1`.
- Il valore del cookie resta mascherato in Edge tramite CSS (`-webkit-text-security`), non viene memorizzato dal browser (`autocomplete="off"`) ed è salvato cifrato con DPAPI dal backend.
- Nessun flag di sicurezza del browser disattivato. Se l’avviso dipende da estensioni o impostazioni esterne, potrebbe rimanere.
- Nessuna modifica a CV, sessioni salvate, ripristino o launcher.

## v0.5.1
- Corretto ERR_CONNECTION_REFUSED quando Edge delega rapidamente una finestra a un altro processo.
- Il server rimane attivo in background, con stop esplicito tramite Arresta-FlowCV.cmd.
- Log del server e test della chiusura immediata del processo browser.

## v0.5 (20 ottobre 2026)

- Launcher desktop Windows: `FlowCV-Manager.vbs` esegue `launcher.mjs`, che avvia il server Node in background, aspetta che sia pronto e apre una finestra Edge/Chrome autonoma in modalità `--app`.
- `Avvia-FlowCV.cmd` retrocompatibile per i collegamenti già esistenti; nessuna finestra terminale persistente.
- Collegamento desktop con icona dedicata mediante `Crea-collegamento-desktop.vbs` e file `.ico`.
- Restyling UI: intestazione, navigazione CV, ricerca e pulsante Ripristina più leggibili; nessuna modifica allo schema dei dati e nessun pulsante superfluo aggiunto.
- Pulsante `Apri FlowCV` instrada l'apertura nel browser predefinito Windows (mantiene la sessione originale del sito), non nel profilo dedicato dell'app.
- Indicatore "Non sicuro" del browser non più nell'interfaccia desktop perché la modalità `--app` non mostra la barra URL. Nessuna disattivazione delle protezioni di sistema; backend su loopback locale.
- Test di avvio/chiusura del launcher, asset grafici, smoke test e test Bridge superati in ambiente di test. Verifica su Windows ancora necessaria.

## v0.4.1

- Ripristino su FlowCV senza backup automatici. Conferma singola e verifica delle differenze, archivio gestito soltanto dall'utente.

## v0.4

- Interfaccia archivio: nome, azienda, ruolo, note, ricerca, duplicazione, Cestino, una sola conferma di ripristino.

## v0.3.1

- Fix Windows DPAPI: caricamento esplicito dell'assembly System.Security.
