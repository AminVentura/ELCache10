import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="app-main">
      <SignUp forceRedirectUrl="/admin" signInUrl="/sign-in" />
    </main>
  );
}
