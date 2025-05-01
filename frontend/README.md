# 🚀 Frontend

A modern frontend application built with **Next.js 15**, **React 19**, and **TypeScript**, pre-configured with ESLint, Prettier, Husky, lint-staged, and Commitlint.

---

## 📦 Stack

- **Next.js 15** (App Router, Server Components)
- **React 19**
- **TypeScript**
- **ESLint** + **Prettier** for code quality & formatting
- **Husky** + **lint-staged** for pre-commit enforcement
- **Commitlint** for consistent commit messages

---

## 🛠 Getting Started

```bash
git clone https://github.com/your-org/your-repo.git
cd your-repo
yarn install
```

This installs dependencies and automatically sets up Husky pre-commit hooks.

To start the development server:

```bash
yarn dev
```

---

## 🧹 Linting & Formatting

Available commands:

| Command         | Description                                |
| --------------- | ------------------------------------------ |
| `yarn lint`     | Runs Next.js linting                       |
| `yarn lint:all` | Lints the entire codebase (`.ts/.tsx/.js`) |
| `yarn lint:fix` | Auto-fixes lint issues                     |
| `yarn format`   | Formats code using Prettier                |

> Automatically applied to staged files during commit via `lint-staged`.

---

## ✅ Git Hooks

### Pre-commit (via Husky + lint-staged)

- Runs `eslint --fix` on staged JS/TS files
- Runs `prettier --write` on staged code, styles, and Markdown files

### Commit message (via Husky + Commitlint)

- Enforces [Conventional Commits](https://www.conventionalcommits.org/)
- Prevents commits with incorrect message format

#### Example valid commit messages:

```bash
feat: add booking form
fix: correct form validation
chore: configure commitlint
docs: update readme
```

If your commit message doesn't match the pattern, it will be rejected.

---

## ✨ Project Structure (if using `/app` directory)

```
├── app/              # App Router pages
├── components/       # Shared UI components
├── lib/              # Utilities, API clients, etc.
├── public/           # Static assets
├── styles/           # Global and modular styles
├── .husky/           # Git hooks
├── .vscode/          # Recommended settings
├── eslint.config.mjs # Flat ESLint config
├── commitlint.config.js # Commit message rules
└── tsconfig.json     # TypeScript config
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Contributing

PRs and contributions are welcome! Just make sure to:

1. Use `yarn lint:fix` before commit.
2. Follow project code style (enforced via Prettier & ESLint).
3. Use conventional commit messages (enforced via Commitlint).
