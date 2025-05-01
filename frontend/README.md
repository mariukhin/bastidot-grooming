# 🚀 Frontend

A modern frontend application built with **Next.js 15**, **React 19**, and **TypeScript**, pre-configured with ESLint, Prettier, and Git hooks via Husky.

---

## 📦 Stack

- **Next.js 15** (App Router, Server Components)
- **React 19**
- **TypeScript**
- **ESLint** + **Prettier** for code quality & formatting
- **Husky** + **lint-staged** for pre-commit enforcement

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

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `yarn lint`     | Runs Next.js linting (default config)       |
| `yarn lint:all` | Lints entire codebase (`.ts/.tsx/.js/.jsx`) |
| `yarn lint:fix` | Lints and auto-fixes issues                 |
| `yarn format`   | Formats all files using Prettier            |

> Automatically run on staged files during commit via `lint-staged`.

---

## ✅ Pre-commit Hook

Husky and lint-staged are configured to:

- Run `eslint --fix` on staged `.ts`, `.tsx`, `.js`, `.jsx` files
- Run `prettier --write` on code, JSON, Markdown, and styles
- Block commit on lint or format errors

### Example:

```bash
git add .
git commit -m "Add new feature"
# lint-staged runs automatically
```

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
├── eslint.config.js  # Flat ESLint config
└── tsconfig.json     # TypeScript config
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
