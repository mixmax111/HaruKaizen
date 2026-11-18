# 🔒 Politica di Sicurezza (Security Policy)

> [!IMPORTANT]
> **TODO per il Proprietario del Progetto**: Configurare l'indirizzo email o il canale sicuro per la ricezione delle segnalazioni di vulnerabilità nella sezione sottostante.

## Versioni Supportate

Allo stato attuale dello sviluppo (fase Beta), solo l'ultimo commit del branch principale (`local-edition` / `main`) riceve correzioni di sicurezza:

| Versione | Supportata |
|---|:---:|
| Branch Principale (HEAD) | ✅ |
| Versioni / Tag Precedenti | ❌ |

## Segnalazione di Vulnerabilità

Prendiamo molto sul serio la sicurezza e la privacy dei dati sanitari e biometrici:

1. **Non aprire issue pubbliche su GitHub** per segnalare falle di sicurezza o vulnerabilità crittografiche.
2. Invia una segnalazione dettagliata via email a:
   - **Contatto Sicurezza (TODO)**: `[INSERIRE EMAIL DEDICATA, es. security@harukaizen.local]`
3. Includi nella segnalazione:
   - Descrizione dettagliata della vulnerabilità.
   - Passaggi riproducibili (Proof of Concept).
   - Componenti impattati (`apps/api`, `apps/web`, `apps/mobile`, `packages/shared`).
   - Valutazione dell'impatto potenziale su integrità, riservatezza o disponibilità dei dati.

## Linee Guida per gli Utenti che Ospitano un'Istanza
- Non esporre mai le porte di PostgreSQL (`5432`/`5433`) o Redis (`6379`) su internet pubblico (`0.0.0.0`).
- Configurare sempre HTTPS tramite un reverse proxy (es. Caddy o NGINX) con certificati TLS validi.
- Generare chiavi crittografiche casuali e robuste per `JWT_SECRET`, `JWT_REFRESH_SECRET` e `ENCRYPTION_KEY`.
- Eseguire periodicamente backup cifrati del database `harukaizen_db`.

