# SDtrust with Finn

<img src="docs/presentation/v3/assets/Finn_wave.png" alt="Finn waving" width="160">

Tectonic hackathon finals, SD Worx challenge. Finn is a desktop mascot that answers work questions with a next step, a trust score and its sources. When trust is low, Finn asks the colleague who knows.

## Run

```sh
bun setup
bun dev            # web + API
bun run desktop    # Electron app
```

## Unfinished

- Answers are scripted demo scenarios; no live model.
- Data is fake; no real Teams, mail or CRM.
- Contacting colleagues is simulated.

More: [docs/development.md](docs/development.md), [docs/plan.md](docs/plan.md).
