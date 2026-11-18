---
name: docs-audit
description: Read-only documentation claim auditor. Extracts factual assertions from documentation and compares them strictly against repository code, schemas, and configurations. Classifies each claim as VERO, FALSO, PARZIALE, or NON VERIFICABILE with exact file and line references.
---

# Documentation Claim Audit Procedure

Procedura di audit in sola lettura per allineare la documentazione tecnica e il README alla realtà implementata nel codice sorgente.

## Principi Fondamentali
1. **Nessuna Inferenza**: Se non c'è una riga di codice esplicita o una configurazione attiva che dimostri l'affermazione, lo stato NON può essere VERO.
2. **Nessuna Scrittura sul Database Produttivo**: Nessuna migrazione irreversibile o modifica al database durante la fase di audit.
3. **Verifica Rigorosa dei 4 Stati**:
   - `VERO`: L'affermazione è completamente implementata e rispecchia fedelmente il comportamento a runtime.
   - `FALSO`: L'affermazione dichiara una funzionalità, porta, libreria o comportamento assente, opposto o smentito dal codice.
   - `PARZIALE`: La funzionalità esiste in parte (es. solo mock, solo backend senza client, o limitata a certi scenari).
   - `NON VERIFICABILE`: L'affermazione riguarda intenzioni future, affermazioni legali o parametri non riscontrabili nell'albero dei file.

## Fasi Operative
1. **Estrazione Atomica**: Scansiona `README.md` riga per riga ed estrai ogni proposizione verificabile (porte, versioni, flussi dati, crittografia, offline, licenze).
2. **Ispezione del Codice**:
   - Cerca i riferimenti di configurazione (`docker-compose*.yml`, `package.json`, `.env.example`).
   - Ispeziona i servizi di backend (`apps/api/src/**/*.ts`).
   - Ispeziona il frontend (`apps/web/**/*.tsx`, `apps/mobile/**/*.tsx`).
   - Ispeziona lo schema e seed Prisma (`schema.prisma`, `prisma/seed.ts`).
3. **Redazione della Tabella di Evidenza**:
   - Per ciascuna affermazione: ID, Sezione, Affermazione, Stato, File e Linea di Prova, Nota Tecnica Sintetica.
4. **Analisi Critica dei Gap**:
   - Evidenziare le 10 discrepanze più gravi che inducono in errore l'utente o espongono rischi di sicurezza/privacy.

