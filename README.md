<div align="center">

<img src="app-icon.svg" width="80" alt="Barra Lateral Logo" />

# Barra Lateral Windows

**Barra lateral flutuante para Windows — lançada com um toque, fixada na borda da tela.**

[![Tauri](https://img.shields.io/badge/Tauri-v2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blueviolet)](https://github.com/Blastoles/Barra_Lateral_Windows/releases)

</div>

---

## 📖 Sobre

**Barra Lateral Windows** é uma sidebar flutuante leve e discreta que fica fixada na borda direita da tela. Com um clique ela se expande revelando seus atalhos personalizados: URLs, aplicativos, ou sons/músicas — tudo acessível de forma instantânea sem poluir sua barra de tarefas.

Construída com **Rust + Tauri v2** e uma interface **glassmorphism** inspirada no macOS, ela foi pensada para quem quer produtividade sem abrir mão do visual.

---

## ✨ Funcionalidades

- 🖱️ **Drawer animado** — expande e colapsa suavemente a partir da borda direita da tela
- 🔗 **Atalhos de URL** — abra qualquer site no navegador padrão com um clique
- ⚙️ **Atalhos de App** — execute aplicativos ou comandos do Windows diretamente
- 🎵 **Player de mídia interno** — reproduza arquivos `.mp3`, `.mp4`, `.wav`, `.m4a`, `.ogg` e `.webm` sem abrir nenhum player externo
- ⌨️ **Atalhos de teclado globais** — acione qualquer atalho com combinações como `Alt+Shift+4` de qualquer lugar do Windows
- ➕ **Gerenciador de atalhos** — adicione, edite e remova atalhos por uma interface visual simples
- 💾 **Persistência local** — configurações salvas via `localStorage`, sem necessidade de banco de dados
- 🪟 **Sem barra de título** — janela transparente, sem decorações, sempre visível (`alwaysOnTop`)
- 🎨 **Visual glassmorphism** — efeito de vidro fosco com blur, gradientes e tipografia refinada

---

## 🧱 Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Backend / Shell | **Rust 2021** |
| Desktop Framework | **Tauri v2** |
| Atalhos Globais | `tauri-plugin-global-shortcut` |
| Abertura de URLs/Apps | `open` crate |
| Encode de Mídia | `base64` crate |
| Frontend | **HTML + CSS + JavaScript Vanilla** |
| Estilo | Glassmorphism (backdrop-filter, CSS vars) |
| Build | `@tauri-apps/cli` v2 |

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [**Rust**](https://rustup.rs/) (1.77+) com `cargo`
- [**Node.js**](https://nodejs.org/) (18+)
- [**Visual Studio C++ Build Tools**](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ou **MinGW-w64**
- [**WebView2 Runtime**](https://developer.microsoft.com/microsoft-edge/webview2/) (normalmente já incluso no Windows 10/11)

---

## 🚀 Instalação e Uso

### Modo Desenvolvimento (Hot Reload)

```bat
dev.bat
```

> Mata instâncias anteriores, configura o PATH e executa `npm run dev` com builds incrementais para máxima velocidade.

### Build de Produção

```bat
build.bat
```

> Gera o instalador em `src-tauri/target/release/bundle/`.

### Manualmente

```bash
npm install
npm run dev     # desenvolvimento
npm run build   # produção
```

---

## ⌨️ Atalhos de Teclado Globais

Cada atalho pode ter um hotkey do sistema operacional associado. Funciona em **qualquer janela ativa** do Windows.

**Exemplos de combinações suportadas:**

```
Alt+Shift+1
Ctrl+Alt+G
Alt+Shift+4
```

Configure os hotkeys na tela de **Configurações** (botão ⚙️ na barra lateral).

---

## ➕ Adicionando Atalhos

1. Clique no ícone ⚙️ na barra lateral para abrir as configurações
2. Preencha o formulário **"Adicionar Novo Atalho"**:
   - **Nome do Atalho** — título exibido na barra
   - **Subtítulo** — descrição curta
   - **Tipo de Atalho** — escolha entre:
     - `Link Web (URL)` → abre no navegador
     - `App / Comando Local` → executa um `.exe` ou comando
     - `Player de Som (MP4/MP3)` → toca no player interno
   - **Endereço** — URL, caminho do `.exe` ou caminho do arquivo de mídia
   - **Atalho de Teclado** *(opcional)* — ex: `Alt+Shift+4`
3. Clique em **Adicionar** ✓

---

## 🎵 Player de Mídia Interno

Arquivos de áudio e vídeo são reproduzidos **diretamente dentro da barra lateral**, sem abrir nenhum aplicativo externo.

**Formatos suportados:** `.mp3` · `.mp4` · `.wav` · `.m4a` · `.ogg` · `.webm` · `.mov`

O backend Rust lê o arquivo localmente e o entrega ao frontend como um **Data URL** (`data:video/mp4;base64,...`), contornando as restrições de CORS do WebView2 e garantindo reprodução instantânea.

---

## 📁 Estrutura do Projeto

```
Barra_Lateral_Windows/
├── src/                        # Frontend (HTML, CSS, JS)
│   ├── index.html              # Interface principal
│   ├── styles.css              # Estilos glassmorphism
│   └── main.js                 # Lógica da UI e comunicação Tauri
├── src-tauri/                  # Backend Rust
│   ├── src/
│   │   ├── lib.rs              # Comandos Tauri (drawer, atalhos, mídia)
│   │   └── main.rs             # Entrypoint
│   ├── Cargo.toml              # Dependências Rust
│   ├── tauri.conf.json         # Configuração da janela e bundle
│   └── capabilities/
│       └── default.json        # Permissões Tauri
├── dev.bat                     # Script de desenvolvimento rápido
├── build.bat                   # Script de build de produção
├── package.json                # Dependências Node
└── app-icon.svg                # Ícone do aplicativo
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para abrir uma _issue_ ou enviar um _pull request_.

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adicionar minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

Feito com ❤️ por **[Blastoles](https://github.com/Blastoles)**

</div>
