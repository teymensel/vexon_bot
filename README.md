# Vexon Bot

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

**Vexon Bot** is a powerful, modular, and scalable Discord bot designed to enhance server management and user engagement. Built with modern TypeScript and a monorepo structure, it offers a robust foundation for building complex Discord applications.

## 🚀 Features

*   **Modular Architecture**: Built using a monorepo structure for better code organization and scalability.
*   **Voice Channel Management**: Advanced voice channel commands and automation (`!!sesegel`).
*   **Dual Bot Support**: Capable of running multiple bot instances simultaneously.
*   **Robust Error Handling**: Comprehensive logging and error reporting systems.
*   **Easy Configuration**: Simple environment variable configuration.

## 🛠️ Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/teymensel/vexon_bot.git
    cd vexon_bot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Configuration:**
    *   Navigate to `apps/bot`.
    *   Copy `.env.example` to `.env`.
    *   Fill in your Discord API credentials.

    ```bash
    cd apps/bot
    cp .env.example .env
    ```

4.  **Build and Run:**
    ```bash
    npm run build
    npm start
    ```

## 🔄 Updating

To update to the latest version, simply pull the changes from the repository:

```bash
git pull origin main
npm install
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
