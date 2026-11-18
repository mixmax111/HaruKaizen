#!/usr/bin/env bash
# ==============================================================================
# scripts/verify-step-1.sh
# Verifica automatica di conformità per lo Step 1 del modulo Gym / Live Workout
# Esegue i 4 controlli richiesti:
# 1. 401 Unauthorized su GET /exercises senza token
# 2. Scheda pubblica vista da utente B (dettaglio e lista) priva di campi vietati
# 3. Sessione completata da utente senza data di nascita => calorie nulle
# 4. Payload fuori scala (es. repsCompleted: 999) => 400 Bad Request
# ==============================================================================

set -e

API_URL="${API_URL:-http://localhost:3000/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "================================================================="
echo " HaruKaizen - Step 1 Verification Script"
echo " Target API: $API_URL"
echo "================================================================="

FAILURES=0

# ------------------------------------------------------------------------------
# Check 1: GET /exercises senza token => HTTP 401 Unauthorized
# ------------------------------------------------------------------------------
echo -n "Check 1: GET /exercises senza token (atteso 401)... "
HTTP_CODE_1=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/exercises" || true)

if [ "$HTTP_CODE_1" = "401" ]; then
    echo "PASS (HTTP 401 Unauthorized)"
else
    echo "FAIL (ricevuto HTTP $HTTP_CODE_1, atteso 401)"
    FAILURES=$((FAILURES + 1))
fi

# ------------------------------------------------------------------------------
# Setup Dati di Test (Utente A autore, Utente B visualizzatore senza birthDate)
# ------------------------------------------------------------------------------
echo "Inizializzazione fixture utente A, utente B e scheda pubblica..."
FIXTURE_JSON=$(node "$SCRIPT_DIR/verify-fixture.cjs")

TOKEN_A=$(node -e "console.log(JSON.parse(process.argv[1]).tokenA)" "$FIXTURE_JSON")
TOKEN_B=$(node -e "console.log(JSON.parse(process.argv[1]).tokenB)" "$FIXTURE_JSON")
PLAN_ID=$(node -e "console.log(JSON.parse(process.argv[1]).planId)" "$FIXTURE_JSON")
EXERCISE_ID=$(node -e "console.log(JSON.parse(process.argv[1]).exerciseId)" "$FIXTURE_JSON")

# ------------------------------------------------------------------------------
# Check 2: Scheda pubblica vista da Utente B (dettaglio e lista)
#          Grep di campi vietati: userId, notes, aiReasoning, clinicalWarning,
#          weightTarget, createdByUserId
# ------------------------------------------------------------------------------
echo -n "Check 2: Whitelist campi scheda pubblica per utente B... "

DETAIL_RESP=$(curl -s -H "Authorization: Bearer $TOKEN_B" "$API_URL/workout/plans/$PLAN_ID")
LIST_RESP=$(curl -s -H "Authorization: Bearer $TOKEN_B" "$API_URL/workout/plans")

FORBIDDEN_DETAIL=$(echo "$DETAIL_RESP" | grep -o -E '"(userId|aiReasoning|clinicalWarning|notes|weightTarget|createdByUserId)":' || true)
FORBIDDEN_LIST=$(echo "$LIST_RESP" | grep -o -E '"(userId|aiReasoning|clinicalWarning|notes|weightTarget|createdByUserId)":' || true)

if [ -z "$FORBIDDEN_DETAIL" ] && [ -z "$FORBIDDEN_LIST" ]; then
    echo "PASS (0 campi vietati riscontrati in dettaglio e lista)"
else
    echo "FAIL (trovati campi vietati: detail=[$FORBIDDEN_DETAIL], list=[$FORBIDDEN_LIST])"
    FAILURES=$((FAILURES + 1))
fi

# ------------------------------------------------------------------------------
# Check 3: Sessione senza data di nascita => calorie nulle (caloriesBurned: null)
# ------------------------------------------------------------------------------
echo -n "Check 3: Calcolo calorie per utente senza data di nascita... "

# 3a. Avvia sessione per Utente B
START_RESP=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d '{"dayNameSnapshot":"Test Day","date":"2026-11-18T10:00:00.000Z"}' \
    "$API_URL/workout/logs/start")

LOG_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.id || r.id || '');" "$START_RESP")

# 3b. Aggiunge esercizio
EX_RESP=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d "{\"exerciseId\":\"$EXERCISE_ID\",\"exerciseNameSnapshot\":\"Test Exercise\"}" \
    "$API_URL/workout/logs/$LOG_ID/exercises")

LOG_EXERCISE_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.id || r.id || '');" "$EX_RESP")

if [ -z "$LOG_EXERCISE_ID" ]; then
    echo "Errore aggiunta esercizio: $EX_RESP"
    exit 1
fi

# 3c. Aggiunge serie valida
SET_RESP=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d '{"orderIndex":1,"setOrder":1,"repsCompleted":10,"weightKg":80,"setType":"WORKING"}' \
    "$API_URL/workout/logs/exercises/$LOG_EXERCISE_ID/sets")

# 3d. Conclude sessione
FINISH_RESP=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d '{}' \
    "$API_URL/workout/logs/$LOG_ID/finish")

CALORIES_NULL=$(node -e "
const r = JSON.parse(process.argv[1]);
const summary = r.data?.summary || r.summary;
console.log(summary && summary.caloriesBurned === null ? 'NULL_OK' : 'NOT_NULL');
" "$FINISH_RESP")

if [ "$CALORIES_NULL" = "NULL_OK" ]; then
    echo "PASS (caloriesBurned === null)"
else
    echo "FAIL (caloriesBurned non nullo: $FINISH_RESP)"
    FAILURES=$((FAILURES + 1))
fi

# ------------------------------------------------------------------------------
# Check 4: Payload fuori scala (repsCompleted: 999) => HTTP 400 Bad Request
# ------------------------------------------------------------------------------
echo -n "Check 4: Payload fuori scala repsCompleted=999 (atteso 400)... "

HTTP_CODE_4=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d '{"orderIndex":1,"setOrder":1,"repsCompleted":999,"weightKg":80,"setType":"WORKING"}' \
    "$API_URL/workout/logs/exercises/$LOG_EXERCISE_ID/sets" || true)

if [ "$HTTP_CODE_4" = "400" ]; then
    echo "PASS (HTTP 400 Bad Request)"
else
    echo "FAIL (ricevuto HTTP $HTTP_CODE_4, atteso 400)"
    FAILURES=$((FAILURES + 1))
fi

# ------------------------------------------------------------------------------
# Riepilogo finale
# ------------------------------------------------------------------------------
echo "================================================================="
if [ "$FAILURES" -eq 0 ]; then
    echo "ESITO FINALE: TUTTI I 4 CONTROLLI SUPERATI CON SUCCESSO (PASS)"
    echo "================================================================="
    exit 0
else
    echo "ESITO FINALE: $FAILURES CONTROLLI FALLITI (FAIL)"
    echo "================================================================="
    exit 1
fi
