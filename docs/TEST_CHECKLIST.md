# UBEK Next — Lista testów akceptacyjnych (QA)

## Konfiguracja wstępna

| # | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 1 | Skopiuj `.env.example → .env`, wypełnij zmienne | Plik `.env` istnieje z realnymi wartościami | |
| 2 | Uruchom `docker compose up -d` | Wszystkie kontenery startują bez błędów | |
| 3 | Wykonaj migrację: `cd next && npm run db:push` | Tabele utworzone w PostgreSQL | |
| 4 | Zasiej dane: `cd next && npm run db:seed` | Użytkownik `admin@ubek.ai` / `admin123` + gem "General" | |
| 5 | Uruchom Pi Agent: `cd agent && npm run dev` | Serwer na :4000, log "Pi Agent listening" | |
| 6 | Uruchom Next.js: `cd next && npm run dev` | Serwer na :3000, brak błędów kompilacji | |
| 7 | Sprawdź `http://localhost:4000/api/health` | JSON `{ "status": "ok", "uptime": ... }` | |
| 8 | Otwórz `http://localhost:3000` | Przekierowanie na `/auth/login` | |

---

## 1. Rejestracja

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 1.1 | Wejdź na `/auth/register` | Formularz: name, email, password, confirm | |
| 1.2 | Wyślij pusty formularz | HTML5 validation: pola wymagane | |
| 1.3 | Wpisz krótkie hasło (<8 znaków) | Komunikat o błędzie (JS lub HTML5) | |
| 1.4 | Wpisz nieprawidłowy email (np. "test") | Komunikat o nieprawidłowym formacie | |
| 1.5 | Wpisz różne hasła w password i confirm | Komunikat: hasła nie są zgodne | |
| 1.6 | Zarejestruj użytkownika `test@example.com` / `Test1234!` | 201 Created, przekierowanie na `/` | |
| 1.7 | Zarejestruj ten sam email ponownie | 409 Conflict: email already exists | |
| 1.8 | Zarejestruj drugiego użytkownika `admin@test.com` / `Admin123!` | 201 Created | |

### API Direct (curl)

| # | Test | Komenda | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 1.A1 | Rejestracja — brak emaila | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"password":"Test1234!"}'` | 400, `{"error":"..."}` | |
| 1.A2 | Rejestracja — za krótkie hasło | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"a@b.com","password":"Ab1!"}'` | 400, błąd walidacji | |
| 1.A3 | Rejestracja — poprawna | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"api@test.com","password":"ApiTest123!"}'` | 201, `{"user":{"id":"...","email":"api@test.com"}}` | |
| 1.A4 | Rejestracja — duplikat | Powtórz 1.A3 | 409 | |

---

## 2. Logowanie

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 2.1 | Wejdź na `/auth/login` | Formularz: email, password | |
| 2.2 | Wyślij pusty formularz | Walidacja: pola wymagane | |
| 2.3 | Wpisz nieistniejący email + hasło | "Invalid credentials" (taki sam komunikat jak dla złego hasła) | |
| 2.4 | Wpisz istniejący email + złe hasło | "Invalid credentials" (identyczny komunikat jak 2.3) | |
| 2.5 | Zaloguj się `test@example.com` / `Test1234!` | 200, przekierowanie na `/` | |
| 2.6 | Odśwież stronę | Nadal zalogowany (httpOnly cookie) | |
| 2.7 | DevTools → Application → Cookies → usuń `token`, odśwież | Przekierowanie na `/auth/login` | |
| 2.8 | Zaloguj się, zamknij/zapnij kartę na 24h, wróć | Sesja wygasła (JWT), przekierowanie na login | |

### API Direct (curl)

| # | Test | Komenda | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.A1 | Login — brak emaila | `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"password":"x"}'` | 400 | |
| 2.A2 | Login — złe hasło | `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"WrongPass1!"}'` | 401, `{"error":"Invalid credentials"}` | |
| 2.A3 | Login — poprawny | `API_LOGIN=$(curl -s -D - http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"Test1234!"}')` | 200 + Set-Cookie z `token=httpOnly` | |
| 2.A4 | Me — bez ciasteczka | `curl -s http://localhost:3000/api/auth/me` | 401 | |
| 2.A5 | Me — z ciasteczkiem | `curl -s --cookie 'token=...' http://localhost:3000/api/auth/me` | 200, `{"user":{"id":"...","email":"test@example.com"}}` | |
| 2.A6 | Logout | `curl -s -X POST http://localhost:3000/api/auth/logout --cookie 'token=...'` | 200, cookie wyczyszczone | |

---

## 3. Dashboard / Layout

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 3.1 | Po zalogowaniu sprawdź layout | Sidebar: logo "UBEK", "New Chat", lista projektów, user info + logout | |
| 3.2 | Kliknij "New Chat" | Przekierowanie na `/chat` | |
| 3.3 | Kliknij w nazwę użytkownika | Menu/info: email, rola | |
| 3.4 | Kliknij "Logout" | Wylogowanie, przekierowanie na `/auth/login` | |
| 3.5 | Po wylogowaniu, kliknij "Back" w przeglądarce | Przekierowanie na `/auth/login` (brak dostępu) | |
| 3.6 | Po zalogowaniu, wpisz w URL `/gems` | Strona gems się ładuje (200) | |
| 3.7 | Po zalogowaniu, wpisz w URL `/admin` | Strona admin się ładuje (200) | |
| 3.8 | Po zalogowaniu, wpisz w URL `/vault` | Strona vault się ładuje (200) | |

### Middleware redirect (curl)

| # | Test | Komenda | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.M1 | Niezalogowany → `/` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` | 302 redirect do `/auth/login` | |
| 3.M2 | Niezalogowany → `/gems` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/gems` | 302 redirect | |
| 3.M3 | Niezalogowany → `/api/chat/stream` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/chat/stream` | 302 redirect (middleware) lub 401 (route) | |
| 3.M4 | Zalogowany → `/auth/login` | `curl -s --cookie 'token=...' -o /dev/null -w '%{http_code}' http://localhost:3000/auth/login` | 302 redirect do `/` | |
| 3.M5 | Zalogowany → `/gems` | `curl -s --cookie 'token=...' -o /dev/null -w '%{http_code}' http://localhost:3000/gems` | 200 | |

---

## 4. Chat

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 4.1 | Wejdź na `/chat` | Pusty czat: "Start a conversation" | |
| 4.2 | Wpisz wiadomość i naciśnij Enter | User msg po prawej, odpowiedź po lewej | |
| 4.3 | Wpisz wiadomość >1000 znaków | Wysłana, scroll w dół | |
| 4.4 | Kliknij "Stop" podczas odpowiedzi | Stream przerwany | |
| 4.5 | Shift+Enter w polu tekstowym | Nowa linia (nie wysyła) | |
| 4.6 | Wyślij pustą wiadomość | Przycisk disabled, nic się nie dzieje | |
| 4.7 | Wyślij wiadomość z HTML/JS | `alert(...)` nie wykonuje się | |

### SSE Protocol — format strumienia

| # | Test | Komenda | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 4.S1 | Sprawdź pierwszy event strumienia | `curl -s -N -X POST http://localhost:3000/api/chat/stream -H 'Content-Type: application/json' --cookie 'token=...' -d '{"chatId":"test","message":"hello"}' \| head -1` | `event: text-start` lub `event: text-delta` | |
| 4.S2 | Sprawdź event text-delta | Ten sam strumień, drugi event | `data: {"text":"Echo: hello"}` | |
| 4.S3 | Sprawdź event finish | Ten sam strumień, ostatni event | `event: finish`, `data: {"finish_reason":"stop"}` | |
| 4.S4 | Sprawdź terminator | Koniec strumienia | `data: [DONE]` | |
| 4.S5 | Sprawdź `Content-Type` | Nagłówek odpowiedzi | `text/event-stream` | |
| 4.S6 | Wyślij stream z `chatId` i sprawdź czy jest w eventach | Eventy zawierają `chatId` w data | Zgodność | |

---

## 5. Gems (Projekty)

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 5.1 | Kliknij "Gems" | Lista gemów jako karty | |
| 5.2 | Brak gemów | "Create your first gem" | |
| 5.3 | Kliknij "New Gem" | Formularz: name, description, instructions | |
| 5.4 | Utwórz "General" | Nowy gem na liście | |
| 5.5 | Utwórz "Development" | Oba widoczne | |
| 5.6 | Kliknij w kartę | `/chat?project={id}` | |
| 5.7 | Kliknij "Edit" | Formularz edycji (pre-filled) | |
| 5.8 | Kliknij "Delete" | Gem usunięty | |
| 5.9 | Utwórz gema z pustą nazwą | Błąd walidacji | |
| 5.10 | Utwórz gema z bardzo długą nazwą (>100 znaków) | Błąd lub przycięcie | |

---

## 6. Vault

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 6.1 | Kliknij "Vault" | Tabela plików + Upload | |
| 6.2 | Brak plików | "No files uploaded yet" | |
| 6.3 | Upload .txt | Plik w tabeli | |
| 6.4 | Upload .png | Plik z ikoną Image | |
| 6.5 | Upload .pdf | Plik z ikoną FileText | |
| 6.6 | Upload nieznany format (.xyz) | Plik z ikoną File | |
| 6.7 | Upload wiele plików naraz (multi-select) | Wszystkie w tabeli | |
| 6.8 | Wyszukaj po nazwie | Tabela filtruje się live | |
| 6.9 | Kliknij "Download" | Plik pobiera się z poprawną nazwą | |
| 6.10 | Kliknij "Delete" | Plik znika z tabeli | |
| 6.11 | Upload >100MB | Błąd: limit przekroczony | |

---

## 7. Admin (Extension Requests)

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 7.1 | Kliknij "Admin" | Lista requestów | |
| 7.2 | Brak requestów | "No extension requests" | |
| 7.3 | Kliknij filtr "Pending" | Tylko pending | |
| 7.4 | Kliknij filtr "Approved" | Tylko approved | |
| 7.5 | Kliknij filtr "Rejected" | Tylko rejected | |
| 7.6 | Kliknij "All" | Wszystkie | |
| 7.7 | Approve pending request | Status → approved (UI) | |
| 7.8 | Reject pending request | Status → rejected (UI) | |
| 7.9 | Zmień filtr po approve/reject | Stan zachowany | |

---

## 8. Extensions (Pi Agent — 4 narzędzia)

| # | Test | Komenda / krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 8.1 | Sprawdź czy narzędzia są zarejestrowane | `GET http://localhost:4000/api/extensions` lub log agenta przy starcie | 4 narzędzia: web_search, vision, document_gen, memory | |
| 8.2 | web_search — zapytanie | Wyślij wiadomość "search for latest news" | Agent odpowiada z wynikami wyszukiwania | |
| 8.3 | web_search — pusty query | Wyślij "search for ''" | Obsługa błędu, nie crash | |
| 8.4 | web_search — timeout | Wyślij gdy brak internetu | Komunikat błędu, graceful handling | |

### Memory — pełny cykl życia

| # | Test | Komenda / krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 8.M1 | Store | "remember that my name is John" | Potwierdzenie: stored | |
| 8.M2 | Retrieve | "what is my name?" | "John" | |
| 8.M3 | List | "list all memories" | Lista kluczy | |
| 8.M4 | Delete | "delete my name from memory" | Potwierdzenie: deleted | |
| 8.M5 | Retrieve after delete | "what is my name?" | "No memory found" | |
| 8.M6 | Store wartość specjalną (Unicode) | "remember 'π = 3.14159'" | Przechowane i zwrócone poprawnie | |
| 8.M7 | Store pustą wartość | "remember ''" | Odrzucone (walidacja) | |

### Vision

| # | Test | Komenda / krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 8.V1 | Analyze image URL | "describe this image: https://example.com/photo.jpg" | Odpowiada URL + prompt | |
| 8.V2 | Nieprawidłowy URL | "describe this image: not-a-url" | Błąd walidacji (Zod) | |

### Document Gen

| # | Test | Komenda / krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 8.D1 | Generuj dokument | "generate a report titled Q1 with content 'Revenue grew 20%'" | Markdown z tytułem, typem, datą, treścią | |
| 8.D2 | Typ: summary | "generate a summary titled X" | `Type: summary` w dokumencie | |
| 8.D3 | Z tagami | "generate a note with tags dev, test" | `Tags: dev, test` w dokumencie | |
| 8.D4 | Pusty tytuł | "generate a report with empty title" | Błąd walidacji | |

---

## 9. Bezpieczeństwo

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 9.1 | CSRF — login POST z devtools bez tokena | 403 CSRF validation failed | |
| 9.2 | CSRF — chat proxy POST z devtools bez tokena | 403 CSRF validation failed | |
| 9.3 | CSRF — register POST z devtools bez tokena | 403 | |
| 9.4 | CSRF — logout POST z devtools bez tokena | 403 | |
| 9.5 | Zaloguj się, DevTools → Application → sprawdź `token` | httpOnly: true, SameSite: Strict, Secure: true (w prod) | |
| 9.6 | Sprawdź `csrf-token` cookie | httpOnly: false (musi być czytane przez JS), SameSite: Strict | |
| 9.7 | Bez ciasteczka → GET `/api/auth/me` | 401 | |
| 9.8 | Bez ciasteczka → POST `/api/chat/stream` | 401 | |
| 9.9 | Rate limit: 31 requestów POST `/api/chat/stream` w <60s | #31 → 429 Rate limit exceeded | |
| 9.10 | Rate limit: odczekaj 60s, wyślij request | 200 OK (limit zresetowany) | |
| 9.11 | Rate limit: czy per-user? User A = 30 req, User B = 30 req równolegle | Oba dostają 200 (izolacja per-user) | |
| 9.12 | Wyślij XSS w message: `<script>alert(1)</script>` | Odpowiedź z encodowanym: `&lt;script&gt;alert(1)&lt;/script&gt;` | |
| 9.13 | Wyślij SQL injection w message: `' OR 1=1; --` | Bezpiecznie wyświetlone, brak SQL injection | |
| 9.14 | Zmień `JWT_SECRET` w .env, odśwież stronę | Istniejące sesje unieważnione (nowy secret = nowy podpis) | |

---

## 10. Edge Cases

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 10.1 | Unicode w message: `你好世界 😀` | Wyświetlone poprawnie (UTF-8) | |
| 10.2 | Bardzo długa nazwa użytkownika (500 znaków) | Przycięta lub błąd walidacji | |
| 10.3 | Email z plusem: `user+tag@example.com` | Zaakceptowany i zarejestrowany | |
| 10.4 | Wyślij message >10KB | Odrzucone (walidacja na agent/routes/chat.ts) | |
| 10.5 | 5 równoczesnych requestów do `/api/chat/stream` | Wszystkie 5 obsłużone (kolejkowo lub równolegle) | |
| 10.6 | Wyślij request z `Content-Type: text/plain` (zły format) | 400 Bad Request | |
| 10.7 | JSON z dodatkowymi polami: `{"chatId":"x","message":"y","extra":"z"}` | Dodatkowe pole ignorowane, 200 OK | |
| 10.8 | Otwórz `/non-existent-route` | Strona 404 (Next.js not-found) | |
| 10.9 | Zaimportuj ciasteczko `token` z innej sesji (replay) | 401 (jeśli JWT wygasł lub secret inny) | |

---

## 11. Obsługa błędów

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 11.1 | Zatrzymaj Router LLM, wyślij message w chacie | Komunikat błędu, appka nie crashuje | |
| 11.2 | Zatrzymaj Pi Agent (:4000), wyślij message | 502 Upstream error | |
| 11.3 | Odśwież stronę podczas streamowania | Stream przerwany, bez crasha | |
| 11.4 | Otwórz 2 karty → wyloguj w jednej → kliknij w drugiej | Przekierowanie na login | |
| 11.5 | Wyślij niepoprawny JSON do API (`{bad json`) | 400 Bad Request | |
| 11.6 | Usuń bazę danych (DROP TABLE), odśwież stronę | 500 Internal Server Error (bez stack trace w odpowiedzi) | |

---

## 12. Accessibility

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 12.1 | Tab przez login page | Focus widoczny: email → password → submit → link register | |
| 12.2 | Enter na przycisku "Sign In" | Formularz wysłany | |
| 12.3 | Tab przez chat input | Focus na textarea → send → stop → sidebar links | |
| 12.4 | Komunikat błędu logowania | `role="alert"` lub `aria-live="polite"`, screen reader odczyta | |
| 12.5 | Obrazki/ikony w sidebarze i na stronach | `aria-label` na przyciskach bez tekstu (Delete, Edit, Upload) | |
| 12.6 | Sprawdź kontrast kolorów (DevTools → Rendering → Contrast) | Tekst na tle: ratio ≥4.5:1 (normalny), ≥3:1 (duży) | |
| 12.7 | Nawiguj po gems bez myszki (tylko klawiatura) | Wszystkie akcje dostępne: lista → kart → edit → delete | |
| 12.8 | Screen reader (NVDA/VoiceOver): odczytaj stronę chat | "Chat heading. Messages list. Input textarea. Send button." | |

---

## 13. Wydajność

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 13.1 | Lighthouse na `/chat` (Incognito) | Performance ≥80, Accessibility ≥90 | |
| 13.2 | Lighthouse na `/auth/login` | Performance ≥90 (strona statyczna) | |
| 13.3 | FCP (First Contentful Paint) | <1.5s | |
| 13.4 | LCP (Largest Contentful Paint) | <2.5s | |
| 13.5 | Przejście gems → vault → admin → chat | Bez pełnego reloadu (soft navigation) | |
| 13.6 | Pierwszy token odpowiedzi w chacie | <3s (zależy od Router LLM) | |
| 13.7 | Rozmiar JS bundle (First Load JS) | `/chat`: <200 kB, inne: <120 kB | |

---

## 14. Dane trwałe

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 14.1 | Uruchom seed, zrestartuj appkę, zaloguj się seedowanym userem | `admin@ubek.ai` / `admin123` działa | |
| 14.2 | Po reseedzie dane są czyste (brak duplikatów) | `db:seed` = upsert, nie ma "already exists" | |
| 14.3 | Utwórz gema, zrestartuj appkę | Gem nadal istnieje (persystencja w DB) | |
| 14.4 | Dane usera A nie są widoczne dla usera B | Każdy user widzi tylko swoje gemy/vault | |

---

## Uwagi dla testera

- **Bug → zgłoś z:**
  - krokiem do reprodukcji
  - oczekiwanym vs rzeczywistym rezultatem
  - URL i screenshotem
  - konsolą błędów (F12 → Console)
  - nagłówkami requestu (F12 → Network)
- **Priorytety:**
  - P1: critical (logowanie, chat, dostęp do danych)
  - P2: high (główne funkcje działają ale z błędami)
  - P3: medium (działa ale UX cierpi)
  - P4: low (kosmetyka)
- **Środowisko:** testuj na czystej przeglądarce (Incognito/Private) po reseedzie
- **Automatyzacja:** testy 1.A1-1.A4, 2.A1-2.A6, 3.M1-3.M5, 4.S1-4.S6 można zautomatyzować skryptem bash
