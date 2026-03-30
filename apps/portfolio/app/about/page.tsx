import Link from 'next/link';
import { Button, Breadcrumbs } from '@opencosmos/ui';

export default function About() {
    return (
        <main className="min-h-screen p-8 max-w-3xl mx-auto">
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'About' }
                ]}
                className="mb-6"
            />
            <h1 className="text-4xl font-bold mb-6 text-foreground">About Me</h1>
            <p className="text-xl text-foreground opacity-80 mb-6">
                I am a product design leader focused on human-centered systems.
                I believe that tools should empower people, not just consume their attention.
            </p>
            <p className="text-lg text-foreground opacity-70 mb-8">
                This portfolio is a living ecosystem, built to demonstrate my philosophy through code and design.
                "One mind, many expressions."
            </p>
            <Link href="/">
                <Button variant="ghost">← Back Home</Button>
            </Link>
        </main>
    );
}
