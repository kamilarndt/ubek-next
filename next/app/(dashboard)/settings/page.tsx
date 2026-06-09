"use client"

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  const joinDate = "—";

  return (
    <main className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Ustawienia
      </h1>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Profil</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Twoje dane osobowe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                {user.name?.[0] ?? "U"}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Zarejestrowany: {joinDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Preferencje</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Dostosuj swoje doświadczenie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Język interfejsu
                </p>
                <p className="text-sm text-muted-foreground">
                  Polski (domyślny)
                </p>
              </div>
              {/* Placeholder for language selector */}
              <Button variant="outline" size="sm" disabled>
                PL
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Motyw kolorystyczny
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dostosuj wygląd aplikacji
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Jasny</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={false}
                    onChange={() => {}}
                    className="h-4 w-6"
                  />
                  <span className="text-sm text-muted-foreground">Ciemny</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Konto</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Zarządzaj swoim kontem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="default"
              className="w-full"
              onClick={logout}
            >
              Wyloguj się
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
