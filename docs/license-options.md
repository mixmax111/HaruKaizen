# ⚖️ Opzioni di Licenza per HaruKaizen

> [!IMPORTANT]
> **TODO per il Proprietario del Progetto**: Il repository attualmente non contiene alcun file `LICENSE` e `package.json` dichiara `"license": "UNLICENSED"`. Di seguito vengono presentate 3 opzioni raccomandate con relativi vantaggi, svantaggi e implicazioni d'uso.

---

## Opzione 1: AGPL-3.0 (GNU Affero General Public License v3) — *Consigliata per Self-Hosting Sovrano*

### Descrizione
Licenza copyleft forte progettata specificamente per software accessibile via rete (SaaS, API e web app). Se qualcuno modifica HaruKaizen e lo ospita su un server offrendolo a terzi, è legalmente obbligato a rilasciare il codice sorgente modificato sotto la stessa licenza.

### Pro
- **Protezione Anti-Free-Rider**: Impedisce a società terze di prendere il motore di HaruKaizen (Conta Calorie PURO, Gym Logger), chiuderlo, applicarvi un paywall e rivenderlo come servizio proprietario senza contribuire alla community.
- **Garanzia di Libertà nel Tempo**: Il codice rimane perennemente aperto per tutti gli utenti finali.
- Perfettamente allineata con l'etica di sovranità, no-paywall e self-hosting.

### Contro
- Più restrittiva per aziende che vorrebbero integrare parti del codice in librerie proprietarie chiuse.
- Gli sviluppatori che distribuiscono l'app mobile su Apple App Store potrebbero incontrare complessità legali dovute alle clausole DRM dei termini di servizio Apple.

---

## Opzione 2: Apache-2.0 (Apache License 2.0) — *Consigliata per Massima Adozione*

### Descrizione
Licenza permissiva ampiamente adottata nell'ecosistema moderno (TypeScript, NestJS, React, Docker). Consente l'uso, la modifica e la ridistribuzione sia per scopi personali che commerciali, anche all'interno di progetti proprietari chiusi, con espressa concessione di brevetti.

### Pro
- **Massima Flessibilità & Adozione**: Chiunque può installare, personalizzare e distribuire HaruKaizen senza restrizioni sul rilascio del proprio codice.
- **Protezione da Brevetti**: Include una clausola esplicita di concessione e protezione incrociata sui brevetti.
- Piena compatibilità con App Store e Google Play per la distribuzione dei binari mobile nativi.

### Contro
- Non impedisce a terzi di creare una versione "commerciale chiusa" dell'app con paywall senza condividere i miglioramenti.

---

## Opzione 3: BSL 1.1 (Business Source License) — *Modello Ibrido Fair-Code*

### Descrizione
Licenza adottata da progetti come Sentry o MariaDB: il codice è 100% visibile e gratuito per uso personale, domestico o per piccole realtà, ma impone il pagamento di una licenza o il consenso dell'autore in caso di fornitura commerciale su larga scala come servizio cloud concorrente. Dopo un periodo prestabilito (es. 3 o 4 anni), il codice converte automaticamente in licenza open source standard (es. Apache 2.0).

### Pro
- Consente agli utenti privati di usare l'app al 100% gratuitamente e in autonomia.
- Protegge il creatore del progetto da grandi provider cloud che monetizzano il lavoro altrui.

### Contro
- Non è considerata formalmente "Open Source" secondo i criteri rigorosi dell'OSI (Open Source Initiative) durante il periodo di restrizione.
- Può frenare i contributi della community open source purista.

---

## Decisione Richiesta al Proprietario
1. Scegliere una delle 3 opzioni (o altra preferita).
2. Creare il file `LICENSE` alla radice del repository con il testo ufficiale della licenza selezionata.
3. Aggiornare il campo `"license"` nel file `package.json` (`"AGPL-3.0-only"`, `"Apache-2.0"`, ecc.).

