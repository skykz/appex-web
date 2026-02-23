/**
 * Prompts Library page - curated prompts for automation.
 */
export default function PromptsLibraryPage() {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
      <div className="px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Prompts library</h1>
          <p className="text-muted-foreground mt-2">
            Curated prompts to accelerate your automation journey
          </p>
        </div>
        <div className="bg-muted rounded-lg p-8">
          <p className="text-muted-foreground">
            Browse prompt categories and save your favorites.
          </p>
        </div>
      </div>
    </div>
  )
}
