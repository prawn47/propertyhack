# Release Smoke Checklist

- Auth flow: login; refresh token still valid after 30 min idle
- Create → Draft → Publish to LinkedIn: success path; failure preserves draft
- Scheduling: create/edit/cancel; scheduled prompt at time (v1 behavior)
- LinkedIn connect/disconnect: status reflects correctly after redirect
- X Prep: character guidance + copy/open flow
- Accessibility: tab through controls; visible focus; form labels; color contrast >= 4.5:1
- Performance: idea/draft gen < 10s (warn at 10s with retry CTA); publish feedback < 5s
