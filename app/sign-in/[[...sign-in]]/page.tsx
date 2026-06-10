import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="app-main">
      <SignIn forceRedirectUrl="/admin" signUpUrl="/sign-up" />
    </main>
  );
}
