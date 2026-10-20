# FlowCV Manager v0.6.2 — Installer EXE autonomo e login nel proprio Edge

Per installare da ZIP usa `Installa-FlowCV.cmd` alla radice del pacchetto ZIP. Crea un collegamento sul desktop e nel menu Start, installa in `%LOCALAPPDATA%\Programs\FlowCV Manager`, e conserva l'archivio in Documenti. Richiede Node.js 22+. **Il setup `.exe` compilato da GitHub Actions include invece Node.js, senza installazioni separate.**

**Apri FlowCV nel mio Edge:** apre il normale profilo Edge, senza debugging o finestre automatizzate che possono essere bloccate da Google. Accedi al sito; se la sessione del Manager è scaduta, copia il valore `flowcvsidapp` da **F12 → Application → Cookies → https://app.flowcv.com** e incollalo nella sezione **Sessione FlowCV** del Manager. Premi **Collega account**. Il cookie rimane cifrato con Windows DPAPI; non devi inserirlo nuovamente finché è valido. In alternativa, usa la sessione CLI salvata, se ancora valida.

Per aggiornare da una versione avviata dal collegamento vecchio, prima esegui `Arresta-FlowCV.cmd` (se non lo fai, lo script d'installazione prova a fermare in modo sicuro il server preesistente).

L'installer non cancella né sposta `Documents\FlowCV-Local-Manager` e non carica CV o cookie su GitHub. Anche il file locale `index.html` di questa versione non richiede privilegi amministrativi.

---

# FlowCV Manager v0.6.0 — Archivio CV, pubblicazione e PDF originale

Applicazione locale per Windows, basata sul precedente **FlowCV Local Manager v0.4.1**. Conserva le versioni dei CV sul PC, le permette di rinominare / categorizzare per azienda e posizione, e ripristina il JSON scelto nell'editor originale FlowCV, pubblica il CV online e scarica il PDF originale con **un solo clic, senza conferme**. Non crea CV online aggiuntivi e **non effettua backup automatici** a ogni ripristino.

## Aggiornare da v0.5.4 senza perdere i CV

1. Ferma il Manager avviando `FlowCV-Local-Manager\Arresta-FlowCV.cmd` (la finestra Edge da sola non ferma il server).
2. Estrai lo ZIP nella directory che contiene `FlowCV-Local-Manager`, normalmente `%USERPROFILE%\Projects\Flowcv-MCP\`, sostituendo i file della sola cartella `FlowCV-Local-Manager`.
3. **Doppio clic su `FlowCV-Local-Manager\Crea-collegamento-desktop.vbs`** per creare o aggiornare l'icona **FlowCV Manager** sul desktop. In alternativa riusa il collegamento esistente a `Avvia-FlowCV.cmd`.
4. Da ora fai doppio clic sull'icona. Il launcher apre una **finestra Edge/Chrome in modalità app**, senza barra degli indirizzi o terminale visibile. Il server rimane in background anche se Edge riutilizza un processo esistente; per fermarlo usa `Arresta-FlowCV.cmd` nella cartella del programma. Questo evita ERR_CONNECTION_REFUSED dovuto alla chiusura prematura del processo Edge.

Per funzionare serve **Node.js 22+** già installato (il tuo ambiente lo ha) e **Microsoft Edge** oppure Google Chrome. Non è necessario installare Electron o un browser aggiuntivo. Non è necessario aprire PowerShell.

**Dati preservati:** NON cancellare `%USERPROFILE%\Documents\FlowCV-Local-Manager`: conserva registry, JSON, cronologia e sessione DPAPI. L'aggiornamento sostituisce solo il programma, non gli archivi. Il nuovo profilo Edge dedicato all'interfaccia è in `%LOCALAPPDATA%\FlowCV-Manager\AppWindow` e non contiene i CV archiviati.

## Interfaccia v0.5

- **Archivio a schede:** cerca per nome, azienda, ruolo e note; rinomina e categorizza ogni CV senza modificare il suo JSON; duplica, esporta o sposta nel Cestino dal menu `•••`.
- **Importa JSON (+):** riceve i curriculum creati in ChatGPT insieme ai metadati per la libreria locale.
- **Pubblica e scarica PDF:** un solo clic sul CV locale scelto per sovrascrivere il CV online, verificare i contenuti, **pubblicare/aggiornare anche la pagina web pubblica** e scaricare il PDF autentico FlowCV. **Nessuna conferma o copia automatica.** Se hai modifiche online da conservare, usa volontariamente **Salva versione da FlowCV** prima.
- **PDF originale:** viene scaricato automaticamente per la versione locale selezionata, *dopo* il ripristino verificato sul servizio e la pubblicazione web. Il gestore non crea PDF semplificati.
- **Apri FlowCV ↗:** su Windows apre `https://app.flowcv.com` tramite il browser predefinito (dove sei già autenticato) per modificare il CV e scaricare il **PDF originale**. Nessun PDF locale semplificato.
- Le schede Contenuti, Dati personali, JSON e Cronologia permettono modifiche locali e recuperi di edit.
- La UI è stata ridisegnata per l'uso in una finestra desktop e mantiene l'autenticazione cifrata della v0.4.1.

## Cosa significa «connessione non sicura»

Il Manager viene servito all'indirizzo `http://127.0.0.1:8765` e ascolta **solo sul loopback del PC**. Il traffico su HTTP localhost non esce su Internet, ma **non è TLS/HTTPS**. La finestra desktop in modalità app **nasconde la barra degli indirizzi**, quindi non mostra il normale indicatore «Non sicuro» del browser. Non abbiamo disattivato protezioni di Windows o Edge né certificato falsamente una connessione HTTP. Le richieste a FlowCV utilizzano invece `https://app.flowcv.com`.

Il server conserva controllo dell'header `Host`, token CSRF per modifiche, controllo dell'origine e accesso limitato a 127.0.0.1. I cookie vengono mantenuti nel deposito Windows DPAPI già esistente; il launcher non accede ai cookie e non li scrive nei log.

## Avvio e diagnosi

- **Normale:** `FlowCV Manager` dal Desktop, oppure doppio clic su `FlowCV-Manager.vbs` o `Avvia-FlowCV.cmd`.
- **Diagnosi:** in PowerShell `node .\FlowCV-Local-Manager\server.mjs` per tenere il server visibile, oppure `node .\FlowCV-Local-Manager\launcher.mjs` per gli errori del launcher.
- **Log del launcher:** `Documenti\FlowCV-Local-Manager\launcher.log`; log degli errori del server in `server.log`; NON contiene cookie o dati CV.
- **Porta occupata:** chiudi vecchie istanze di FlowCV Manager o la vecchia finestra del server v0.4.1, poi riapri. Se il server è già attivo, il launcher lo riutilizza; non lo chiude quando la finestra Edge viene chiusa.
- **Browser assente:** se Edge/Chrome è installato in un percorso non standard, imposta la variabile `FLOWCV_MANAGER_BROWSER` sul percorso completo di `msedge.exe` o `chrome.exe`.
- **VBScript bloccato dai criteri Windows:** la finestra senza terminale potrebbe non avviarsi; l'avvio tradizionale `node server.mjs` rimane disponibile.

## Test

```
node .\FlowCV-Local-Manager\tests\smoke.cjs
node .\FlowCV-Local-Manager\tests\bridge.test.mjs
node .\FlowCV-Local-Manager\tests\launcher.test.mjs
```

I test HTTP/Bridge e del ciclo di vita del launcher sono eseguiti senza credenziali né scritture su FlowCV. **Avvio Edge effettivo e controllo del login/preferenze su Windows devono essere provati dall'utente.**

## Pubblicazione del codice

Il Manager è un'estensione locale progettata attorno alle API non ufficiali del progetto `amirwebd3v/Flowcv-MCP`. Non caricare la cartella `Documents/FlowCV-Local-Manager` su GitHub e chiarire licenze/permessi prima di pubblicare codice derivato.

## Correzione v0.5.1

- Eliminata la dipendenza fra la durata del processo Edge iniziale e la durata del server: il server parte in background e sopravvive al riutilizzo del processo di Edge.
- Server pronto prima di aprire il browser; registrazione di `server.log` per diagnosi.
- Riutilizzo di istanze già attive: doppio clic ripetuto non avvia un secondo server.
- Arresto esplicito con `Arresta-FlowCV.cmd` (controllo PID e token della sessione locale prima di terminare il processo).
- Nessuna modifica a JSON salvati, cookie o comportamento di pubblicazione.

## Correzione v0.5.2

La pagina HTTP locale non include più un input HTML `type=password` per il cookie FlowCV. Il campo usa `type=text` visivamente mascherato da Edge/Chromium con `-webkit-text-security:disc`, per evitare un possibile avviso HTTP/password generato dal browser senza disattivare le sue protezioni. I caratteri inseriti non sono cifrati durante la digitazione nel DOM; il valore resta locale e viene conservato dal backend tramite DPAPI. La correzione non garantisce la rimozione di messaggi provenienti da estensioni o software esterni.

Per aggiornare un server già attivo, **ferma il server** con `Arresta-FlowCV.cmd` prima di sostituire i file: la v0.6.0 cambia sia il codice del server sia quello della pagina.

## Cronologia: v0.5.4 — Download PDF online separato (ora sostituito)

- Nella v0.5.4 c’era **↓ PDF online**; nella v0.6.0 è sostituito dal pulsante unico per non scaricare la versione sbagliata.
- L'endpoint è quello già utilizzato dalla CLI `Flowcv-MCP`: `GET /api/resumes/download?resumeId=...&previewPageCount=1`.
- L'operazione è di **sola lettura**, non modifica il CV online e non salva backup. Il PDF viene restituito dal servizio FlowCV; nessun renderer semplificato.
- Il Manager verifica proprietà del CV, risposta HTTP, dimensione e intestazione `%PDF-` del file.
- Il pulsante resta disabilitato in assenza di account valido o di CV remoto.

**Attenzione:** «Pubblica e scarica PDF» sovrascrive senza conferme il CV dell’account FlowCV collegato e può renderne pubblica la pagina web. Se desideri solo l’archivio locale, non premere questo pulsante.

L'endpoint di download è non ufficiale: il funzionamento su un account reale va verificato sul PC dell'utente.
