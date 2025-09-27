```bash
npm run build
```

Then

```bash
npm run dev
```

Since stripe webhook needs to hit backend url , use port forwarding apps like ngrok.
And since webhooks are set in dashboard advised to use your own tokens with endpoint secret of webhook.