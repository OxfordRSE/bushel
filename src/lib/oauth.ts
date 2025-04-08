export async function redirectToFigShareAuth() {
  const res = await fetch('/api/auth/redirect');
  if (!res.ok) {
    console.error('OAuth redirect setup failed');
    return;
  }

  const { url } = await res.json();
  console.log('Redirecting to FigShare OAuth:', url);
  window.location.href = url;
}

