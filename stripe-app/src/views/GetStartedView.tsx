import { Banner, Box, Button, Spinner, TextField } from '@stripe/ui-extension-sdk/ui';
import { useState, useEffect } from 'react';
import type { ZendeskOAuth } from '../hooks/useZendeskOAuth';

interface Props {
  oauth: ZendeskOAuth;
}

function extractSubdomainFromUrl(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?([a-z0-9-]+)\.zendesk\.com\/?$/);
  return urlMatch ? urlMatch[1] : null;
}

function isValidZendeskUrl(input: string): boolean {
  return extractSubdomainFromUrl(input) !== null;
}

export default function GetStartedView({ oauth }: Props) {
  const [url, setUrl] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const subdomain = extractSubdomainFromUrl(url);
  const isValidInput = isValidZendeskUrl(url);

  useEffect(() => {
    setAuthUrl(null);
    if (!subdomain) return;
    let cancelled = false;
    oauth.buildAuthUrl(subdomain).then(result => {
      if (!cancelled && result) setAuthUrl(result.url);
    });
    return () => { cancelled = true; };
  }, [subdomain, oauth]);

  return (
    <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

      {oauth.sessionExpired && (
        <Banner
          type="caution"
          title="Session expired"
          description="Your Zendesk session has expired. Paste your Zendesk URL below to reconnect."
        />
      )}

      {oauth.error && (
        <Banner type="critical" title="Connection error" description={oauth.error} />
      )}

      {!oauth.sessionExpired && !oauth.error && (
        <Box css={{ font: 'body', color: 'secondary' }}>
          Connect your Zendesk account to view and manage support tickets alongside Stripe payments.
        </Box>
      )}

      <TextField
        label="Your Zendesk URL"
        placeholder="e.g., https://company.zendesk.com"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <Box css={{ font: 'caption', color: 'secondary' }}>
        Paste your Zendesk URL from the browser (e.g., company.zendesk.com or the full https://… URL)
      </Box>

      <Button
        type="primary"
        disabled={!isValidInput || oauth.isWaiting || !authUrl}
        href={authUrl ?? undefined}
        target="_blank"
        onPress={oauth.onLinkPress}
      >
        {oauth.isWaiting ? 'Completing authorization…' : 'Connect to Zendesk ↗'}
      </Button>

      {oauth.isWaiting && (
        <Box css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
          <Spinner size="small" />
          <Box css={{ font: 'caption', color: 'secondary' }}>
            Completing Zendesk authorization. This may take a few seconds.
          </Box>
        </Box>
      )}

    </Box>
  );
}
