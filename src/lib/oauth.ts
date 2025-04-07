export function redirectToFigShareAuth() {
  if (process.env.NODE_ENV === "development") {
    window.location.href = "/api/auth/callback?code=mock-code";
    return;
  }

  const clientId = process.env.NEXT_PUBLIC_FIGSHARE_CLIENT_ID!;
  const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback`);
  const authUrl = `https://figshare.com/account/applications/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
  window.location.href = authUrl;
}
