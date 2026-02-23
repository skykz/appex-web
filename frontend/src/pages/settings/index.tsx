/**
 * Settings page - user preferences and configuration.
 */
export default function SettingsPage() {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
      <div className="px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="bg-card rounded-lg border">
            <div className="p-6">
              <h3 className="mb-4 font-semibold">Profile</h3>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
