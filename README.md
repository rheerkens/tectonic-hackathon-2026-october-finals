# SDtrust with Finn

<img src="docs/presentation/v3/assets/Finn_wave.png" alt="Finn waving" width="160">

**SDtrust: answers you can trust, or the right colleague to ask**

SD Worx consultants don't lack information. They have too much of it, spread across Teams, mail, the CRM and procedures, and nothing tells them which version is right. SDtrust puts **Finn**, a small companion, on your desktop. When you ask Finn a question, it gives you the answer or the next step, a **trust score** and the **sources behind it**. When trust is too low, Finn doesn't guess. It asks the colleague who knows and writes their answer back into the CRM, so the next person gets it straight away. Nobody has to write documentation.

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
