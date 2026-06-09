# UBEK Next — Kompleksowa Lista Kontrolna QA

> **Wersja:** 2.0
> **Przeznaczenie:** Tester ręczny (QA) — krok po kroku weryfikacja pełnej funkcjonalności aplikacji z perspektywy użytkownika i administratora.
> **Opracowano na podstawie:** `docs/01-PRD.md`, `docs/02-ARCHITECTURE.md`, `docs/03-USER-WORKFLOWS.md`, `CONTEXT.md`, `IMPLEMENTATION-PLAN.md`, `PENDING.md`

---

## Spis treści

1. [Konfiguracja wstępna środowiska](#1-konfiguracja-wstępna-środowiska)
2. [Perspektywa Użytkownika](#2-perspektywa-użytkownika)
   - 2.1 Rejestracja
   - 2.2 Logowanie i wylogowanie
   - 2.3 Dashboard / Layout
   - 2.4 Chat — podstawowe scenario
   - 2.5 Chat — narzędzia (Tools)
   - 2.6 Projekty (Gems)
   - 2.7 Vault / Pliki
   - 2.8 RAG / Knowledge Base
   - 2.9 Deep Research
   - 2.10 Historia rozmów
   - 2.11 Extension Request
3. [Perspektywa Administratora](#3-perspektywa-administratora)
   - 3.1 Admin Dashboard
   - 3.2 Agent Monitor
   - 3.3 Extension Manager
   - 3.4 Extension Requests Queue
   - 3.5 Personality Config (SKILL.md per user)
   - 3.6 User Management
   - 3.7 Budowanie i przypisywanie extensionu
4. [Narzędzia (Core Extensions) — szczegółowe scenariusze](#4-narzędzia-core-extensions--szczegółowe-scenariusze)
   - 4.1 Web Search
   - 4.2 Memory
   - 4.3 Vision
   - 4.4 Document Gen (PDF/DOCX/XLSX/MD)
5. [Scenariusze błędów i odzyskiwania](#5-scenariusze-błędów-i-odzyskiwania)
6. [Bezpieczeństwo](#6-bezpieczeństwo)
7. [Wydajność](#7-wydajność)
8. [Accessibility / Dostępność](#8-accessibility--dostępność)
9. [Testy wydajnościowe pod obciążeniem](#9-testy-wydajnościowe-pod-obciążeniem)
10. [Scenariusze Failover i Disaster Recovery](#10-scenariusze-failover-i-disaster-recovery)
11. [Testy cross-browser i urządzeń mobilnych](#11-testy-cross-browser-i-urządzeń-mobilnych)
12. [RAG — scenariusze zaawansowane i edge case'y](#12-rag--scenariusze-zaawansowane-i-edge-casey)
13. [Długie sesje i stabilność](#13-długie-sesje-i-stabilność)
14. [Testy API — zaawansowane](#14-testy-api--zaawansowane)
15. [Testy danych i migracji](#15-testy-danych-i-migracji)
16. [Testy współbieżności i blokad](#16-testy-współbieżności-i-blokad)
17. [Zgłaszanie błędów — szablon](#17-zgłaszanie-błędów--szablon)

---

## 1. Konfiguracja wstępna środowiska

Przed rozpoczęciem testów wykonaj poniższe kroki:

| # | Krok | Polecenie / działanie | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 1.1 | Skopiuj zmienne środowiskowe | `cp .env.example .env` i wypełnij realnymi wartościami (JWT_SECRET, ROUTER_API_KEY, AGENT_API_KEY, PG_*) | Plik `.env` istnieje z poprawnymi danymi | |
| 1.2 | Uruchom bazę danych | `docker compose up -d` lub lokalny PostgreSQL na porcie 5433 | `psql -h localhost -p 5433 -U ubek -d ubek_next -c "\dt"` pokazuje tabele (lub 0 gdy pierwszy raz) | |
| 1.3 | Wykonaj migrację bazy | `cd next && npm run db:push` | Komunikat: `Success: migrations applied` | |
| 1.4 | Zasiej dane testowe | `cd next && npm run db:seed` | Komunikat: `Seed complete` + użytkownik `admin@ubek.ai` / `admin123` utworzony | |
| 1.5 | Zainstaluj zależności Next.js | `cd next && npm install` | Brak błędów, `node_modules/` istnieje | |
| 1.6 | Zainstaluj zależności Agenta | `cd agent && npm install` | Brak błędów, `node_modules/` istnieje | |
| 1.7 | Uruchom Pi Agent | `cd agent && npm run dev` (lub `npx tsx src/index.ts`) | Log: `Pi Agent listening on port 4000` | |
| 1.8 | Uruchom Next.js | `cd next && npm run dev` | Log: `Local: http://localhost:3000` | |
| 1.9 | Zweryfikuj health endpoint | `curl http://localhost:4000/api/health` | JSON: `{ "status": "ok", "uptime": ... }` | |
| 1.10 | Zweryfikuj Next.js | Otwórz `http://localhost:3000` w przeglądarce (Incognito) | Przekierowanie na `/auth/login` | |
| 1.11 | Sprawdź czy Router LLM działa | `curl http://localhost:18881/health` lub sprawdź log | Endpoint dostępny | |
| 1.12 | Wyczyść dane przed testami | `cd next && npm run db:reset` (jeśli dostępne) lub drop + migrate + seed | Czysta baza z seedem | |

> **⚠️ Uwaga:** Testuj w **Incognito/Private** po każdym reseedzie. Nie mieszaj sesji testowych z własnymi danymi.

---

## 2. Perspektywa Użytkownika

### 2.1 Rejestracja

**Cel:** Weryfikacja, że nowy użytkownik może założyć konto, a walidacja działa poprawnie.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.1.1 | Wejście na stronę rejestracji | Otwórz `/auth/register` | Formularz z polami: Name, Email, Password, Confirm Password + przycisk "Sign Up" + link "Already have an account?" do loginu | |
| 2.1.2 | Pusty formularz | Kliknij "Sign Up" bez wypełniania pól | HTML5 validation: komunikaty "Please fill out this field" przy pustych polach. Formularz nie wysłany. | |
| 2.1.3 | Nieprawidłowy email | Wpisz "test" w email, resztę poprawnie, kliknij Sign Up | Komunikat: "Please include an '@' in the email address" lub walidacja JS | |
| 2.1.4 | Za krótkie hasło (<8 znaków) | Email: `test@test.com`, Hasło: `Ab1!`, Confirm: `Ab1!` | Komunikat: "Password must be at least 8 characters" | |
| 2.1.5 | Hasła nie są zgodne | Hasło: `Test1234!`, Confirm: `Test5678!` | Komunikat: "Passwords do not match" | |
| 2.1.6 | Brak nazwy | Name: puste, Email: `test@test.com`, Hasło: `Test1234!` | Komunikat: "Name is required" | |
| 2.1.7 | Rejestracja — sukces | Name: "Jan Kowalski", Email: `jan@example.com`, Hasło: `Test1234!` | Przekierowanie na `/` (dashboard/chat). Użytkownik zalogowany. | |
| 2.1.8 | Rejestracja duplikatu email | Spróbuj zarejestrować `jan@example.com` ponownie | Komunikat: "Email already exists" lub 409 Conflict. Użytkownik pozostaje na stronie rejestracji. | |
| 2.1.9 | Rejestracja drugiego użytkownika | Name: "Anna Nowak", Email: `anna@example.com`, Hasło: `Admin123!` | Przekierowanie na `/`. Drugi użytkownik utworzony. | |
| 2.1.10 | Link do loginu | Kliknij "Already have an account? Sign in" | Przekierowanie na `/auth/login` | |
| 2.1.11 | Email z plusem | Email: `user+tag@example.com`, hasło poprawne | Rejestracja udana (RFC 5321 dopuszcza +) | |
| 2.1.12 | Bardzo długa nazwa (500 znaków) | Powtórz 500 razy "A" w name | Walidacja odrzuca (max 255 lub przycięcie do 255) | |

#### API Direct — Rejestracja

| # | Test | Polecenie | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.1.A1 | Brak emaila w body | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"password":"Test1234!","name":"Test"}' -w '\nHTTP_CODE: %{http_code}'` | 400 + `{"error":"Email is required"}` | |
| 2.1.A2 | Za krótkie hasło | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"a@b.com","password":"Ab1!","name":"Test"}'` | 400, błąd walidacji hasła | |
| 2.1.A3 | Poprawna rejestracja | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"api@test.com","password":"ApiTest123!","name":"API User"}'` | 201, `{"user":{"id":"...","email":"api@test.com"}}` + Set-Cookie z tokenem | |
| 2.1.A4 | Duplikat | Powtórz 2.1.A3 | 409 Conflict | |
| 2.1.A5 | Content-Type text/plain | `curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: text/plain' -d 'niejson'` | 400 Bad Request | |

---

### 2.2 Logowanie i wylogowanie

**Cel:** Użytkownik może się zalogować i wylogować. Obsługa błędnych danych.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.2.1 | Wejście na stronę loginu | Otwórz `/auth/login` | Formularz: email, password + "Sign In" + link "Don't have an account?" | |
| 2.2.2 | Pusty formularz | Kliknij "Sign In" bez danych | Walidacja HTML5: pola wymagane | |
| 2.2.3 | Nieistniejący email | Email: `nobody@example.com`, Hasło: `Test1234!` | Komunikat: "Invalid email or password" (nie mówi co konkretnie jest złe) | |
| 2.2.4 | Złe hasło | Email: `jan@example.com`, Hasło: `WrongPass1!` | Komunikat: "Invalid email or password" (identyczny jak 2.2.3) | |
| 2.2.5 | Logowanie — sukces | Email: `jan@example.com`, Hasło: `Test1234!` | Przekierowanie na `/`. Użytkownik zalogowany. | |
| 2.2.6 | Sprawdź httpOnly cookie | DevTools → Application → Cookies → localhost:3000 | Cookie `token` istnieje, **httpOnly: true**, **SameSite: Strict**, **Secure: true** (w produkcji) | |
| 2.2.7 | Odświeżenie strony | Naciśnij F5 | Nadal zalogowany, dashboard się ładuje | |
| 2.2.8 | Usunięcie cookie | DevTools → usuń `token`, odśwież | Przekierowanie na `/auth/login` | |
| 2.2.9 | Wylogowanie — kliknij "Logout" | W sidebarze lub dropdownie użytkownika kliknij "Logout" | Przekierowanie na `/auth/login`. Cookie wyczyszczone. | |
| 2.2.10 | Back po wylogowaniu | Kliknij "Back" w przeglądarce | Przekierowanie na `/auth/login` (middleware blokuje) | |
| 2.2.11 | Nowa karta po wylogowaniu | Otwórz nową kartę, wpisz `localhost:3000` | Przekierowanie na `/auth/login` | |
| 2.2.12 | Dwie karty — wylogowanie w jednej | Zaloguj się w karcie A i B. Wyloguj w A. W B kliknij dowolny link. | Karta B: przekierowanie na login. | |
| 2.2.13 | Login z CAPS LOCK | Email: `JAN@EXAMPLE.COM`, Hasło: `test1234!` (małe litery zamiast dużych) | 401 — hasło rozróżnia wielkość liter | |
| 2.2.14 | Login po resecie hasła (faza 2) | Jeśli zaimplementowano reset hasła | Działa z nowym hasłem, stare nie działa | |

#### API Direct — Logowanie

| # | Test | Polecenie | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.2.A1 | Brak emaila | `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"password":"x"}' -w '\nHTTP: %{http_code}'` | 400 | |
| 2.2.A2 | Złe hasło | `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"jan@example.com","password":"WrongPass1!"}'` | 401, `{"error":"Invalid credentials"}` | |
| 2.2.A3 | Poprawny login | `curl -s -D - -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"jan@example.com","password":"Test1234!"}'` | 200 + Set-Cookie z `token=httpOnly; Path=/; SameSite=Strict` | |
| 2.2.A4 | Me — bez cookie | `curl -s -w '\nHTTP: %{http_code}' http://localhost:3000/api/auth/me` | 401 Unauthorized | |
| 2.2.A5 | Me — z cookie | `curl -s --cookie 'token=...' http://localhost:3000/api/auth/me` | 200, `{"user":{"id":"...","email":"jan@example.com","role":"user"}}` | |
| 2.2.A6 | Logout — z cookie | `curl -s -X POST http://localhost:3000/api/auth/logout --cookie 'token=...' -w '\nHTTP: %{http_code}'` | 200, Set-Cookie: `token=; Max-Age=0` (cookie wyczyszczone) | |
| 2.2.A7 | Me — po logout | `curl -s --cookie 'token=...' http://localhost:3000/api/auth/me` | 401 (cookie nieważne) | |

---

### 2.3 Dashboard / Layout

**Cel:** Po zalogowaniu użytkownik widzi kompletny dashboard z nawigacją.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.3.1 | Sidebar — elementy | Po zalogowaniu sprawdź lewy panel | Sidebar zawiera: logo "UBEK", "New Chat", lista projektów (gems), sekcje nawigacyjne, user info na dole + logout | |
| 2.3.2 | Sidebar — nowa rozmowa | Kliknij "New Chat" | Przekierowanie na `/chat` lub wyczyszczenie obecnego czatu | |
| 2.3.3 | Sidebar — projekty | Lista projektów (gems) wyświetla się pod "New Chat" | Domyślny gem "General" (lub z seeda) widoczny | |
| 2.3.4 | Sidebar — zwijanie | Kliknij toggle sidebar (hamburger lub ikona) | Sidebar zwija się do ikon, rozszerza po kliknięciu | |
| 2.3.5 | Topbar — wyświetlanie | Górny pasek | Nazwa strony (np. "Chat"), ikona użytkownika z dropdown menu | |
| 2.3.6 | Topbar — dropdown usera | Kliknij awatar/nazwę użytkownika w topbar | Dropdown: email, rola, "Settings", "Logout" | |
| 2.3.7 | Breadcrumbs lub tytuł strony | Przejdź do `/vault` | Topbar pokazuje "Vault" lub odpowiednią ścieżkę | |
| 2.3.8 | Responsywność — wąskie okno | Zmniejsz szerokość okna do <768px | Sidebar automatycznie się chowa, pojawia się hamburger menu | |
| 2.3.9 | Dostęp do chronionych stron | Po zalogowaniu wpisz w URL: `/chat`, `/gems`, `/vault`, `/settings` | Każda strona ładuje się poprawnie (200) | |
| 2.3.10 | Dostęp do `/admin` dla usera | Użytkownik z role="user" wpisuje `/admin` | 403 Forbidden lub przekierowanie (brak dostępu) | |

#### Middleware redirect (curl)

| # | Test | Polecenie | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.3.M1 | Niezalogowany → `/` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` | 302 (redirect do `/auth/login`) | |
| 2.3.M2 | Niezalogowany → `/chat` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/chat` | 302 | |
| 2.3.M3 | Niezalogowany → `/api/chat/stream` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/chat/stream` | 302 (middleware) lub 401 (route) | |
| 2.3.M4 | Zalogowany → `/auth/login` | `curl -s --cookie 'token=...' -o /dev/null -w '%{http_code}' http://localhost:3000/auth/login` | 302 (redirect do `/`) | |
| 2.3.M5 | Zalogowany → `/chat` | `curl -s --cookie 'token=...' -o /dev/null -w '%{http_code}' http://localhost:3000/chat` | 200 | |
| 2.3.M6 | Niezalogowany → `/api/health` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health` | 200 (publiczny endpoint) | |
| 2.3.M7 | Nieznajoma ścieżka | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/non-existent` | 404 | |

---

### 2.4 Chat — podstawowy scenariusz

**Cel:** Użytkownik może prowadzić rozmowę z agentem.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.4.1 | Pusty czat | Wejdź na `/chat` (nowa rozmowa) | Pusta konwersacja z placeholder: "Start a conversation" lub "Ask me anything" | |
| 2.4.2 | Wysłanie wiadomości | Wpisz "Cześć! Kim jesteś?" i naciśnij Enter | Wiadomość użytkownika pojawia się po prawej (lub jako user bubble). Agent zaczyna odpowiadać. | |
| 2.4.3 | Streamowanie odpowiedzi | Obserwuj odpowiedź agenta | Tekst pojawia się stopniowo (streaming). Widać shimmer/kursor podczas generowania. | |
| 2.4.4 | Pełna odpowiedź | Poczekaj na zakończenie odpowiedzi | Pełny tekst odpowiedzi. Brak shimmera. Brak "..." w środku. | |
| 2.4.5 | Wysyłanie follow-up | Napisz "Co potrafisz?" jako kolejną wiadomość | Agent odpowiada w kontekście poprzedniej rozmowy | |
| 2.4.6 | Długa wiadomość (>500 znaków) | Wyślij wiadomość z długim tekstem | Wiadomość wysłana, scroll automatycznie w dół | |
| 2.4.7 | Wysyłanie pustej wiadomości | Kliknij Enter bez wpisywania tekstu | Przycisk wysyłania jest disabled. Nic się nie dzieje. | |
| 2.4.8 | Shift+Enter | Wpisz tekst i naciśnij Shift+Enter | Nowa linia w polu tekstowym (nie wysyła) | |
| 2.4.9 | Stop podczas odpowiedzi | Wyślij wiadomość, w trakcie odpowiedzi kliknij "Stop" | Stream przerwany. Częściowa odpowiedź pozostaje widoczna. | |
| 2.4.10 | Regenerate | Po otrzymaniu odpowiedzi kliknij "Regenerate" (ikonka) | Nowa odpowiedź generowana. Poprzednia zastąpiona. | |
| 2.4.11 | Kopiowanie odpowiedzi | Kliknij ikonkę "Copy" na odpowiedzi agenta | Tekst skopiowany do schowka. Krótki toast "Copied!" | |
| 2.4.12 | Kopiowanie odpowiedzi — user | Kliknij "Copy" na swojej wiadomości | Tekst skopiowany | |
| 2.4.13 | Obsługa znaków specjalnych | Wyślij: `<b>test</b>`, `alert(1)`, `' OR 1=1--` | Wyświetlone jako czysty tekst (escape'owane), nie wykonane jako HTML/JS | |
| 2.4.14 | Unicode / Emoji | Wyślij: `Cześć 👋 Jak się masz? 你好世界 😀` | Wyświetlone poprawnie (UTF-8). Emoji widać. | |
| 2.4.15 | Odświeżenie strony w trakcie streama | Wyślij wiadomość, w trakcie odpowiedzi odśwież (F5) | Stream przerwany. Po odświeżeniu poprzednie wiadomości są zachowane (zapisane w DB). | |

#### Scenariusz: Rozmowa ciągła (kontekst)

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.4.C1 | Ustal fakt w rozmowie | "Mam na imię Jan. Pracuję w firmie XYZ." | Agent potwierdza: "Cześć Jan! Miło Cię poznać." | |
| 2.4.C2 | Zapytaj o fakt | "Jak mam na imię?" | "Jan" (lub odwołanie do wcześniejszej wzmianki) | |
| 2.4.C3 | Zmień temat | "Opowiedz mi o Pythonie" | Agent przełącza się na nowy temat | |
| 2.4.C4 | Wróć do poprzedniego tematu | "Wracając do mojej firmy..." | Agent pamięta kontekst z C1 | |

#### Scenariusz: Wielowątkowość (jeśli obsługiwane)

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.4.T1 | Otwórz 2 karty z czatem | Karta A: "Projekt A", Karta B: "Projekt B" (lub różne sesje) | Każda rozmowa ma osobny kontekst | |
| 2.4.T2 | Wyślij wiadomość w karcie A | "Pamiętasz co mówiłem o projekcie A?" | Agent A pamięta swoją rozmowę | |
| 2.4.T3 | Wyślij wiadomość w karcie B | "O czym rozmawialiśmy?" | Agent B ma inny kontekst (nie wie o projekcie A) | |

---

### 2.5 Chat — narzędzia (Tools)

**Cel:** Agent może korzystać z narzędzi (web search, memory, vision, document gen) w odpowiedziach.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.5.1 | Web Search — podstawowy | "Znajdź najnowsze wiadomości o AI" | Agent wywołuje `web_search` i zwraca wyniki z cytatami/źródłami | |
| 2.5.2 | Web Search — widoczność narzędzia | W trakcie odpowiedzi zobacz tool call | AI Elements Tool component pokazuje: wejście (query), wyjście (wyniki) | |
| 2.5.3 | Web Search — źródła | Odpowiedź zawiera linki | AI Elements Sources + InlineCitation wyświetlają źródła | |
| 2.5.4 | Web Search — puste wyniki | "Znajdź: asdfghjkl12345" (losowy ciąg) | Agent informuje: "Nie znaleziono wyników" — brak crasha | |
| 2.5.5 | Memory — zapamiętaj | "Zapamiętaj, że mam na imię Jan" | Agent potwierdza: "Zapamiętane!" | |
| 2.5.6 | Memory — odczytaj | "Jak mam na imię?" | "Masz na imię Jan" (z memory, nie tylko z kontekstu rozmowy) | |
| 2.5.7 | Memory — lista | "Wymień wszystko co o mnie wiesz" | Agent wypisuje zapamiętane fakty | |
| 2.5.8 | Memory — usuń | "Usuń fakt o moim imieniu z pamięci" | Potwierdzenie usunięcia. Następne pytanie: "Nie wiem" | |
| 2.5.9 | Memory — cross-session | Wyloguj, zaloguj ponownie, zapytaj "Jak mam na imię?" | Agent pamięta z poprzedniej sesji | |
| 2.5.10 | Memory — Unicode | "Zapamiętaj π = 3.14159" i "Zapamiętaj że lubię kawę ☕" | Oba przechowane i zwrócone poprawnie | |
| 2.5.11 | Vision — URL obrazka | Prześlij URL obrazka i zapytaj "Co przedstawia to zdjęcie?" | Agent odpowiada (nawet jeśli stub — informuje o ograniczeniach) | |
| 2.5.12 | Vision — upload pliku | Prześlij obrazek przez PromptInput (attach) | Plik przesłany, agent analizuje | |
| 2.5.13 | Document Gen — Markdown | "Wygeneruj dokument w markdown z listą zadań na dziś" | Agent generuje plik .md, zapisuje go w Vault, odpowiada linkiem | |
| 2.5.14 | Document Gen — PDF | "Wygeneruj raport w PDF z analizy konkurencji" | Agent generuje PDF, zapisuje w Vault, odpowiada linkiem | |
| 2.5.15 | Document Gen — DOCX | "Wygeneruj umowę w DOCX" | Generuje DOCX, zapisuje w Vault | |
| 2.5.16 | Document Gen — XLSX | "Wygeneruj arkusz kalkulacyjny XLSX z budżetem" | Generuje XLSX, zapisuje w Vault | |
| 2.5.17 | Document Gen — błąd formatu | "Wygeneruj dokument w formacie nonexistent" | Agent informuje o braku wsparcia, nie crashuje | |
| 2.5.18 | Multi-tool | "Znajdź informacje o konkurencji, zapamiętaj je, i wygeneruj raport PDF" | Agent wykonuje sekwencję: web_search → memory → document_gen. Każdy tool widoczny w UI. | |
| 2.5.19 | Tool z błędem | Agent wywołuje tool który rzuca błąd | Tool component pokazuje błąd (isError: true). Agent kontynuuje bez crasha. | |
| 2.5.20 | Reasoning (jeśli wspierane) | "Rozwiąż krok po kroku: 24 * 37 + 15" | Agent pokazuje chain-of-thought w AI Elements Reasoning component | |

---

### 2.6 Projekty (Gems)

**Cel:** Użytkownik może tworzyć, edytować i przełączać projekty (osobne przestrzenie robocze).

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.6.1 | Strona gems | Kliknij "Gems" w sidebarze lub otwórz `/gems` | Lista projektów jako karty/lista | |
| 2.6.2 | Brak projektów | Nowy użytkownik, pierwszy raz na `/gems` | "Create your first gem" lub "No projects yet" z przyciskiem "New Gem" | |
| 2.6.3 | Tworzenie projektu | Kliknij "New Gem" | Formularz: name (wymagane), description (opcjonalne), instructions (opcjonalne) | |
| 2.6.4 | Utwórz "General" | Name: "General", Instructions: "Jesteś pomocnym asystentem" | Projekt utworzony. Przekierowanie na `/gems` lub `/chat?project=ID` | |
| 2.6.5 | Utwórz drugi projekt | Name: "Development", Instructions: "Jesteś ekspertem TypeScript" | Oba projekty widoczne na liście | |
| 2.6.6 | Walidacja — pusta nazwa | Kliknij "Save" z pustą nazwą | Błąd: "Name is required" | |
| 2.6.7 | Walidacja — za długa nazwa | Wpisz 200 znaków w name | Błąd: "Name too long" lub przycięcie | |
| 2.6.8 | Instrukcje — system prompt | W instructions wpisz: "Odpowiadasz tylko po angielsku" | W rozmowie w tym projekcie agent mówi po angielsku | |
| 2.6.9 | Przełączanie projektu | Kliknij inny projekt w sidebarze | Aktywny projekt zmienia się. Czat przeładowuje się dla nowego projektu. | |
| 2.6.10 | Edycja projektu | Kliknij "Edit" na karcie projektu | Formularz pre-filled. Zmień nazwę na "General V2", zapisz. | Nazwa zaktualizowana na liście | |
| 2.6.11 | Usuwanie projektu | Kliknij "Delete" na karcie projektu | Potwierdzenie: "Are you sure?" → Tak → Projekt usunięty. Znika z listy. | |
| 2.6.12 | Projekty nie mieszają się | W projekcie A: "Zapamiętaj kolor: niebieski". Przełącz do projektu B: "Jaki to kolor?" | Projekt B nie zna koloru z projektu A (izolacja) | |
| 2.6.13 | Projekt a vault | W projekcie A przejdź do vault | Pliki są filtrowane po projekcie A (lub widoczne wszystkie — zależy od implementacji) | |

#### Scenariusz: Projekt z instrukcjami

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.6.S1 | Utwórz projekt "Prawnik" | Instructions: "Jesteś prawnikiem. Odpowiadasz formalnie, cytujesz przepisy." | Agent mówi formalnie, cytuje przepisy | |
| 2.6.S2 | Utwórz projekt "Pisarz" | Instructions: "Jesteś kreatywnym pisarzem. Odpowiadasz poetycko." | Agent zmienia styl po przełączeniu | |
| 2.6.S3 | Szybkie przełączanie | Przełączaj się między "Prawnik" a "Pisarz" 5 razy | Każde przełączenie zmienia kontekst. Brak opóźnień >2s. | |

---

### 2.7 Vault / Pliki

**Cel:** Użytkownik może przeglądać, przesyłać, pobierać i usuwać pliki.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.7.1 | Strona vault | Otwórz `/vault` | Tabela/list plików z kolumnami: nazwa, rozmiar, typ, data, akcje | |
| 2.7.2 | Brak plików | Nowy użytkownik | "No files uploaded yet" z przyciskiem "Upload" | |
| 2.7.3 | Upload pliku .txt | Kliknij "Upload" → wybierz `test.txt` (treść: "Hello World") | Plik pojawia się w tabeli. Nazwa, rozmiar, typ "text/plain" widoczne. | |
| 2.7.4 | Upload pliku .png | Wybierz `image.png` (mały obrazek) | Plik w tabeli z ikoną Image. | |
| 2.7.5 | Upload pliku .pdf | Wybierz `document.pdf` | Plik w tabeli z ikoną PDF/FileText. | |
| 2.7.6 | Upload wielu plików | Zaznacz 3 pliki naraz (multi-select) | Wszystkie 3 w tabeli. | |
| 2.7.7 | Upload drag & drop | Przeciągnij plik na strefę uploadu | Plik zaakceptowany, pojawia się w tabeli. | |
| 2.7.8 | Upload >100MB | Wybierz plik >100MB | Błąd: "File size exceeds 100MB limit" | |
| 2.7.9 | Upload nieprawidłowy typ | Wybierz `.exe` lub `.bat` | Odrzucone (jeśli implementacja blokuje) lub zaakceptowane z ostrzeżeniem | |
| 2.7.10 | Wyszukiwanie plików | Wpisz fragment nazwy w search box | Tabela filtruje się live, tylko pasujące pliki widoczne | |
| 2.7.11 | Pobieranie pliku | Kliknij "Download" na pliku | Plik pobiera się z oryginalną nazwą i poprawną zawartością | |
| 2.7.12 | Usuwanie pliku | Kliknij "Delete" na pliku | Plik znika z tabeli (soft-delete lub hard-delete) | |
| 2.7.13 | Podgląd — tekst | Kliknij w plik .txt | Podgląd treści w modal/panel | |
| 2.7.14 | Podgląd — obrazek | Kliknij w .png | Podgląd obrazka w modal/panel | |
| 2.7.15 | Podgląd — PDF | Kliknij w .pdf | Podgląd PDF (wbudowany viewer lub iframe) | |
| 2.7.16 | Foldery — tworzenie | Kliknij "New Folder", nazwa "Documents" | Folder pojawia się w vault | |
| 2.7.17 | Foldery — przenoszenie | Przeciągnij plik do folderu "Documents" | Plik przeniesiony, widoczny po wejściu w folder | |
| 2.7.18 | Foldery — nawigacja | Kliknij w folder "Documents" | Widok wewnątrz folderu. Breadcrumb: Vault > Documents | |
| 2.7.19 | Powrót z folderu | Kliknij "Vault" w breadcrumb | Powrót do głównego widoku | |

---

### 2.8 RAG / Knowledge Base

**Cel:** Agent może przeszukiwać dokumenty w projekcie i odpowiadać z cytowaniem źródła.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.8.1 | Dodaj dokument do projektu | W projekcie "General" prześlij plik `umowa.pdf` lub `instrukcja.txt` z konkretną treścią | Plik dodany do projektu. Agent powinien go przetworzyć. | |
| 2.8.2 | Zapytanie o dokument | "Co było napisane w umowie?" (po chwili na przetworzenie) | Agent odpowiada na podstawie dokumentu, cytuje fragment | |
| 2.8.3 | Źródła w odpowiedzi | Odpowiedź agenta zawiera cytaty | AI Elements Sources + InlineCitation pokazują źródło (nazwa pliku, fragment) | |
| 2.8.4 | Dokument tylko w projekcie A | W projekcie A: prześlij "Projekt A jest super". W projekcie B: "O czym jest projekt A?" | Projekt B nie wie o dokumencie z projektu A | |
| 2.8.5 | Wiele dokumentów | Prześlij 3 dokumenty o różnych tematach. Zapytaj o każdy. | Agent odpowiada poprawnie dla każdego, cytuje właściwe źródła. | |
| 2.8.6 | Re-chunk po zmianie dokumentu | Usuń dokument, dodaj nową wersję. Zapytaj o treść. | Agent widzi nową wersję, nie starą. | |

---

### 2.9 Deep Research

**Cel:** Użytkownik może uruchomić wieloetapowy research.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.9.1 | Uruchom Deep Research | "Zbadaj rynek konkurencji dla małych firm w Polsce" | Agent tworzy plan researchu widoczny w AI Elements Plan | |
| 2.9.2 | Plan researchu | Agent pokazuje kroki | Plan: [konkurenci, ceny, opinie, trendy] z checkboxami | |
| 2.9.3 | Wykonanie kroków | Agent wykonuje każdy krok z osobna | AI Elements Task: każdy krok ma status (pending → running → done) | |
| 2.9.4 | Źródła w raporcie | Końcowy raport zawiera źródła | Sources + InlineCitation wyświetlają źródła dla każdego kroku | |
| 2.9.5 | Eksport raportu | Kliknij "Export" → "PDF" | Raport generowany jako PDF, zapisany w Vault, link do pobrania | |
| 2.9.6 | Eksport — Markdown | Kliknij "Export" → "Markdown" | Plik .md zapisany w Vault | |
| 2.9.7 | Przerwanie researchu | Kliknij "Stop" podczas trwania researchu | Research przerwany. Częściowe wyniki widoczne. | |

---

### 2.10 Historia rozmów

**Cel:** Użytkownik może przeglądać poprzednie rozmowy i do nich wracać.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.10.1 | Automatyczne zapisywanie | Przeprowadź rozmowę (minimum 3 wiadomości) | Po zakończeniu streama rozmowa zapisana w DB | |
| 2.10.2 | Lista rozmów | Kliknij "Chat history" w sidebarze (lub ikonkę historii) | Lista poprzednich rozmów z tytułem i datą | |
| 2.10.3 | Tytuł rozmowy | Nowa rozmowa | Tytuł "Nowa rozmowa" automatycznie zmieniony na podstawie pierwszej wiadomości (lub generowany) | |
| 2.10.4 | Otwórz starą rozmowę | Kliknij w rozmowę z listy | Czat ładuje się z poprzednimi wiadomościami. Można kontynuować. | |
| 2.10.5 | Kontynuacja starej rozmowy | Otwórz starą rozmowę, wyślij nową wiadomość | Agent odpowiada w kontekście całej poprzedniej rozmowy | |
| 2.10.6 | Usuwanie rozmowy | Kliknij "Delete" na rozmowie z listy | Rozmowa usunięta z listy | |
| 2.10.7 | Session per project | Rozmowa w projekcie A jest widoczna tylko w projekcie A | Po przełączeniu na projekt B lista rozmów pokazuje tylko rozmowy z B | |
| 2.10.8 | Wiele rozmów w projekcie | Utwórz 5 rozmów w jednym projekcie | Lista pokazuje wszystkie 5. Scroll działa. | |

---

### 2.11 Extension Request

**Cel:** Użytkownik może poprosić o nową funkcjonalność.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 2.11.1 | Poproś o extension w czacie | "Potrzebuję narzędzia do generowania ofert dla klientów" | Agent rozpoznaje intencję i proponuje zgłoszenie requestu | |
| 2.11.2 | Potwierdź zgłoszenie | Agent: "Czy chcesz to zgłosić?" → "Tak" | Tool `ubek_request_extension` wykonany. Potwierdzenie: "Zgłoszono!" | |
| 2.11.3 | Sprawdź status | "Jaki jest status mojego zgłoszenia o extension ofert?" | Agent odpowiada: "Status: pending" (lub inny) | |
| 2.11.4 | Anuluj zgłoszenie | "Anuluj moje zgłoszenie" | Request anulowany/usunięty | |

---

## 3. Perspektywa Administratora

### 3.1 Admin Dashboard

**Cel:** Admin ma dostęp do panelu administracyjnego.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.1.1 | Dostęp do admina | Zaloguj się jako `admin@ubek.ai` / `admin123`, otwórz `/admin` | Strona admin dashboard się ładuje (200). Menu: Monitor, Extensions, Requests, Personality. | |
| 3.1.2 | User nie ma dostępu | Zaloguj się jako `jan@example.com`, otwórz `/admin` | 403 Forbidden lub przekierowanie na `/` | |
| 3.1.3 | Admin sidebar | Admin widzi dodatkowe opcje w sidebarze | "Admin" sekcja z linkami do podstron | |
| 3.1.4 | Overview dashboard | Strona główna admina `/admin` | Statystyki: liczba użytkowników, aktywnych sesji, extensionów, requestów | |

---

### 3.2 Agent Monitor

**Cel:** Admin może monitorować aktywne sesje użytkowników.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.2.1 | Lista sesji | Otwórz `/admin/monitor` lub `/admin/agents` | Lista aktywnych sesji: user, czas trwania, liczba tool calls, model | |
| 3.2.2 | Pusta lista | Gdy nikt nie rozmawia | "No active sessions" | |
| 3.2.3 | Sesja pojawia się | User A rozpoczyna rozmowę, admin odświeża | Sesja usera A widoczna na liście | |
| 3.2.4 | Podgląd sesji | Kliknij w sesję usera A | Szczegóły: ostatnia wiadomość, użyte narzędzia, czas trwania | |
| 3.2.5 | Przerwanie sesji | Kliknij "Terminate" na sesji usera A | Sesja przerwana. User A widzi błąd w czacie. | |
| 3.2.6 | Sesja znika po zakończeniu | User A kończy rozmowę, odśwież monitor | Sesja usera A znika z listy | |
| 3.2.7 | Odświeżanie automatyczne | Monitor odświeża się co 30s | Nowe sesje pojawiają się bez ręcznego odświeżania | |

---

### 3.3 Extension Manager

**Cel:** Admin może zarządzać extensionami (lista, włącz/wyłącz dla userów).

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.3.1 | Lista extensionów | Otwórz `/admin/extensions` | Lista wszystkich extensionów: core + custom. Każdy z: nazwa, opis, wersja, status. | |
| 3.3.2 | Szczegóły extensionu | Kliknij w "web-search" | Szczegóły: manifest (name, description, icon, route, tools[]), tool definition (schema) | |
| 3.3.3 | Przypisanie do usera | Kliknij "Assign" → wybierz usera "Jan Kowalski" | Extension przypisany. User Jan widzi nową zakładkę w sidebarze (jeśli extension ma UI). | |
| 3.3.4 | Odpięcie od usera | Kliknij "Unassign" dla Jana | Zakładka znika z sidebaru Jana | |
| 3.3.5 | Toggle per-project | Przypisz extension do projektu "General" | Extension dostępny tylko w projekcie "General" | |
| 3.3.6 | Nowy extension | Kliknij "New Extension" | Formularz: name, description, icon, czy ma UI. Po zapisie: szablon plików. | |
| 3.3.7 | Builder — tworzenie | Wypełnij formularz dla "Oferty" | Katalog `extensions/offers/` utworzony z `manifest.json`, `tool.ts`, `ui/page.tsx` | |

---

### 3.4 Extension Requests Queue

**Cel:** Admin przegląda zgłoszenia użytkowników i podejmuje akcje.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.4.1 | Lista requestów | Otwórz `/admin/requests` | Lista zgłoszeń: user, tytuł, opis, priorytet, status, data | |
| 3.4.2 | Filtrowanie | Kliknij "Pending" | Tylko zgłoszenia ze statusem "pending" | |
| 3.4.3 | Filtrowanie — "Approved" | Kliknij "Approved" | Tylko approved | |
| 3.4.4 | Filtrowanie — "Rejected" | Kliknij "Rejected" | Tylko rejected | |
| 3.4.5 | Filtrowanie — "All" | Kliknij "All" | Wszystkie (reset) | |
| 3.4.6 | Zatwierdź request | Kliknij "Approve" na zgłoszeniu "Oferty" | Status → "approved". Admin może dodać notatkę. | |
| 3.4.7 | Odrzuć request | Kliknij "Reject" na innym zgłoszeniu | Status → "rejected". Admin wpisuje powód. | |
| 3.4.8 | Build extension z requestu | Kliknij "Build Extension" na zatwierdzonym requeste | Otwiera Extension Builder z pre-filled danymi (tytuł, opis) | |
| 3.4.9 | Zmiana priorytetu | Kliknij "Edit" → zmień priority na "high" | Priorytet zmieniony | |
| 3.4.10 | Notatka admina | Kliknij "Edit" → dodaj notatkę "Do zrobienia w przyszłym tygodniu" | Notatka zapisana, widoczna w szczegółach | |

---

### 3.5 Personality Config (SKILL.md per user)

**Cel:** Admin może konfigurować system prompt dla każdego użytkownika.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.5.1 | Lista userów | Otwórz `/admin/personality` | Lista użytkowników z obecnym SKILL.md | |
| 3.5.2 | Edycja SKILL.md | Kliknij "Edit" przy userze "Jan Kowalski" | Edytor tekstowy z obecnym SKILL.md (lub domyślnym) | |
| 3.5.3 | Zmiana promptu | Zmień: "Odpowiadasz tylko po angielsku. Jesteś ekspertem od marketingu." → "Save" | Zmiana zapisana | |
| 3.5.4 | Efekt w rozmowie | Jan Kowalski: "Cześć!" | Agent odpowiada po angielsku jako ekspert marketingu | |
| 3.5.5 | Preview | Kliknij "Preview" | Podgląd jak będzie wyglądać odpowiedź agenta z tym SKILL.md | |
| 3.5.6 | Reset do domyślnego | Kliknij "Reset to default" | SKILL.md wraca do domyślnego | |
| 3.5.7 | Wpływ na nowych userów | Nowy user po rejestracji ma domyślny SKILL.md | Domyślny prompt aktywny | |

---

### 3.6 User Management

**Cel:** Admin może zarządzać użytkownikami.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.6.1 | Lista użytkowników | Otwórz `/admin/users` | Lista: email, nazwa, data rejestracji, rola, liczba sesji | |
| 3.6.2 | Zmiana roli | Zmień `role` użytkownika "Jan Kowalski" z "user" na "admin" | Jan ma dostęp do `/admin` | |
| 3.6.3 | Blokada użytkownika | Kliknij "Block" na userze | User nie może się zalogować. Komunikat: "Account disabled" | |
| 3.6.4 | Odblokowanie | Kliknij "Unblock" | User może się zalogować | |
| 3.6.5 | Usunięcie użytkownika | Kliknij "Delete" (z potwierdzeniem) | User usunięty. Jego projekty i pliki usunięte (kaskada). | |

---

### 3.7 Budowanie i przypisywanie extensionu (pełny cykl)

**Cel:** Admin przechodzi pełny workflow: request → build → assign → test.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 3.7.1 | Znajdź request | W `/admin/requests` znajdź "Oferty" | Request istnieje (można go utworzyć przez "Potrzebuję narzędzia do ofert") | |
| 3.7.2 | Zatwierdź | Kliknij "Approve" | Status → "approved" | |
| 3.7.3 | Build extension | Kliknij "Build Extension" → wybierz "Oferty" → "Generate" | Extension stworzony: `extensions/offers/tool.ts`, `manifest.json`, `ui/page.tsx` | |
| 3.7.4 | Przypisz do usera | W `/admin/extensions` → "offers" → "Assign" → wybierz "Jan Kowalski" | Extension przypisany | |
| 3.7.5 | Zrestartuj Pi Agent (jeśli wymagane) | `pm2 restart agent` lub `kill` + `npm run dev` | Agent ładuje nowy extension | |
| 3.7.6 | User widzi nową zakładkę | Jan Kowalski odświeża stronę | W sidebarze pojawia się "Oferty" (lub sekcja "Narzędzia" z zakładką) | |
| 3.7.7 | User klika zakładkę | Jan klika "Oferty" | `/ext/offers` ładuje się. UI extensionu działa. | |
| 3.7.8 | Tool w czacie | Jan: "Wygeneruj ofertę dla klienta X" | Agent używa toola z nowego extensionu | |
| 3.7.9 | User bez dostępu | Anna Nowak (bez przypisania) nie widzi "Ofert" | Sidebar Anny nie ma zakładki "Oferty" | |

---

## 4. Narzędzia (Core Extensions) — szczegółowe scenariusze

### 4.1 Web Search

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 4.1.1 | Podstawowe wyszukiwanie | "Znajdź informacje o Next.js 15" | Agent zwraca wyniki z tytułami, URL, snippetami | |
| 4.1.2 | Wyszukiwanie po polsku | "Znajdź przepis na pierogi" | Wyniki po polsku (jeśli DuckDuckGo zwróci) | |
| 4.1.3 | Wiele wyników | "Znajdź 10 najnowszych artykułów o AI" | Agent pokazuje max 10 wyników | |
| 4.1.4 | Brak wyników | "Znajdź: xyz123nonexistent" | "Nie znaleziono wyników" — brak crasha | |
| 4.1.5 | Źródła w odpowiedzi | Sprawdź czy wyniki mają źródła | AI Elements Sources wyświetla linki. InlineCitation cytuje w tekście. | |
| 4.1.6 | Agent nie halucynuje | "Znajdź najnowsze wiadomości" — sprawdź czy wyniki są rzeczywiste | Odpowiedź zawiera realne tytuły/URL (nie wymyślone) | |

### 4.2 Memory

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 4.2.1 | Store — podstawowy | "Zapamiętaj że lubię kawę" | "Zapamiętane!" | |
| 4.2.2 | Store — wiele faktów | "Zapamiętaj: ulubiony kolor to niebieski, wiek 30 lat, miasto Warszawa" | Wszystkie zapamiętane | |
| 4.2.3 | Store — Unicode | "Zapamiętaj symbol: ∑ and π ≈ 3.14" | Przechowane poprawnie | |
| 4.2.4 | Retrieve — pojedynczy fakt | "Jaki jest mój ulubiony kolor?" | "Niebieski" | |
| 4.2.5 | Retrieve — wszystkie | "Co o mnie wiesz?" | Agent wypisuje wszystkie zapamiętane fakty | |
| 4.2.6 | Retrieve — brak faktu | "Jaki jest mój ulubiony film?" (nie zapisany) | "Nie wiem, nie mam tej informacji" — nie halucynuje | |
| 4.2.7 | Lista | "Wymień klucze w pamięci" | Lista: [ulubiony_kolor, wiek, miasto, ulubiona_kawa] | |
| 4.2.8 | Delete — konkretny | "Usuń informację o moim wieku" | Potwierdzenie usunięcia. Retrieve: "Nie wiem" | |
| 4.2.9 | Delete — wszystkie | "Usuń wszystkie informacje o mnie" | Wszystkie fakty usunięte | |
| 4.2.10 | Cross-session | Wyloguj → zaloguj → "Co o mnie wiesz?" | Agent pamięta fakty (jeśli memory jest per-user w DB) | |
| 4.2.11 | Pusta wartość | "Zapamiętaj ''" | Walidacja odrzuca (min 1 znak) | |
| 4.2.12 | Bardzo długa wartość | "Zapamiętaj: [1000 znaków]" | Zaakceptowane lub przycięte (nie crash) | |

### 4.3 Vision

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 4.3.1 | Analyze URL obrazka | "Co przedstawia to zdjęcie? https://example.com/photo.jpg" | Agent analizuje obrazek (lub informuje, że to stub/wersja demo) | |
| 4.3.2 | Nieprawidłowy URL | "Opisz: not-a-url" | Błąd walidacji: "Invalid URL" | |
| 4.3.3 | Upload obrazka przez czat | Prześlij zdjęcie przez PromptInput Attachment | Agent odbiera obrazek i analizuje | |
| 4.3.4 | Obrazek bez promptu | Prześlij obrazek bez tekstu | Agent domyślnie opisuje obrazek | |

### 4.4 Document Gen

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 4.4.1 | Markdown — podstawowy | "Wygeneruj dokument w markdown: 'Raport Q1' z treścią 'Revenue grew 20%'" | Agent generuje .md z tytułem, treścią, datą, metadanymi | |
| 4.4.2 | Markdown — z tagami | "Dodaj tagi: dev, test" | Tagi widoczne w dokumencie | |
| 4.4.3 | PDF — podstawowy | "Wygeneruj PDF raport miesięczny" | PDF generowany, zapisany w vault, link zwrócony | |
| 4.4.4 | PDF — z tabelą | "Wygeneruj PDF z tabelą: kolumny Produkt, Cena, Ilość" | PDF zawiera tabelę | |
| 4.4.5 | PDF — z kodem | "Wygeneruj PDF z kodem TypeScript" | PDF zawiera syntax-highlighted code block | |
| 4.4.6 | DOCX — podstawowy | "Wygeneruj DOCX umowę najmu" | DOCX generowany, można otworzyć w Word/LibreOffice | |
| 4.4.7 | DOCX — ze stylami | "DOCX z nagłówkami, tabelą i listą" | Style, nagłówki H1/H2, lista punktowana działają | |
| 4.4.8 | XLSX — podstawowy | "Wygeneruj XLSX arkusz budżetu" | XLSX generowany, można otworzyć w Excel/LibreOffice | |
| 4.4.9 | XLSX — z formatowaniem | "XLSX z nagłówkami, sumami, formatowaniem walut" | Komórki sformatowane poprawnie | |
| 4.4.10 | Pusty tytuł | "Wygeneruj raport z pustym tytułem" | Błąd walidacji: "Title is required" | |
| 4.4.11 | Pobieranie wygenerowanego pliku | Kliknij link z odpowiedzi agenta | Plik pobiera się poprawnie | |
| 4.4.12 | Sprawdź w Vault | Otwórz Vault po wygenerowaniu dokumentu | Wygenerowany plik widoczny w Vault | |

---

## 5. Scenariusze błędów i odzyskiwania

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 5.1 | Router LLM offline | Zatrzymaj Router LLM. Wyślij wiadomość w czacie. | Komunikat błędu: "LLM service unavailable" lub podobny. Aplikacja nie crashuje. | |
| 5.2 | Router LLM wraca | Włącz Router LLM. Wyślij wiadomość. | Działa normalnie. | |
| 5.3 | Pi Agent offline | Zatrzymaj Pi Agent (:4000). Wyślij wiadomość. | 502 Bad Gateway lub "Agent unavailable". Next.js nie crashuje. | |
| 5.4 | Pi Agent wraca | Włącz Pi Agent. Wyślij wiadomość. | Działa normalnie. | |
| 5.5 | Baza danych offline | Zatrzymaj PostgreSQL. Odśwież stronę. | 500 Internal Server Error (bez stack trace w odpowiedzi). | |
| 5.6 | Baza danych wraca | Włącz PostgreSQL. Odśwież. | Działa normalnie. | |
| 5.7 | Nieprawidłowy JSON do API | `curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{bad json'` | 400 Bad Request | |
| 5.8 | Brak Content-Type | `curl -X POST http://localhost:3000/api/auth/login -d '{}'` | 400 lub 415 Unsupported Media Type | |
| 5.9 | Zbyt duży payload | `curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"data":"'` + 1MB znaków + `'"}'` | 413 Payload Too Large | |
| 5.10 | SQL Injection próba | Wyślij w message: `' OR 1=1; DROP TABLE users; --` | Bezpiecznie wyświetlone jako tekst. Brak SQL injection. | |
| 5.11 | XSS próba | Wyślij w message: `<script>alert('xss')</script>` | Wyświetlone jako encodowany tekst: `&lt;script&gt;alert('xss')&lt;/script&gt;` | |
| 5.12 | JWT replay | Skopiuj cookie z jednej sesji, użyj w innej przeglądarce (po wylogowaniu) | 401 Unauthorized (JWT wygasł lub secret inny) | |
| 5.13 | Długie pole name (500 znaków) | Zarejestruj użytkownika z name=500×"A" | Przycięcie do 255 lub błąd walidacji. Brak crasha. | |
| 5.14 | Bardzo długa wiadomość (>10KB) | Wyślij wiadomość >10KB | Walidacja odrzuca lub przycina. Komunikat: "Message too long" | |
| 5.15 | Pusta wiadomość do stream | `curl -X POST http://localhost:3000/api/chat/stream -H 'Content-Type: application/json' --cookie 'token=...' -d '{"message":""}'` | 400: "Message is required" | |
| 5.16 | Wyślij z '*' | `curl -X POST http://localhost:3000/api/chat/stream --cookie 'token=...' -d '{"chatId":"__proto__","message":"test"}'` | Bezpiecznie obsłużone (brak prototype pollution) | |
| 5.17 | 5 równoczesnych requestów do stream | Uruchom 5 `curl` równolegle do `/api/chat/stream` | Wszystkie 5 obsłużone (lub 4 + 1 rate-limited) — brak crasha | |
| 5.18 | Otwórz `/non-existent` | Wpisz w URL losową ścieżkę | Strona 404 (Next.js not-found) | |
| 5.19 | Rate limit — przekroczenie | Wyślij 31 requestów POST w <60s | #31: 429 Too Many Requests. Komunikat: "Rate limit exceeded" | |
| 5.20 | Rate limit — reset | Odczekaj 60s po 5.19, wyślij request | 200 OK (limit zresetowany) | |
| 5.21 | Rate limit — per-user | User A = 30 req, User B = 30 req równolegle (różne tokeny) | Oba dostają 200 (izolacja per-user) | |
| 5.22 | Odświeżenie podczas streama | Odśwież stronę podczas odpowiedzi agenta | Stream przerwany. Wiadomości zapisane (do momentu ostatniego save). | |
| 5.23 | Dwie karty — wyloguj w jednej | Karta A: zalogowana. Karta B: zalogowana. W karcie A kliknij logout. | Karta B: przy następnej interakcji → przekierowanie na login. | |
| 5.24 | Sesja wygasa podczas rozmowy | Czekaj 24h (lub ustaw krótki TTL JWT), kontynuuj rozmowę | 401. Przekierowanie na login. Wiadomość: "Session expired". | |
| 5.25 | Upload pliku z nieprawidłową nazwą | Upload pliku o nazwie `../../etc/passwd.txt` | Nazwa zsanitizowana (path traversal blocked). Plik uploadowany z bezpieczną nazwą. | |

---

## 6. Bezpieczeństwo

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 6.1 | CSRF — mutacja bez tokena | Wyślij POST `/api/auth/login` z Postmana/curl bez CSRF tokena | 403 CSRF validation failed | |
| 6.2 | CSRF — chat proxy | POST `/api/chat/stream` bez CSRF tokena | 403 | |
| 6.3 | CSRF — logout | POST `/api/auth/logout` bez CSRF tokena | 403 | |
| 6.4 | CSRF — register | POST `/api/auth/register` bez CSRF tokena | 403 | |
| 6.5 | Sprawdź httpOnly cookie | DevTools → Application → Cookies → `token` | httpOnly: true, SameSite: Strict, Secure: true (w prod) | |
| 6.6 | Sprawdź CSRF cookie | Drugie ciasteczko (np. `csrf-token`) | httpOnly: false (musi być czytane przez JS), SameSite: Strict | |
| 6.7 | AGENT_API_KEY — czy wymagany | POST bezpośrednio do Pi Agent: `curl -X POST http://localhost:4000/api/chat/stream -H 'Content-Type: application/json' -d '{"message":"test"}'` | 401 Unauthorized (brak AGENT_API_KEY) | |
| 6.8 | AGENT_API_KEY — zły klucz | POST z `Authorization: Bearer wrongkey` do Pi Agent | 401 | |
| 6.9 | Pi Agent bind | Sprawdź na jakim interfejsie nasłuchuje Pi Agent | `ss -tlnp \| grep 4000` → `127.0.0.1:4000` (localhost only) | |
| 6.10 | JWT secret w .env | Sprawdź czy JWT_SECRET nie jest hardcoded w kodzie | Tylko w `.env`. Brak w source code. | |
| 6.11 | SQL injection — wszystkie query parametryzowane | Test przez aplikację (nie ma bezpośredniego SQL w UI) | Drizzle ORM używa parameterized queries | |
| 6.12 | Upload — limit typów | Próbuj upload `.exe`, `.bat`, `.sh` | Blokowane (lub ostrzeżenie) | |
| 6.13 | Upload — path traversal | Nazwa pliku: `../../../etc/passwd` | Nazwa zsanitizowana. Brak dostępu do systemu plików. | |
| 6.14 | Upload — złośliwa treść | Upload pliku z zawartością `<script>...</script>` | Plik przechowany. Przy podglądzie — treść escapowana. | |
| 6.15 | Dostęp do cudzych danych | User A: odczytaj ID swojego vault pliku. User B: spróbuj GET `/api/vault/FILE_ID_A` | 403 Forbidden (user B nie ma dostępu) | |
| 6.16 | Injection Detector | Wyślij prompt injection: "Ignore previous instructions and..." | Wykryte, zablokowane lub oznaczone | |
| 6.17 | XSS w nazwie projektu | Utwórz projekt o nazwie `<script>alert(1)</script>` | Nazwa escapowana w UI. Brak wykonania skryptu. | |
| 6.18 | Ochrona wrażliwych endpointów | User → próba dostępu do `/api/admin/*` | 403 Forbidden | |

---

## 7. Wydajność

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 7.1 | Lighthouse — chat | Otwórz `/chat` w Incognito, uruchom Lighthouse (Performance) | Performance ≥ 70, Accessibility ≥ 90 | |
| 7.2 | Lighthouse — login | Otwórz `/auth/login` w Incognito | Performance ≥ 90 (strona statyczna) | |
| 7.3 | FCP (First Contentful Paint) | DevTools → Performance → nagraj | < 1.5s | |
| 7.4 | LCP (Largest Contentful Paint) | Jak wyżej | < 2.5s | |
| 7.5 | Time to Interactive | Jak wyżej | < 3.5s | |
| 7.6 | Soft navigation | Przejście gems → vault → admin → chat | Bez pełnego reloadu. Każde przejście < 500ms. | |
| 7.7 | Pierwszy token | Zmierz czas od wysłania wiadomości do pierwszego tokena | < 3s (zależne od Router LLM) | |
| 7.8 | Pełna odpowiedź | Długa odpowiedź (np. "Opisz historię Polski") | < 30s | |
| 7.9 | JS Bundle — pierwszy load | DevTools → Coverage lub Network | `/chat`: < 200kB JS, inne: < 120kB | |
| 7.10 | Rozmiar strony | DevTools → Network → Disable cache → odśwież | Łączny transfer < 500kB | |
| 7.11 | Pamięć sesji | Monitoruj pamięć przeglądarki po 10 rozmowach | < 100MB dodatkowej pamięci | |
| 7.12 | 5 równoczesnych czatów | Otwórz 5 kart, wyślij wiadomość w każdej jednocześnie | Wszystkie odpowiedzi w < 30s | |

---

## 8. Accessibility / Dostępność

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 8.1 | Nawigacja klawiaturą — login | Tab przez stronę loginu | Focus: email → password → submit → link register. Focus widoczny (outline). | |
| 8.2 | Enter na przycisku | Będąc na "Sign In", naciśnij Enter | Formularz wysłany | |
| 8.3 | Nawigacja — chat | Tab przez czat | Focus: textarea → send → stop → sidebar links → messages (jeśli interactive) | |
| 8.4 | Komunikat błędu — rola | Sprawdź czy komunikat błędu logowania ma `role="alert"` | Tak, screen reader odczyta | |
| 8.5 | ARIA — przyciski bez tekstu | Przyciski Delete, Edit, Upload (bez labela tekstowego) | `aria-label` lub `aria-labelledby` obecne | |
| 8.6 | Kontrast kolorów | DevTools → Rendering → Color contrast | Tekst na tle: ratio ≥ 4.5:1 (normalny tekst), ≥ 3:1 (duży tekst) | |
| 8.7 | Skip to content | Naciśnij Tab zaraz po załadowaniu strony | "Skip to main content" link widoczny (lub focusable) | |
| 8.8 | Screen reader — struktura | Uruchom NVDA/VoiceOver, odczytaj stronę chat | "Chat heading. Messages list. Input textarea. Send button." | |
| 8.9 | Obrazki — alt text | Avatar użytkownika w topbar | `alt="User avatar"` lub `alt=""` (dekoracyjny) | |
| 8.10 | Focus trap w modalach | Otwórz modal (np. upload) → Tab przez elementy | Focus nie wychodzi poza modal. Escape zamyka modal. | |
| 8.11 | Dark mode (jeśli wspierany) | Przełącz na dark mode | Wszystkie strony działają w dark mode. Kontrast zachowany. | |
| 8.12 | Powiększenie 200% | Zoom do 200% w przeglądarce | Layout nie psuje się. Sidebar zwija się automatycznie. | |


---

## 9. Testy wydajnościowe pod obciążeniem

**Cel:** Weryfikacja zachowania aplikacji przy symulowanym obciążeniu — wielu użytkowników, duże zapytania, długotrwałe użytkowanie.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 9.1 | 5 użytkowników jednocześnie — chat | Otwórz 5 okien Incognito, zaloguj 5 różnych userów, wyślij w każdej oknie wiadomość w odstępie <2s | Wszystkie 5 odpowiedzi w <30s. Żadna nie crashuje. | |
| 9.2 | 5 użytkowników — web search | Każdy z 5 userów wywołuje web_search jednocześnie | Wszystkie odpowiedzi z wynikami. Żaden nie dostaje timeout. | |
| 9.3 | 10 użytkowników — login flood | 10 userów loguje się w ciągu 10s (jeden po drugim) | Każdy dostaje 200. Żadne logowanie nie trwa >3s. | |
| 9.4 | 10 równoczesnych uploadów | 10 plików (po 1MB) wysłanych jednocześnie przez różnych userów | Wszystkie 10 zaakceptowane. Żaden nie timeout. | |
| 9.5 | 20 użytkowników — jednoczesny chat (limit Phase 1) | 20 różnych userów wysyła wiadomość w ciągu 5s | Wszystkie 20 odpowiedzi. Aplikacja nie zwalnia >50%. | |
| 9.6 | Stres — 30 szybkich requestów | 30 requestów POST do `/api/chat/stream` w <60s od jednego usera | #31 → 429 Rate limit (jeśli zaimplementowano) | |
| 9.7 | Baza danych — 100 zapytań/s | Uruchom skrypt: 100 zapytań SELECT do sessions w <5s | Wszystkie zapytania zwracają wynik w <500ms. Brak deadlocków. | |
| 9.8 | Duży payload — upload 100 plików | Upload 100 małych plików (po 10KB) naraz | Wszystkie 100 zaakceptowane. Nie blokują UI. | |
| 9.9 | Długi tekst w czacie | Wyślij wiadomość 5000 znaków | Wysłana. Odpowiedź w <30s. | |
| 9.10 | Renderowanie UI — 200 wiadomości | Utwórz 200 wiadomości w jednej sesji (przez API), otwórz czat | Strona ładuje się <5s. Scroll działa płynnie. | |
| 9.11 | Renderowanie UI — 1000 wiadomości | Utwórz 1000 wiadomości, otwórz czat | Strona ładuje się <10s. Virtual scrolling (jeśli zaimplementowany) lub lazy loading. | |
| 9.12 | Stałe obciążenie — 1h | Utrzymuj 3 aktywnych userów przez 1 godzinę (jedna rozmowa co 5 minut) | Brak degradacji. Czas odpowiedzi stabilny przez cały test. | |
| 9.13 | Pamięć przeglądarki — 100 rozmów | W jednej sesji usera wykonaj 100 krótkich rozmów (po 3 wiadomości) | Pamięć przeglądarki <200MB. Brak wycieków. | |
| 9.14 | Pamięć Pi Agenta — 24h uptime | Utrzymuj Pi Agent uruchomiony przez 24h z regularnymi requestami | Pamięć procesu stabilna (bez wycieków). **Sprawdź:** RSS (resident set size) przed i po. | |
| 9.15 | PM2 — restart bez utraty danych | Uruchom przez PM2. `pm2 restart next`. Sprawdź sesje. | Sesje zachowane w DB. Użytkownik może kontynuować po restarcie. | |
| 9.16 | PM2 — max_restarts | Wymuś crash Pi Agenta 11 razy (np. kill -9) | PM2 restartuje max 10 razy, potem zatrzymuje proces. Log: "max_restarts reached". | |

### Testy — Limit rozmiaru i walidacja

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 9.L1 | Upload pliku 101MB | Wygeneruj plik 101MB, spróbuj upload | Limit 100MB — 413 Payload Too Large | |
| 9.L2 | Upload pliku 99MB (granica) | Wygeneruj plik 99MB, upload | Zaakceptowany (jeśli jest miejsce) | |
| 9.L3 | Wiadomość >10KB | Wyślij wiadomość 10001 znaków | 400: "Message too long" lub przycięcie | |
| 9.L4 | Wiadomość 10KB (granica) | Wyślij wiadomość 10000 znaków | Zaakceptowana | |
| 9.L5 | JSON payload >1MB | Wyślij POST z JSON >1MB | 413 Payload Too Large (body-parser limit) | |
| 9.L6 | Session — 1000 tool calls | W jednej sesji wykonaj 1000 tool calls (np. memory store/retrieve loop) | Sesja działa. Brak przekroczenia limitu tokenów kontekstu. | |

---

## 10. Scenariusze Failover i Disaster Recovery

**Cel:** Weryfikacja jak aplikacja zachowuje się przy awarii poszczególnych komponentów i czy wraca do pełnej sprawności.

### 10.1 Awarie komponentów

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 10.1 | Router LLM — nagła awaria | Wyślij wiadomość, w trakcie streamowania zabij Router LLM | Agent przerywa odpowiedź. Komunikat: "LLM connection lost". Aplikacja nie crashuje. | |
| 10.2 | Router LLM — powrót po awarii | Uruchom ponownie Router LLM, wyślij wiadomość | Działa normalnie. Nowa sesja tworzy połączenie. | |
| 10.3 | Pi Agent — nagła awaria (`kill -9`) | Zabij proces Pi Agent (PID). Wyślij wiadomość. | Next.js zwraca 502 Bad Gateway. UI pokazuje "Agent unavailable. Retrying..." | |
| 10.4 | Pi Agent — auto-restart PM2 | Po 10.3, PM2 restartuje Pi Agent (max_restarts) | Po restarcie, nowa wiadomość działa. Sesje odtworzone z DB. | |
| 10.5 | Pi Agent — dłuższy downtime (5 min) | Zatrzymaj Pi Agent na 5 minut. Próbuj wysyłać wiadomości co 30s. | Next.js próbuje łączyć się przez 5 min. Po włączeniu Agenta — pierwszy request działa. | |
| 10.6 | PostgreSQL — nagła awaria | Zatrzymaj PostgreSQL. Wyślij wiadomość. Odśwież stronę. | 500 Internal Server Error (bez stack trace). UI: "Database connection error". | |
| 10.7 | PostgreSQL — powrót | Uruchom PostgreSQL. Odśwież. | Aplikacja działa normalnie. Dane nienaruszone (jeśli brak corruptcji). | |
| 10.8 | Baza danych — utrata połączenia w trakcie streama | Wyślij wiadomość, podczas odpowiedzi zatrzymaj PostgreSQL | Stream się kończy (odpowiedź z LLM była gotowa). Zapis do DB failuje (log). UI nie pokazuje błędu. | |
| 10.9 | Wszystkie serwisy jednocześnie offline | Zatrzymaj Router LLM + Pi Agent + PostgreSQL. Odśwież stronę. | Strona loginu nadal się ładuje (Next.js static). Logowanie fail: "Service unavailable". | |
| 10.10 | Dysk — brak miejsca | Wypełnij dysk (lub symuluj brak miejsca). Upload pliku. | Błąd: "Storage full". Żadna operacja nie powoduje utraty danych. | |

### 10.2 Odtwarzanie po awarii (DR)

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 10.D1 | Backup bazy — manualny | `pg_dump -h localhost -p 5433 -U ubek -d ubek_next > backup.sql` | Backup utworzony poprawnie. Sprawdź rozmiar >0. | |
| 10.D2 | Restore bazy | `dropdb ubek_next && createdb ubek_next && psql -h localhost -p 5433 -U ubek -d ubek_next < backup.sql` | Dane przywrócone. Userzy, projekty, sesje istnieją. | |
| 10.D3 | Backup + restore z różnicą czasu | Zrób backup. Dodaj nowego usera. Przywróć backup. | Nowy user nie istnieje (backup sprzed zmiany). Aplikacja działa. | |
| 10.D4 | Migracja — rollback | Wykonaj migrację do góry. Potem rollback do poprzedniej wersji. | Rollback udany. Wszystkie dane zachowane (jeśli migracja nie usuwa kolumn). | |
| 10.D5 | Re-deploy z czysta | `git clone`, skonfiguruj .env, `npm install`, `db:push`, `db:seed`, uruchom | Aplikacja działa od zera w <30 minut. | |
| 10.D6 | Schemat bazy — wersjonowanie | Sprawdź czy migracje są w repo (`next/drizzle/migrations/`) | Pliki migracji istnieją, są numerowane/sfiksowane. Można odtworzyć schemat z 0. | |
| 10.D7 | Graceful shutdown — Pi Agent | `kill -TERM <PID_PI_AGENT>` (SIGTERM) | Agent kończy bieżący request, zapisuje stan, wyłącza się czysto. | |
| 10.D8 | Graceful shutdown — Next.js | `kill -TERM <PID_NEXT>` | Next.js kończy bieżące requesty, wyłącza się. | |
| 10.D9 | PM2 — logi po awarii | `pm2 logs --lines 50` po awarii | Logi zawierają stack trace błędu. Łatwe do debugowania. | |

---

## 11. Testy cross-browser i urządzeń mobilnych

**Cel:** Weryfikacja że aplikacja działa poprawnie na różnych przeglądarkach, systemach operacyjnych i urządzeniach.

### 11.1 Desktop — przeglądarki

| # | Test | Przeglądarka | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 11.1 | Główny flow — Chrome | Wykonaj pełny cykl: register → login → chat → tool → vault → logout | Wszystkie kroki działają. UI bez błędów. | |
| 11.2 | Główny flow — Firefox | To samo co 11.1 w Firefox (najnowsza wersja) | Identyczne działanie. Ewentualne różnice w renderowaniu <2px. | |
| 11.3 | Główny flow — Safari | To samo w Safari (macOS) | Działa. Sprawdź: httpOnly cookie (Safari blokuje third-party). | |
| 11.4 | Główny flow — Edge (Chromium) | To samo w Edge | Działa. Identyczne jak Chrome. | |
| 11.5 | Główny flow — Brave | To samo w Brave (z domyślnymi blokadami) | Działa. Sprawdź czy Brave Shields nie blokują SSE/streamingu. | |
| 11.6 | ITP (Intelligent Tracking Prevention) | Safari z włączoną ochroną przed śledzeniem | httpOnly cookie działa. Logowanie persistent. | |
| 11.7 | Rozszerzenia blokujące | UBlock Origin + Privacy Badger włączone | Działa. Żadne skrypty nieblokowane. | |
| 11.8 | JavaScript wyłączony | Wyłącz JS w devtools, odśwież | Podstawowa treść widoczna (jeśli SSR). Przycisk "Enable JavaScript". | |

### 11.2 Mobile / Responsywność

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 11.M1 | iPhone 14 — Safari | DevTools → Device Toolbar → iPhone 14. Wykonaj login + chat. | Layout responsywny. Sidebar schowany. Menu hamburger. Input dostępny. | |
| 11.M2 | iPhone SE — mały ekran | DevTools → iPhone SE (375×667) | Wszystkie elementy widoczne. Brak overflow. | |
| 11.M3 | iPad — tablet | DevTools → iPad (1024×1366) | Sidebar może być widoczny (więcej miejsca). Split view wspierany. | |
| 11.M4 | Pixel 7 — Android | DevTools → Pixel 7 | Działa jak na iPhone. RWD poprawne. | |
| 11.M5 | Orientacja — portrait → landscape | Obróć urządzenie (lub DevTools → rotate) | Layout dostosowuje się. Sidebar znika/przestawia. | |
| 11.M6 | Touch — dotyk | Symuluj touch: przyciski, dropdown, sidebar toggle, przeciąganie do uploadu | Touch events działają. Brak ghost clicks. | |
| 11.M7 | Zoom 200% | Ustaw zoom 200% na desktopie | Layout nie psuje się. Teksty czytelne. Overflow scroll. | |
| 11.M8 | Zoom 400% | Ustaw zoom 400% | Strona przewijalna. Wszystkie funkcje dostępne. | |
| 11.M9 | Okno 320px (najmniejszy smartfon) | Szerokość 320px | Wszystkie przyciski widoczne. Sidebar na full overlay. | |
| 11.M10 | Okno 2560px (szeroki monitor) | Szerokość 2560px | Layout wycentrowany. Max-width: 1400px dla treści. | |

### 11.3 Offline / Network

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 11.O1 | Tryb offline | DevTools → Network → Offline. Odśwież stronę. | Strona błędu: "No internet connection" (jeśli PWA/service worker) lub błąd Next.js. | |
| 11.O2 | Slow 3G | DevTools → Network → Slow 3G. Załaduj stronę. | Strona ładuje się <10s. Shimmer/skeleton podczas ładowania. | |
| 11.O3 | Slow 3G — chat | Slow 3G. Wyślij wiadomość. | Streaming działa. Tokeny pojawiają się wolniej ale poprawnie. | |
| 11.O4 | Sieć — wysoki latency (500ms) | DevTools → Network → Add latency 500ms. | Wszystkie requesty kończą się sukcesem. Czas odpowiedzi wydłużony o latency. | |
| 11.O5 | Sieć — packet loss 10% | DevTools → Network → Add packet loss 10%. | Requesty retry. Brak błędów dla użytkownika (jeśli fetch retry). | |
| 11.O6 | Przerwa w sieci podczas streama | Włącz Slow 3G, wyślij wiadomość, w trakcie przełącz na Offline | Stream przerywa. UI: "Connection lost". Po powrocie online — możliwość retry. | |

---

## 12. RAG — scenariusze zaawansowane i edge case'y

**Cel:** Dogłębna weryfikacja systemu RAG (Retrieval-Augmented Generation) dla różnych typów dokumentów i zapytań.

### 12.1 Typy dokumentów

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 12.1 | PDF — prosty tekst | Prześlij PDF z 3 stronami tekstu. Zapytaj o konkretny fragment. | Agent znajduje fragment i cytuje źródło (nazwa pliku + strona). | |
| 12.2 | PDF — z tabelami | Prześlij PDF z tabelami. "Jaka była suma w tabeli?" | Agent odczytuje dane z tabeli poprawnie. | |
| 12.3 | PDF — zeskanowany (OCR) | Prześlij skan dokumentu (obrazek w PDF). | Agent OCR-uje i odpowiada (jeśli implementacja wspiera OCR). | |
| 12.4 | DOCX — z nagłówkami | Prześlij DOCX z sekcjami H1/H2. Zapytaj o zawartość sekcji. | Agent odpowiada na podstawie właściwej sekcji. | |
| 12.5 | DOCX — lista i tabele | Prześlij DOCX z listą wypunktowaną i tabelą. | Agent odtwarza strukturę listy i tabeli. | |
| 12.6 | TXT — UTF-8 | Prześlij plik .txt z polskimi znakami i Unicode (😀, ∑). | Agent czyta poprawnie. Odpowiada w tym samym języku. | |
| 12.7 | TXT — bardzo długi (100 stron) | Prześlij plik .txt 100 stron. "O czym jest dokument?" | Agent odpowiada (chunkowanie działa). Może nie znać całego — zależy od top-K chunków. | |
| 12.8 | HTML | Prześlij plik .html. Zapytaj o treść. | Agent parsuje HTML i odpowiada (czysty tekst, bez tagów). | |
| 12.9 | Markdown | Prześlij .md z kodem, linkami, obrazkami. | Agent czyta kod, linki. Odpowiada poprawnie. | |

### 12.2 Semantic search — precyzja

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 12.S1 | Dokładne dopasowanie | Dokument: "Cena produktu X wynosi 100 zł". Zapytanie: "Ile kosztuje produkt X?" | Agent odpowiada: "100 zł" z cytatem. | |
| 12.S2 | Synonim | Dokument: "Samochód ma 150 KM". Zapytanie: "Jaka jest moc auta?" | Agent znajduje (semantic search powinien dopasować pomimo różnych słów). | |
| 12.S3 | Pytanie negatywne | Dokument: "Produkt nie zawiera glutenu". Zapytanie: "Czy produkt zawiera gluten?" | Agent: "Nie, produkt nie zawiera glutenu." (poprawne zrozumienie negacji) | |
| 12.S4 | Brak w dokumentach | Zapytanie o coś czego nie ma w żadnym dokumencie projektu. | Agent: "Nie znalazłem tej informacji w dostępnych dokumentach." — nie halucynuje. | |
| 12.S5 | Wiele dokumentów — ranking | 3 dokumenty: A mówi "100 zł", B mówi "200 zł", C mówi "cena". Zapytanie: "Ile kosztuje?" | Agent powinien znaleźć A (najbardziej trafny) i ewentualnie B. | |
| 12.S6 | Wielojęzyczność | Dokument po polsku. Zapytanie po angielsku (lub odwrotnie). | Agent odpowiada (jeśli embeddingi są wielojęzyczne) lub mówi "nie znalazłem". | |

### 12.3 Chunkowanie i embedding

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 12.C1 | Rozmiar chunka | Dokument 5000 znaków. Sprawdź ile chunków powstało. | chunk_size=1000, overlap=200 → ~6 chunków. | |
| 12.C2 | Overlap — ciągłość | Dokument: "zdanie A. zdanie B. zdanie C." Zapytanie: "Co jest między A i C?" | Agent widzi kontekst mimo podziału na chunki (overlap pomaga). | |
| 12.C3 | Embedding — wymiar | Sprawdź wymiar embeddingów w DB (długość tablicy w `rag_chunks.embedding`) | Zgodny z wymiarem modelu embedding (np. 768, 1024, 1536). | |
| 12.C4 | Embedding — jakość | Dokument: "Lubię koty". Zapytanie: "Jakie zwierzęta lubi użytkownik?" | Semantic search znajduje dokument (nie tylko keyword match). | |
| 12.C5 | Re-embedding po zmianie dokumentu | Usuń dokument, dodaj nową wersję. Zapytaj. | Nowy embedding, nie stary. | |
| 12.C6 | Duży dokument — 500 stron | Prześlij dokument 500 stron. Sprawdź czas chunkowania + embedowania. | < 60s dla 500 stron. UI nie blokuje się (background job). | |

### 12.4 RAG — błędy i brzegowe

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 12.E1 | Pusty plik | Prześlij pusty plik .txt. | 0 chunków. Brak błędu. | |
| 12.E2 | Plik tylko z spacjami | Prześlij plik z 1000 spacjami. | 0 chunków (puste treści ignorowane). | |
| 12.E3 | Plik binarny jako .txt | Prześlij .exe zmieniony na .txt. | Agent nie może odczytać. Komunikat błędu. | |
| 12.E4 | Dokument tylko w jednym projekcie | User A: dokument w projekcie A. User B: ten sam projekt ID (nie ma dostępu). | User B nie widzi dokumentu. | |
| 12.E5 | 100 dokumentów w projekcie | Prześlij 100 małych dokumentów. Zapytaj o konkretny fakt z jednego. | Agent znajduje (top-K działa). Czas odpowiedzi <10s. | |
| 12.E6 | Zapytanie referencyjne | Dokument: "Patrz punkt 3.2". Agent nie ma punktu 3.2 (poza chunkem). | Agent informuje: "Dokument odwołuje się do punktu 3.2, ale nie mam go w kontekście." | |

---

## 13. Długie sesje i stabilność

**Cel:** Weryfikacja że aplikacja działa stabilnie podczas długotrwałego użytkowania.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 13.1 | Długa rozmowa — 100 wiadomości | W jednej sesji wyślij 100 wiadomości z rzędu (różne tematy). | Wszystkie 100 odpowiedzi. Kontekst nie jest przepełniony (agent pamięta ostatnie). | |
| 13.2 | Długa rozmowa — 24h przerwy | Wyślij wiadomość, odczekaj 24h, kontynuuj. | Agent pamięta kontekst (historia w DB). | |
| 13.3 | Długa sesja — 7 dni | Utrzymuj otwartą kartę z czatem przez 7 dni. Codziennie wyślij wiadomość. | Sesja Pi Agenta może wygasnąć (SessionPool cleanup). Po wznowieniu: historia z DB załadowana. | |
| 13.4 | 100 tool calls w jednej sesji | W jednej rozmowie wykonaj 100 tool calls (web search + memory + document gen). | Narzędzia działają poprawnie przez cały czas. Kontekst nie przekracza limitu. | |
| 13.5 | Wiele sesji — 50 równolegle | 50 różnych userów utrzymuje otwarte sesje. | SessionPool zarządza 50 sesjami. Cleanup nie usuwa aktywnych. | |
| 13.6 | Session timeout — brak aktywności | Zostaw otwarty czat bez aktywności na 30 min. | Sesja oznaczona do cleanupu. Po powrocie → nowa sesja (ale historia w DB). | |
| 13.7 | Session timeout — tool in-flight | Rozpocznij tool call (web search). Czekaj 30 min przed wykonaniem. | Tool może timeout. Agent kontynuuje z błędem toola. | |
| 13.8 | Długa sesja Pi Agenta — 7 dni uptime | Utrzymuj Pi Agent bez restartu przez 7 dni z regularnymi requestami co godzinę. | Monitoruj: pamięć (RSS), CPU, liczba otwartych deskryptorów. Stabilne. | |
| 13.9 | Długi stream — odpowiedź 5 minut | Wyślij prompt: "Opisz szczegółowo historię II wojny światowej" (lub inny długi temat). | Stream trwa >1 min. Tokeny płyną. UI nie blokuje się. Po zakończeniu — pełna odpowiedź. | |
| 13.10 | Długi stream — przewijanie w trakcie | Podczas długiego streama, przewiń do góry. | Scroll pozostaje na górze. Po powrocie na dół — nowe tokeny widoczne. | |
| 13.11 | Długi stream — zamknięcie karty | Wyślij długi prompt, zamknij kartę w trakcie streama. | Żaden process nie leakuje. Sesja może zostać w DB (częściowo). | |
| 13.12 | Pi Agent restart z aktywnymi sesjami | Gdy user A rozmawia, zrestartuj Pi Agent (`pm2 restart agent`). | User A: stream przerywa się. Po restarcie: nowa rozmowa (historia w DB). | |

---

## 14. Testy API — zaawansowane

**Cel:** Weryfikacja endpointów API pod kątem poprawności, błędów, versioningu i bezpieczeństwa.

### 14.1 Paginacja i listy

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 14.1 | Lista projektów — paginacja | Utwórz 25 projektów. GET `/api/projects?page=1&limit=10` | 10 projektów + meta: total:25, page:1, pages:3 | |
| 14.2 | Lista projektów — page 2 | GET `/api/projects?page=2&limit=10` | 10 projektów (11-20) | |
| 14.3 | Lista projektów — page 3 | GET `/api/projects?page=3&limit=10` | 5 projektów (21-25) | |
| 14.4 | Lista projektów — page > max | GET `/api/projects?page=10&limit=10` | Pusta lista (nie błąd) | |
| 14.5 | Lista projektów — bez parametrów | GET `/api/projects` | Domyślne: page=1, limit=20 | |
| 14.6 | Limit >100 | GET `/api/projects?limit=200` | 400: "limit max 100" | |
| 14.7 | Sortowanie | GET `/api/projects?sort=created_at&order=desc` | Najnowsze pierwsze | |
| 14.8 | Filtrowanie po nazwie | GET `/api/projects?name=General` | Tylko projekty zawierające "General" | |
| 14.9 | Lista sesji — paginacja | GET `/api/chat/sessions?projectId=X&page=1&limit=20` | 20 sesji + meta | |
| 14.10 | Lista vault plików — paginacja | GET `/api/vault?page=1&limit=20` | 20 plików + meta | |

### 14.2 Nagłówki i format odpowiedzi

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 14.H1 | Content-Type JSON | GET `/api/projects` | `Content-Type: application/json` | |
| 14.H2 | CORS headers | GET `/api/health` (z innego origin) | `Access-Control-Allow-Origin: *` lub tylko localhost | |
| 14.H3 | Cache headers | GET `/api/health` | `Cache-Control: no-cache` lub `no-store` | |
| 14.H4 | X-Request-ID | Dowolny request z `X-Request-ID: test-123` | Odpowiedź zawiera `X-Request-ID: test-123` (traceability) | |
| 14.H5 | X-Response-Time | Dowolny request | Nagłówek z czasem odpowiedzi w ms | |
| 14.H6 | Consistent error format | Wyślij 400, 401, 403, 404, 500 | Każdy błąd ma format: `{"error":"message","code":"ERROR_CODE"}` | |
| 14.H7 | Successful response format | GET `/api/projects` | Format: `{"success":true,"data":[...],"meta":{...}}` | |

### 14.3 HTTP metody i REST

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 14.M1 | GET na endpoint POST | GET `/api/auth/login` | 405 Method Not Allowed | |
| 14.M2 | POST na endpoint GET | POST `/api/projects` (bez body) | 405 Method Not Allowed lub 400 (brak danych) | |
| 14.M3 | OPTIONS na endpoint | OPTIONS `/api/auth/login` | 200 z Allow: POST, OPTIONS | |
| 14.M4 | HEAD na endpoint | HEAD `/api/health` | 200, bez body, nagłówki jak GET | |
| 14.M5 | PUT zamiast POST | PUT `/api/auth/login` | 405 | |
| 14.M6 | DELETE na GET endpoint | DELETE `/api/projects` | 405 | |
| 14.M7 | TRACE / CONNECT | TRACE `/api/health` | 405 lub 501 | |

### 14.4 API versioning i future-proof

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 14.V1 | Accept-version header | GET `/api/projects` z `Accept-version: 1.0` | 200 (brak zmiany) | |
| 14.V2 | Nieznana wersja | `Accept-version: 99.0` | 200 (najnowsza) lub 400 (unsupported) | |
| 14.V3 | Deprecation header | Jeśli endpoint jest deprecated | `Deprecation: true` + `Sunset: date` | |
| 14.V4 | Link header (HATEOAS) | GET `/api/projects` | `Link: <.../api/projects?page=2>; rel="next"` (opcjonalnie) | |

---

## 15. Testy danych i migracji

**Cel:** Weryfikacja spójności, trwałości i izolacji danych.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 15.1 | Trwałość — user po resecie | Zarejestruj usera, wykonaj `db:push` (migracja), restart. | User istnieje. Może się zalogować. | |
| 15.2 | Trwałość — projekty po resecie | Utwórz projekt, restart, sprawdź. | Projekt istnieje. Dane nienaruszone. | |
| 15.3 | Trwałość — sesje po resecie | Przeprowadź rozmowę, restart, otwórz historię. | Rozmowa w historii. Można kontynuować. | |
| 15.4 | Trwałość — vault po resecie | Upload plik, restart, sprawdź vault. | Plik istnieje. Można pobrać. | |
| 15.5 | Trwałość — pamięć (memory) | "Zapamiętaj X", restart, zapytaj. | Agent pamięta (jeśli memory w DB, nie in-memory). | |
| 15.6 | Izolacja — user A vs B | User A: utwórz projekt, plik, sesję. User B: lista projektów/plików/sesji. | User B nie widzi danych usera A. | |
| 15.7 | Izolacja — projekt A vs B | Projekt A: dokumenty, pamięć. Projekt B: to samo. | Izolacja per project (każdy ma osobne dane). | |
| 15.8 | Kaskada — usunięcie usera | Usuń usera z bazy (SQL). | Projekty, sesje, pliki, memory usunięte (ON DELETE CASCADE). | |
| 15.9 | Kaskada — usunięcie projektu | Usuń projekt. | Sesje projektu usunięte. Pliki: SET NULL lub usunięte. | |
| 15.10 | Soft-delete vault | Usuń plik z vault. Sprawdź czy `deleted_at` ustawiony. | `deleted_at NOT NULL`. Plik niewidoczny w UI. | |
| 15.11 | Soft-delete — restore | Przywróć plik (set null deleted_at). | Plik widoczny ponownie. (jeśli zaimplementowano) | |
| 15.12 | Unikalność email | Rejestracja z istniejącym emailem. | 409 Conflict. Unikalny indeks na email. | |
| 15.13 | Unikalność user_facts | User A ma fakt "key: test". Spróbuj dodać drugi "key: test". | Upsert (nadpisanie) lub 409. | |
| 15.14 | Dane seeda | `npm run db:seed` — uruchom dwa razy. | Brak duplikatów (idempotent). | |
| 15.15 | Czysty seed | `npm run db:reset` + `db:seed`. | Tylko dane seeda. Brak starych danych testowych. | |
| 15.16 | Foreign key — integrity | Spróbuj INSERT sesji z nieistniejącym `user_id`. | FK constraint violation. Błąd. | |
| 15.17 | Foreign key — integrity (vault) | Spróbuj INSERT pliku z nieistniejącym `project_id`. | FK constraint violation. | |
| 15.18 | Duże ID — UUID | Sprawdź projekty/sesje/pliki. | UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. | |
| 15.19 | Duże ID — TEXT sessions | `sessions.id` to TEXT. | Format UUID lub inny czytelny identyfikator. | |
| 15.20 | Indexy — wykonaj EXPLAIN | `EXPLAIN SELECT * FROM sessions WHERE user_id = '...'` | Index scan (Seq Scan to problem). | |

---

## 16. Testy współbieżności i blokad

**Cel:** Weryfikacja że aplikacja radzi sobie z równoczesnym dostępem i nie ma race conditions.

| # | Test | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|---|
| 16.1 | Dwie karty — ta sama sesja | User A otwiera tę samą sesję czatu w karcie 1 i 2. W karcie 1 wysyła wiadomość. | Karta 2: po odświeżeniu (lub auto-refresh) widzi nową wiadomość. | |
| 16.2 | Dwie karty — ten sam projekt | User A w karcie 1 i 2, ten sam projekt. W karcie 1 nowa sesja. Karta 2: lista sesji. | Nowa sesja widoczna w karcie 2. | |
| 16.3 | Dwie karty — jednoczesna edycja projektu | Karta 1 i 2: edytuj ten sam projekt. Zapisz w karcie 1, potem w karcie 2 (inne dane). | Ostatni zapis wygrywa (lub 409 Conflict). Brak utraty danych. | |
| 16.4 | Dwie karty — vault upload | Karta 1 i 2: upload pliku o tej samej nazwie jednocześnie. | Oba zaakceptowane (filename dedup: `file (1).txt`). | |
| 16.5 | Równoczesny login tego samego usera | User A loguje się z dwóch przeglądarek jednocześnie. | Oba logowania udane. Dwa ważne tokeny JWT. | |
| 16.6 | Równoczesny logout | User A z karty 1 i 2: logout w odstępie <1s. | Oba udane. Drugi może dostać 401 (już wylogowany). | |
| 16.7 | Równoczesna rejestracja tego samego emaila | 2 requesty rejestracji `nowy@test.com` w odstępie <100ms. | Jeden 201, drugi 409 (unikalność email — DB constraint). | |
| 16.8 | Race — tworzenie sesji | 2 równoczesne POST do `/api/chat/stream` tego samego usera, ten sam projekt. | Każdy tworzy osobną sesję (lub drugi dołącza do istniejącej). | |
| 16.9 | Race — tool execution | 2 równoczesne tool calls tego samego toola (np. memory store). | Oba wykonane. Brak race condition w pamięci. | |
| 16.10 | Race — vault delete + download | User A: delete pliku. User B (ten sam user, inna karta): download tego samego pliku. | Jeden wygrywa. Brak crasha. | |
| 16.11 | SessionPool — dwie sesje tego samego usera | User A: 2 równoczesne streamy (2 projekty). | SessionPool tworzy osobne runtime? Jeśli per-user: jeden stream w jednym czasie. | |
| 16.12 | Concurrent 20 userów — create project | 20 userów tworzy projekt jednocześnie. | Wszystkie 20 utworzone. Unikalne UUID. Brak kolizji. | |
| 16.13 | Concurrent 20 userów — web search | Jak w 9.1 ale z web search. | Wszystkie odpowiedzi. API DuckDuckGo może rate-limitować — agent obsługuje błąd. | |
| 16.14 | PM2 restart podczas zapisu | User A: wysyła wiadomość. Podczas zapisu do DB: restart Pi Agenta. | `onFinish` może fail. Częściowo zapisana sesja. Brak corruption. | |
| 16.15 | Wąskie gardło — blokada na tabeli sessions | 20 równoczesnych INSERT do sessions. | Żadna nie timeout (<5s). Indeksy pomagają. | |

---

## 17. Zgłaszanie błędów — szablon

Każdy znaleziony błąd zgłoś z następującymi informacjami:

```
## 🐛 Błąd: [Krótki tytuł]

**Priorytet:** P1 (critical) / P2 (high) / P3 (medium) / P4 (low)

**Środowisko:**
- Przeglądarka: [nazwa + wersja]
- System: [OS + wersja]
- Krok konfiguracji: [który seed, czy po resecie]

**Kroki do reprodukcji:**
1. Idź do ...
2. Kliknij ...
3. Wpisz ...
4. Zobacz ...

**Oczekiwany rezultat:**
[co powinno się stać]

**Rzeczywisty rezultat:**
[co się stało]

**Załączniki:**
- Screenshot: [link]
- Console log: [F12 → Console → kopiuj]
- Network: [F12 → Network → kopiuj nagłówki requestu]
- URL: [dokładny URL z błędem]

**Uwagi dodatkowe:**
- Czy błąd występuje za każdym razem? [tak/nie]
- Czy dotyczy tylko jednego użytkownika?
- Czy występuje w Incognito?
```

---

## Podsumowanie cyklu testowego

Po zakończeniu wszystkich testów wypełnij poniższą tabelę:

| Obszar | Liczba testów | Pass ✅ | Fail ❌ | Pokrycie |
|--------|--------------|--------|--------|----------|
| 2.1 Rejestracja | | | | |
| 2.2 Logowanie | | | | |
| 2.3 Dashboard/Layout | | | | |
| 2.4 Chat | | | | |
| 2.5 Chat — Tools | | | | |
| 2.6 Projekty (Gems) | | | | |
| 2.7 Vault | | | | |
| 2.8 RAG | | | | |
| 2.9 Deep Research | | | | |
| 2.10 Historia rozmów | | | | |
| 2.11 Extension Request | | | | |
| 3. Admin Dashboard | | | | |
| 3.2 Agent Monitor | | | | |
| 3.3 Extension Manager | | | | |
| 3.4 Requests Queue | | | | |
| 3.5 Personality | | | | |
| 3.6 User Management | | | | |
| 3.7 Full Extension Cycle | | | | |
| 4. Tools (Web/Memory/Vision/Doc) | | | | |
| 5. Błędy/Odzyskiwanie | | | | |
| 6. Bezpieczeństwo | | | | |
| 7. Wydajność | | | | |
| 8. Accessibility | | | | |
| 9. Wydajność pod obciążeniem | | | | |
| 10. Failover / Disaster Recovery | | | | |
| 11. Cross-browser / Mobile | | | | |
| 12. RAG — zaawansowane | | | | |
| 13. Długie sesje / Stabilność | | | | |
| 14. API — zaawansowane | | | | |
| 15. Dane i migracje | | | | |
| 16. Współbieżność / Blokady | | | | |
| **RAZEM** | | | | |

> **Data rozpoczęcia testów:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> **Data zakończenia testów:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> **Tester:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> **Wersja aplikacji:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
