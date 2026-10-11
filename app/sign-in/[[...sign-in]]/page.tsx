import { SignIn } from '@clerk/nextjs';

// Sin registro: solo entra quien ya tiene cuenta y está en ADMIN_ALLOWED_EMAILS.
export default function Page() {
  return (
    <main className="app-main">
      <SignIn
        forceRedirectUrl="/admin"
        withSignUp={false}
        appearance={{ elements: { footerAction: { display: 'none' } } }}
      />
    </main>
  );
}
