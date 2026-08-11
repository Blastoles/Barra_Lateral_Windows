# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Sistema de notificações flutuantes Toast (substituindo diálogos `alert`).
- Tela de estado vazio (Empty State) profissional para a lista de atalhos.
- Suporte a empacotamento NSIS executável (`.exe`).
- Workflows automatizados com GitHub Actions para compilação e publicação de releases.
- Configuração de Linting e Formatação (`Prettier` + `ESLint`).

---

## [0.2.0] - 2026-08-11

### Adicionado
- **Inicialização automática no Boot** (`tauri-plugin-autostart`) com opção configurável.
- **Proteção contra Fechamento Acidental (Hide-on-Close)** e **System Tray** com menu contextual.
- **Instância Única (`tauri-plugin-single-instance`)**.
- **Gerenciador Avançado de Atalhos**: Edição, reordenação (Subir/Descer) e seletor nativo de arquivos.
- **Posicionamento Flexível**: Escolha entre lado Direito ou Esquerdo da tela.
- **Suporte Multi-Monitor**: Seleção do monitor de exibição.
- **Backup e Restauração**: Exportação e importação de atalhos em arquivo JSON.
- **Persistência Profissional**: Dados salvos na pasta `%APPDATA%\com.blastoles.barralateral\`.
- **Cópia de Mídia & Asset Protocol**: Arquivos de vídeo/áudio copiados para diretório seguro e servidos via `http://asset.localhost/` com suporte a Range Headers.

---

## [0.1.0] - 2026-08-11

### Adicionado
- Lançamento inicial da Barra Lateral Windows flutuante.
- Interface glassmorphism inspirada no macOS.
- Suporte a atalhos globais de teclado no Windows.
- Player interno de áudio e vídeo em HTML5/JS.
