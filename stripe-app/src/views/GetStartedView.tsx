import { Banner, Box, Button, Divider, Icon, Img, Spinner, TextField } from '@stripe/ui-extension-sdk/ui';
import { useState, useEffect } from 'react';
import type { ZendeskOAuth } from '../hooks/useZendeskOAuth';
import { ZENDESK_BRAND_ICON } from '../types';

const STRIPE_ICON = 'https://gbtzgszldsarfwzcqoiz.supabase.co/storage/v1/object/public/assets/stripe-icon.svg';
const PREMIER_PARTNER_BADGE = 'https://gbtzgszldsarfwzcqoiz.supabase.co/storage/v1/object/public/assets/stripe-premier-partner.png';

interface Props {
  oauth: ZendeskOAuth;
}


const FEATURES = [
  {
    icon: 'notifications' as const,
    title: 'TICKETS PER CUSTOMER',
    desc: 'See every Zendesk ticket alongside a customer\'s payments and subscriptions.',
  },
  {
    icon: 'lightningBolt' as const,
    title: 'REPLY WITHOUT SWITCHING TABS',
    desc: 'Add comments, update status, and change priority without leaving Stripe.',
  },
  {
    icon: 'settings' as const,
    title: 'CREATE TICKETS INSTANTLY',
    desc: 'Open new support tickets for any customer directly from their Stripe profile.',
  },
];

function extractSubdomainFromUrl(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?([a-z0-9-]+)\.zendesk\.com\/?$/);
  return urlMatch ? urlMatch[1] : null;
}

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function GetStartedView({ oauth }: Props) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const subdomain = extractSubdomainFromUrl(url);
  const canConnect = isValidEmail(email) && !!subdomain && !!authUrl && !oauth.isWaiting;

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
    <Box css={{ stack: 'y' }}>

      {/* Top: logo row + form, no top padding */}
      <Box css={{ padding: 'large', paddingTop: 'medium', stack: 'y', gapY: 'medium', alignX: 'center' }}>

        {/* Stripe → Zendesk logos */}
        <Box css={{ stack: 'x', gapX: 'small', alignY: 'center', alignX: 'center' }}>
          <Box css={{ width: 32, height: 32, borderRadius: 'medium' }}>
            <Img src={STRIPE_ICON} alt="Stripe" width={32} height={32} />
          </Box>
          <Box css={{ font: 'body', color: 'secondary' }}>→</Box>
          <Box css={{ width: 32, height: 32, borderRadius: 'medium' }}>
            <Img src={ZENDESK_BRAND_ICON} alt="Zendesk" width={32} height={32} />
          </Box>
        </Box>

        <Box css={{ stack: 'y', gapY: 'xsmall', alignX: 'center' }}>
          <Box css={{ font: 'body', color: 'secondary' }}>
            Authenticate to Zendesk and view support tickets from Stripe.
          </Box>
        </Box>

        {oauth.sessionExpired && (
          <Banner
            type="caution"
            title="Session expired"
            description="Your Zendesk session has expired. Reconnect below."
          />
        )}
        {oauth.error && (
          <Banner type="critical" title="Connection error" description={oauth.error} />
        )}

        <Box css={{ stack: 'y', gapY: 'small', width: 'fill' }}>
          <TextField
            label="Email (required)"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Zendesk URL"
            placeholder="https://company.zendesk.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </Box>

        {oauth.isWaiting ? (
          <Box css={{ stack: 'y', gapY: 'small', alignX: 'center' }}>
            <Box css={{ stack: 'x', alignY: 'center', gapX: 'small' }}>
              <Spinner size="small" />
              <Box css={{ font: 'body', color: 'secondary' }}>Complete the authorization in the new tab…</Box>
            </Box>
            <Button type="secondary" size="small" onPress={oauth.cancelWaiting}>Cancel</Button>
          </Box>
        ) : (
          <Button
            type="primary"
            disabled={!canConnect}
            href={authUrl ?? undefined}
            target="_blank"
            onPress={oauth.onLinkPress}
          >
            Connect Zendesk <Icon name="external" size="xsmall" />
          </Button>
        )}
      </Box>

      <Divider />

      {/* Features on grey background */}
      <Box css={{ background: 'container', stack: 'y', gapY: 'large', padding: 'large' }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <Box key={title} css={{ stack: 'x', gapX: 'medium', alignY: 'top' }}>
            <Icon name={icon} size="medium" css={{ fill: 'brand' }} />
            <Box css={{ stack: 'y', gapY: 'xsmall' }}>
              <Box css={{ font: 'caption', color: 'secondary' }}>{title}</Box>
              <Box css={{ font: 'body', color: 'primary' }}>{desc}</Box>
            </Box>
          </Box>
        ))}

        <Divider />

        {/* Premier Partner badge */}
        <Box css={{ alignX: 'center' }}>
          <Img src={PREMIER_PARTNER_BADGE} alt="Stripe Premier Partner" width={200} height={40} />
        </Box>
      </Box>

    </Box>
  );
}
