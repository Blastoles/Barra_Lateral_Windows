# Guia de Contribuição — Barra Lateral Windows

Obrigado pelo seu interesse em contribuir para o **Barra Lateral Windows**! 🚀

---

## 🛠️ Como Configurar o Ambiente de Desenvolvimento

### Pré-requisitos
1. **Node.js** (v18+)
2. **Rust** (1.77+ com `cargo`)
3. **Visual Studio C++ Build Tools** (para compilar dependências Rust no Windows)

### Passos de Instalação
```bash
# Clone o repositório
git clone https://github.com/Blastoles/Barra_Lateral_Windows.git
cd Barra_Lateral_Windows

# Instale as dependências
npm install

# Inicie em modo desenvolvimento (com Hot Reload)
npm run dev
```

---

## 📐 Padrões de Código

- **JavaScript / HTML / CSS**: Executamos o Prettier e ESLint para manter o código limpo e consistente.
  ```bash
  npm run format   # Formata o código automaticamente
  npm run lint     # Verifica erros de estilização
  ```
- **Rust**: O código Rust deve passar sem avisos no Clippy.
  ```bash
  cd src-tauri
  cargo check
  cargo clippy
  ```

---

## 🔄 Fluxo de Trabalho de Git

1. Crie uma branch para a sua alteração:
   ```bash
   git checkout -b feature/sua-feature-aqui
   # ou
   git checkout -b fix/seu-bugfix-aqui
   ```
2. Faça os commits com mensagens descritivas seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):
   - `feat: adiciona suporte a novos temas`
   - `fix: corrige posicionamento no monitor secundário`
3. Abra um Pull Request contra a branch `main`.

---

## 📄 Licença

Ao contribuir com este projeto, você concorda que suas contribuições serão licenciadas sob a licença MIT do projeto.
