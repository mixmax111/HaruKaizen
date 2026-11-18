# 🤝 Guida per i Collaboratori (Contributing Guidelines)

Grazie per l'interesse nel contribuire a **HaruKaizen**! Questa guida descrive gli standard di codice, il flusso di lavoro e le regole per inviare pull request.

> [!IMPORTANT]
> **TODO per il Proprietario del Progetto**: Verificare e approvare le policy di branch e la licenza definitiva prima di accettare contributi esterni con copyright assegnato.

---

## 1. Principi Architetturali Fondamentali
1. **Nessun Paywall o Tracciamento Pubblicitario**: Qualsiasi contributo che introduca restrizioni a pagamento o telemetria di terzi invasiva verrà respinto.
2. **Onestà Documentale**: Nessuna funzione deve essere dichiarata come completa o funzionante nel README se non supportata da codice effettivo e test automatizzati.
3. **Sicurezza Fisiologica**: I vincoli medici (disclaimer, pavimento calorico 1200/1500 kcal, protezione minori, inibizione deficit/surplus automatico) sono prioritari su qualsiasi automazione AI.

---

## 2. Configurazione dell'Ambiente Locale
```bash
git clone https://github.com/mix_max111/harukaizen.git
cd harukaizen
npm install
npm run db:generate
```

---

## 3. Standard di Codice e Controllo Qualità
Prima di aprire una Pull Request, assicurati che tutti i controlli superino con successo:

```bash
# 1. Test unitari e di integrazione del Backend
npm run test --workspace=api

# 2. Compilazione del Frontend Web (Next.js 16 Turbopack)
npm run build --workspace=web

# 3. Controllo tipi TypeScript dell'App Mobile (Expo)
npx tsc -p apps/mobile/tsconfig.json --noEmit

# 4. Formattazione e linting
npm run lint --workspace=api
```

---

## 4. Convenzioni sui Commit
Utilizziamo il formato **Conventional Commits**:
- `feat(nutrition): ...` per nuove funzionalità
- `fix(sync): ...` per correzioni di bug
- `docs(readme): ...` per aggiornamenti di documentazione
- `test(api): ...` per aggiunta di test automatizzati
- `refactor(...): ...` per refactoring senza modifiche di comportamento esterno

