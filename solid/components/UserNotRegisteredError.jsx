/** Shown when a signed-in Google account is not registered for this app. */
export default function UserNotRegisteredError() {
  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div class="max-w-md w-full p-8 bg-card rounded-lg shadow-lg border border-border">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-foreground mb-4">Access Restricted</h1>
          <p class="text-muted-foreground mb-8">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div class="p-4 bg-muted rounded-md text-sm text-muted-foreground">
            <p>If you believe this is an error, you can:</p>
            <ul class="list-disc list-inside mt-2 space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
