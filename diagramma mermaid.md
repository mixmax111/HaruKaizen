erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar firebase_uid
        varchar auth_provider
        varchar role
        int diet_tracking_mode
        float lifestyle_multiplier
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    USER_SETTINGS {
        uuid id PK
        uuid user_id FK "Unique"
        varchar llm_api_key
        varchar preferred_llm_provider
        varchar timezone
        varchar locale
        varchar fcm_push_token
        float target_weight_kg
        boolean is_dark_mode
        timestamp updated_at
    }

    MEASUREMENTS {
        uuid id PK
        uuid user_id FK
        float weight_kg
        float body_fat_percentage
        float chest_cm
        float arms_cm
        float waist_cm
        float legs_cm
        date recorded_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    PROGRESS_MEDIA {
        uuid id PK
        uuid user_id FK
        varchar media_url
        varchar media_type
        timestamp created_at
        timestamp deleted_at
    }

    AI_INSIGHT_REPORTS {
        uuid id PK
        uuid user_id FK
        varchar timeframe_code
        date date_start
        date date_end
        text context_snapshot
        text ai_response_markdown
        varchar report_type
        timestamp created_at
        timestamp deleted_at
    }

    EXERCISES {
        uuid id PK
        varchar name
        varchar category
        varchar equipment
        float default_met_value
        uuid created_by_user_id FK
        boolean is_verified
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    WORKOUT_PLANS {
        uuid id PK
        uuid user_id FK
        varchar name
        boolean is_active
        boolean is_public
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    WORKOUT_DAYS {
        uuid id PK
        uuid workout_plan_id FK
        varchar name
        int order_index
    }

    WORKOUT_DAY_EXERCISES {
        uuid id PK
        uuid workout_day_id FK
        uuid exercise_id FK
        int order_index
        int sets
        varchar reps_target
        varchar weight_target
        int rest_seconds
        varchar notes
    }

    WORKOUT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar day_name_snapshot
        timestamp started_at
        timestamp finished_at
        int duration_minutes
        float calories_burned
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    WORKOUT_LOG_EXERCISES {
        uuid id PK
        uuid workout_log_id FK
        varchar exercise_name_snapshot
        int sets_completed
        float weight_used
        boolean is_skipped
        varchar notes
    }

    FOOD_ITEMS {
        uuid id PK
        varchar name
        varchar barcode
        float calories_100g
        float protein_100g
        float carbs_100g
        float fat_100g
        float fiber_100g
        float sodium_100g
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    DIET_PLANS {
        uuid id PK
        uuid user_id FK
        varchar name
        boolean is_active
        boolean is_public
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    DIET_DAYS {
        uuid id PK
        uuid diet_plan_id FK
        varchar name
    }

    DIET_DAY_ITEMS {
        uuid id PK
        uuid diet_day_id FK
        uuid food_item_id FK
        time scheduled_time
        varchar meal_type
        float quantity_g
    }

    NUTRITION_LOGS {
        uuid id PK
        uuid user_id FK
        timestamp logged_at
        varchar meal_type
        uuid food_item_id FK
        varchar custom_food_name
        float quantity_g
        float calories_consumed
        float protein_consumed
        float carbs_consumed
        float fat_consumed
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    USERS ||--|| USER_SETTINGS : "configura"
    USERS ||--o{ AI_INSIGHT_REPORTS : "genera"
    USERS ||--o{ MEASUREMENTS : "registra"
    USERS ||--o{ PROGRESS_MEDIA : "carica"
    USERS ||--o{ EXERCISES : "crea_custom"
    USERS ||--o{ WORKOUT_PLANS : "possiede"
    USERS ||--o{ WORKOUT_LOGS : "effettua"
    USERS ||--o{ DIET_PLANS : "segue"
    USERS ||--o{ NUTRITION_LOGS : "mangia"

    WORKOUT_PLANS ||--o{ WORKOUT_DAYS : "contiene"
    WORKOUT_DAYS ||--o{ WORKOUT_DAY_EXERCISES : "prevede"
    EXERCISES ||--o{ WORKOUT_DAY_EXERCISES : "incluso_in"

    WORKOUT_LOGS ||--o{ WORKOUT_LOG_EXERCISES : "traccia"

    DIET_PLANS ||--o{ DIET_DAYS : "struttura"
    DIET_DAYS ||--o{ DIET_DAY_ITEMS : "pianifica"
    FOOD_ITEMS ||--o{ DIET_DAY_ITEMS : "composto_da"

    FOOD_ITEMS ||--o{ NUTRITION_LOGS : "riferito_a"