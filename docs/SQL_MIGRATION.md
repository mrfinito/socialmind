# SQL Migration — Panel admina v2

Aktualizacja Supabase wymagana do nowych funkcji panelu admina.
Uruchom w **Supabase SQL Editor** w kolejności.

---

## 1. Dodaj brakujące kolumny do `user_permissions`

Te kolumny obsługują 33 moduły (poprzednio było 12).

```sql
-- Główne (8 nowych)
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_strategia       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_rtm             BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_asystent        BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_briefy          BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_wlasny_brief    BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_grafika         BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_prezentacja     BOOLEAN DEFAULT true;
-- can_generate_posts już istnieje

-- Praca codzienna (4 nowe)
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_biblioteka      BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_scheduler       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_kalendarz       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_analityka       BOOLEAN DEFAULT true;
-- can_raport już istnieje

-- Marka (8 nowych)
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_marka           BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_brand_dna       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_platformy       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_materialy       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_stworzone       BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_news            BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_projekty        BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_wiadomosci      BOOLEAN DEFAULT true;

-- Specjaliści AI (7 nowych)
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_meta_ads        BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_performance     BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_storyboard      BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_crisis          BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_voice_checker   BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_newsletter      BOOLEAN DEFAULT true;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_caption_ab      BOOLEAN DEFAULT true;
```

**Default = `true`** dla wszystkich. Istniejący użytkownicy zachowują pełen dostęp — admin może wyłączać moduły indywidualnie.

---

## 2. Stwórz tabelę `activity_log`

Loguje akcje użytkowników (logowania, generacje, zmiany planu).

```sql
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  details     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id    ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action     ON activity_log(action);

-- RLS - tylko admin czyta wszystko
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all" ON activity_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "users insert their own" ON activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users read their own" ON activity_log FOR SELECT
  USING (user_id = auth.uid());
```

### Przykładowe wartości `action` (konwencja):

| Action | Kiedy | Details przykład |
|---|---|---|
| `login` | Po zalogowaniu | `via google` / `via email` |
| `signup` | Przy rejestracji | `invite: pro` |
| `generate.posts` | Generator postów | `5 wariantów Facebook` |
| `generate.image` | Wygenerowano grafikę | `gemini, 1024x1024` |
| `generate.rtm` | RTM | `8 okazji` |
| `generate.strategy` | Strategia | `30-60-90` |
| `plan_change` | Admin zmienił plan | `free → pro` |
| `permissions_change` | Admin zmienił uprawnienia | `dodano can_meta_ads` |
| `error.generation` | Niepowodzenie generacji | endpoint + error msg |
| `delete.user` | Usunięcie usera (admin) | adminEmail |

---

## 3. (Opcjonalnie) Backfill dla aktywnych użytkowników

Jeśli istnieją już użytkownicy z planem free, możesz im teraz wyłączyć "drogie" moduły:

```sql
UPDATE user_permissions
SET
  can_strategia = false,
  can_rtm = false,
  can_grafika = false,
  can_prezentacja = false,
  can_meta_ads = false,
  can_performance = false,
  can_storyboard = false,
  can_crisis = false,
  can_voice_checker = false,
  can_newsletter = false,
  can_caption_ab = false,
  can_kampania = false,
  can_listening = false
WHERE user_id IN (
  SELECT id FROM profiles WHERE plan = 'free' OR plan IS NULL
);
```

(opcjonalne — nowi free userzy będą mieli te moduły wyłączone z poziomu UI panelu admina, gdy admin wybierze preset Free)

---

## 4. Test po migracji

```sql
-- Sprawdź ile kolumn ma tabela
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_permissions' AND column_name LIKE 'can_%'
ORDER BY column_name;
-- Powinno być 33 wiersze (33 moduły)

-- Sprawdź czy activity_log działa
INSERT INTO activity_log (user_id, action, details)
VALUES ((SELECT id FROM auth.users LIMIT 1), 'test', 'sql migration check');

SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5;
```

Po migracji panel admina pokaże 33 toggle'i w 5 grupach, a zakładka **Activity log** zacznie pokazywać zdarzenia (po pierwszym `INSERT`).
