import Link from 'next/link';
import { Button } from '@opencosmos/ui';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Not Found</h2>
            <p className="text-xl text-foreground opacity-70 mb-8">Could not find requested resource</p>
            <Link href="/">
                <Button>Return Home</Button>
            </Link>
        </div>
    );
}
