# UBEK Next — Lista testów akceptacyjnych (QA)

## Konfiguracja wstępna

| # | Krok | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 1 | Uruchom `docker compose up -d` | Wszystkie kontenery startują bez błędów | |
| 2 | Otwórz `http://localhost:3000` | Strona ładuje się, przekierowanie na `/auth/login` | |
| 3 | Sprawdź `http://localhost:4000/api/health` | JSON z `{ "status": "ok", "uptime": ... }` | |

---

## 1. Rejestracja

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 1.1 | Wejdź na `/auth/register` | Formularz rejestracji z polami: name, email, password, confirm | |
| 1.2 | Wyślij pusty formularz | Walidacja kliencka: pola wymagane | |
| 1.3 | Wpisz krótkie hasło (<8 znaków) | Komunikat: "Password must be at least 8 characters" | |
| 1.4 | Wpisz nieprawidłowy email (np. "test") | Komunikat o nieprawidłowym formacie email | |
| 1.5 | Wpisz różne hasła w password i confirm | Komunikat: "Passwords do not match" | |
| 1.6 | Zarejestruj nowego użytkownika (email: `test@example.com`, hasło: `Test1234!`) | Przekierowanie na `/` (dashboard), użytkownik zalogowany | |
| 1.7 | Spróbuj zarejestrować ten sam email ponownie | Błąd: email już istnieje | |
| 1.8 | Wyloguj się, zarejestruj drugiego użytkownika (`admin@test.com`) | Sukces | |

---

## 2. Logowanie

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 2.1 | Wejdź na `/auth/login` | Formularz logowania z polami email i password | |
| 2.2 | Wyślij pusty formularz | Walidacja: pola wymagane | |
| 2.3 | Wpisz nieistniejący email + dowolne hasło | Komunikat: "Invalid credentials" (bez ujawniania czy email istnieje) | |
| 2.4 | Wpisz poprawny email + złe hasło | Komunikat: "Invalid credentials" (taki sam jak dla nieistniejącego emaila) | |
| 2.5 | Zaloguj się (`test@example.com` / `Test1234!`) | Przekierowanie na `/`, widać dashboard z sidebar | |
| 2.6 | Odśwież stronę | Użytkownik nadal zalogowany (sesja w httpOnly cookie) | |
| 2.7 | Usuń ciasteczko `token` (DevTools → Application → Cookies) i odśwież | Przekierowanie na `/auth/login` | |

---

## 3. Dashboard / Layout

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 3.1 | Po zalogowaniu, sprawdź layout | Sidebar po lewej: logo "UBEK", przycisk "New Chat", lista projektów, user info + logout | |
| 3.2 | Kliknij "New Chat" | Przekierowanie na `/chat` lub otwarcie nowego czatu | |
| 3.3 | Kliknij w nazwę użytkownika na dole sidebaru | Menu lub info o użytkowniku (email, rola) | |
| 3.4 | Kliknij "Logout" | Wylogowanie, przekierowanie na `/auth/login` | |
| 3.5 | Po wylogowaniu, cofnij w przeglądarce | Przekierowanie na `/auth/login` (brak dostępu do dashboardu) | |

---

## 4. Chat

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 4.1 | Wejdź na `/chat` | Pusty czat z tekstem "Start a conversation" | |
| 4.2 | Wpisz wiadomość i naciśnij Enter | Wiadomość pojawia się po prawej (user), odpowiedź po lewej (assistant) | |
| 4.3 | Wpisz długą wiadomość (>1000 znaków) | Wiadomość wysłana, scroll w dół działa | |
| 4.4 | Wyślij wiadomość i podczas odpowiedzi kliknij "Stop" (czerwony przycisk) | Odpowiedź przerywa się | |
| 4.5 | Shift+Enter w polu tekstowym | Nowa linia (nie wysyła formularza) | |
| 4.6 | Wyślij pustą wiadomość (sam enter) | Nic się nie dzieje (przycisk disabled) | |
| 4.7 | Wyślij wiadomość z HTML/JS (`<script>alert('xss')</script>`) | Tekst wyświetlony bezpiecznie, brak execution | |

---

## 5. Gems (Projekty)

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 5.1 | Kliknij "Gems" w sidebarze | Lista gemów: karty z nazwą, opisem, ikoną | |
| 5.2 | Strona pusta (brak gemów) | Tekst: "Create your first gem" | |
| 5.3 | Kliknij "New Gem" | Formularz z polami: name, description, instructions | |
| 5.4 | Utwórz gema o nazwie "General" | Nowy gem pojawia się na liście | |
| 5.5 | Utwórz drugiego gema "Development" | Oba gemy widoczne jako karty | |
| 5.6 | Kliknij w kartę gema | Przekierowanie na `/chat?project={id}` | |
| 5.7 | Kliknij "Edit" na gemie | Formularz edycji z wypełnionymi danymi | |
| 5.8 | Kliknij "Delete" na gemie | Gem usunięty, znika z listy | |

---

## 6. Vault

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 6.1 | Kliknij "Vault" w sidebarze | Strona z tabelą plików i przyciskiem "Upload" | |
| 6.2 | Strona pusta (brak plików) | Tekst: "No files uploaded yet" z ikoną | |
| 6.3 | Kliknij "Upload" i wybierz plik `.txt` | Plik pojawia się w tabeli | |
| 6.4 | Wyszukaj plik po nazwie w polu search | Tabela filtruje się | |
| 6.5 | Kliknij "Download" na pliku | Plik pobiera się | |
| 6.6 | Kliknij "Delete" na pliku | Plik usunięty, znika z tabeli | |
| 6.7 | Uploaduj plik o rozmiarze >100MB | Błąd: przekroczony limit (jeśli backend waliduje) | |

---

## 7. Admin (Extension Requests)

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 7.1 | Kliknij "Admin" w sidebarze | Strona z listą extension requests | |
| 7.2 | Strona pusta | Tekst: "No extension requests" | |
| 7.3 | Kliknij filtr "Pending" | Widoczne tylko pending requests | |
| 7.4 | Kliknij filtr "Approved" | Widoczne tylko approved requests | |
| 7.5 | Kliknij "Approve" na pending requeście | Status zmienia się na approved (UI) | |
| 7.6 | Kliknij "Reject" na pending requeście | Status zmienia się na rejected (UI) | |
| 7.7 | Kliknij "All" | Wszystkie requesty widoczne | |

---

## 8. Bezpieczeństwo

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 8.1 | Zaloguj się, otwórz DevTools → Network → spr.
dowolne POST API | W nagłówkach widoczny `x-csrf-token` | |
| 8.2 | Wyślij POST do `/api/auth/login` z DevTools (bez CSRF) console | Status 403: CSRF validation failed | |
| 8.3 | Sprawdź ciasteczko `token` | httpOnly, SameSite=Strict, Secure (w prod) | |
| 8.4 | Spróbuj dostać się do `/api/auth/me` bez ciasteczka | 401 Unauthorized | |
| 8.5 | Wyślij wiele requestów (30+) do `/api/chat/stream` w ciągu minuty | 429 Rate limit exceeded | |

---

## 9. Obsługa błędów

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 9.1 | Wyłącz Router LLM, wyślij wiadomość w chacie | Komunikat błędu, nie crash | |
| 9.2 | Wyłącz Pi Agent (:4000), wyślij wiadomość | 502 Upstream error | |
| 9.3 | Odśwież stronę podczas streamowania odpowiedzi | Stream przerwany, bez crasha | |
| 9.4 | Otwórz aplikację w 2 kartach jednocześnie | Obie działają niezależnie | |

---

## 10. Responsywność

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 10.1 | Otwórz aplikację na 375px (Mobile M) | Layout responsywny, sidebar ukryty (hamburger) | |
| 10.2 | Otwórz na 768px (Tablet) | Layout tabletowy | |
| 10.3 | Otwórz na 1920px (Desktop) | Layout desktopowy, sidebar widoczny | |
| 10.4 | Zmień rozmiar okna | Layout dostosowuje się płynnie | |

---

## 11. Wydajność

| # | Test | Oczekiwany rezultat | ✅ |
|---|---|---|---|
| 11.1 | Załaduj stronę główną | Lighthouse Performance >80 (lub First Contentful Paint <2s) | |
| 11.2 | Przejdź między stronami (gems → vault → admin) | Nawigacja bez pełnego przeładowania (App Router) | |
| 11.3 | Wyślij wiadomość w chacie | Pierwszy token odpowiedzi w <3s | |

---

## Uwagi dla testera

- **Bug → zgłoś z:**
  - krokiem do reprodukcji
  - oczekiwanym vs rzeczywistym rezultatem
  - URL i screenshotem
  - konsolą błędów (F12 → Console)
- **Priorytety:**
  - P1: critical (logowanie, chat, dostęp do danych)
  - P2: high (główne funkcje działają ale z błędami)
  - P3: medium (działa ale UX cierpi)
  - P4: low (kosmetyka)
