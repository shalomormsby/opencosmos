export default function ContributePage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Create Your First Experiment
        </h1>
        <p className="text-xl text-foreground/70">
          The Creative Sandbox is open to everyone. This guide will walk you through adding your own experiment,
          even if you've never used GitHub before.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12 p-6 rounded-xl border border-[var(--color-glass-border)] bg-background-secondary/30">
        <h2 className="text-2xl font-bold text-foreground mb-3">
          What You'll Learn
        </h2>
        <ul className="space-y-2 text-foreground/80">
          <li className="flex items-start gap-3">
            <span className="text-primary mt-1">✓</span>
            <span>How to fork this repository (make your own copy)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary mt-1">✓</span>
            <span>How to create a new experiment folder and file</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary mt-1">✓</span>
            <span>How to add your experiment to the registry</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary mt-1">✓</span>
            <span>How to submit your changes (create a Pull Request)</span>
          </li>
        </ul>
      </section>

      {/* Step 1 */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            1
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Fork the Repository
          </h2>
        </div>

        <div className="pl-13 space-y-4">
          <p className="text-foreground/80">
            "Forking" means making your own copy of the project on GitHub where you can make changes without affecting
            the original.
          </p>

          <div className="p-4 rounded-lg bg-background-secondary/50 border border-[var(--color-glass-border)]">
            <p className="font-medium text-foreground mb-2">
              Steps:
            </p>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
              <li>Go to <a href="https://github.com/shalomormsby/ecosystem" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">github.com/shalomormsby/ecosystem</a></li>
              <li>Click the "Fork" button in the top-right corner</li>
              <li>Click "Create fork" (keep the default settings)</li>
              <li>You now have your own copy! The URL will be: github.com/YOUR-USERNAME/ecosystem</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            2
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Create Your Experiment File
          </h2>
        </div>

        <div className="pl-13 space-y-4">
          <p className="text-foreground/80">
            You'll create a new page for your experiment in the appropriate category folder.
          </p>

          <div className="p-4 rounded-lg bg-background-secondary/50 border border-[var(--color-glass-border)]">
            <p className="font-medium text-foreground mb-2">
              Choose a category:
            </p>
            <ul className="space-y-2 text-sm text-foreground/80 ml-4">
              <li><strong className="text-foreground">games/</strong> - Playable interactive experiences</li>
              <li><strong className="text-foreground">visualizations/</strong> - Math and generative art</li>
              <li><strong className="text-foreground">animations/</strong> - Motion technique experiments</li>
              <li><strong className="text-foreground">tools/</strong> - Functional utilities</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-background-secondary/50 border border-[var(--color-glass-border)]">
            <p className="font-medium text-foreground mb-2">
              Steps:
            </p>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
              <li>In your forked repo, navigate to: <code className="text-primary bg-background-secondary px-1 rounded">apps/creative-powerup/app/</code></li>
              <li>Click into your category folder (e.g., <code className="text-primary bg-background-secondary px-1 rounded">games/</code>)</li>
              <li>Click "Add file" → "Create new file"</li>
              <li>Name it: <code className="text-primary bg-background-secondary px-1 rounded">my-experiment/page.tsx</code> (replace "my-experiment" with your slug)</li>
              <li>Paste the template code below ↓</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <p className="font-mono text-xs text-gray-300 mb-3">Template Code:</p>
            <pre className="text-xs text-gray-100 overflow-x-auto">
              <code>{`export default function MyExperiment() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          My Experiment
        </h1>
        <p className="text-xl text-foreground/70">
          Replace this with your experiment code!
        </p>

        {/* Add your code here */}
      </div>
    </div>
  );
}`}</code>
            </pre>
          </div>

          <div className="p-4 rounded-lg bg-background-secondary/30 border border-primary/20">
            <p className="text-sm text-foreground/80">
              <strong className="text-primary">💡 Tip:</strong> Use design-system components for styling consistency:
            </p>
            <pre className="text-xs text-foreground/70 mt-2 overflow-x-auto">
              <code>{`import { Button, Card } from '@opencosmos/ui';
import { useMotionPreference } from '@opencosmos/ui/hooks';`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            3
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Add to Registry
          </h2>
        </div>

        <div className="pl-13 space-y-4">
          <p className="text-foreground/80">
            Now tell the gallery about your experiment by adding it to the registry file.
          </p>

          <div className="p-4 rounded-lg bg-background-secondary/50 border border-[var(--color-glass-border)]">
            <p className="font-medium text-foreground mb-2">
              Steps:
            </p>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
              <li>Navigate to: <code className="text-primary bg-background-secondary px-1 rounded">apps/creative-powerup/lib/experiments.ts</code></li>
              <li>Click the pencil icon to edit the file</li>
              <li>Find the <code className="text-primary bg-background-secondary px-1 rounded">experiments</code> array</li>
              <li>Add your experiment entry at the end (copy template below)</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <p className="font-mono text-xs text-gray-300 mb-3">Registry Entry Template:</p>
            <pre className="text-xs text-gray-100 overflow-x-auto">
              <code>{`{
  slug: 'my-experiment',
  title: 'My Cool Experiment',
  category: 'games', // or 'visualizations', 'animations', 'tools'
  description: 'A short description of what your experiment does (1-2 sentences).',
  author: 'Your Name',
  path: '/games/my-experiment', // match your category
  dateAdded: '2025-12-17', // today's date
  tags: ['creative', 'interactive'], // optional tags
},`}</code>
            </pre>
          </div>

          <div className="p-4 rounded-lg bg-background-secondary/30 border border-primary/20">
            <p className="text-sm text-foreground/80">
              <strong className="text-primary">⚠️ Important:</strong> Don't forget the comma at the end! Make sure your entry has the same formatting as the others.
            </p>
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            4
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Submit Your Changes (Pull Request)
          </h2>
        </div>

        <div className="pl-13 space-y-4">
          <p className="text-foreground/80">
            A "Pull Request" (PR) is how you ask to add your changes to the main project.
          </p>

          <div className="p-4 rounded-lg bg-background-secondary/50 border border-[var(--color-glass-border)]">
            <p className="font-medium text-foreground mb-2">
              Steps:
            </p>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
              <li>After committing your changes, GitHub will show a yellow banner at the top</li>
              <li>Click "Compare & pull request"</li>
              <li>Write a title: "Add [your experiment name] to Creative Sandbox"</li>
              <li>In the description, explain what your experiment does and why it's cool</li>
              <li>Click "Create pull request"</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-background-secondary/30 border border-primary/20">
            <p className="text-sm text-foreground/80">
              <strong className="text-primary">🎉 That's it!</strong> A maintainer will review your PR and give feedback. Once approved, your experiment will appear in the gallery!
            </p>
          </div>
        </div>
      </section>

      {/* Need Help? */}
      <section className="p-8 rounded-2xl border border-[var(--color-glass-border)] bg-background-secondary/50">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Need Help?
        </h2>
        <p className="text-foreground/70 mb-6">
          Stuck on a step? Have questions? We're here to help!
        </p>
        <div className="space-y-3">
          <div>
            <strong className="text-foreground">GitHub Discussions:</strong>{' '}
            <a href="https://github.com/shalomormsby/ecosystem/discussions" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Ask a question →
            </a>
          </div>
          <div>
            <strong className="text-foreground">GitHub Issues:</strong>{' '}
            <a href="https://github.com/shalomormsby/ecosystem/issues" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Report a bug →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
