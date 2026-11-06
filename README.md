# Nanini's Café — App da Equipe

Interface de gestão do cardápio digital, acessada pela equipe do café. Permite gerenciar pedidos em tempo real, manter o cardápio de produtos e consultar relatórios de vendas.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | JavaScript (React 19) |
| Framework | Expo / React Native |
| Plataforma alvo | Web (tablet ou computador do balcão) |
| Estilização | StyleSheet (React Native) |
| Upload de imagens | expo-image-picker (base64 → API → S3) |
| Infra | AWS Amplify Hosting (build estático) |

## Funcionalidades

- **Login** — autenticação com e-mail e senha, token JWT armazenado em memória
- **Pedidos** — lista paginada com filtros (em andamento / entregues / todos), atualização automática a cada 8 s, avanço de status com um toque, exportação CSV com filtro de período
- **Cardápio** — criação e edição de produtos com foto (galeria do dispositivo ou link externo), controle de disponibilidade (ativo/pausado), seleção de categoria
- **Dashboard** — faturamento, número de pedidos, ticket médio, top 5 produtos, pedidos por status; períodos predefinidos (hoje, 7, 30, 90 dias) ou intervalo personalizado

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base da API (Elastic Beanstalk). O prefixo `EXPO_PUBLIC_` é obrigatório para o Expo incluir a variável no bundle. |

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
# edite EXPO_PUBLIC_API_URL com o endereço local da API
```

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variável de ambiente
cp .env.example .env
# edite .env: EXPO_PUBLIC_API_URL=http://localhost:8000

# 3. Iniciar no navegador
npm run web
# Abre em http://localhost:8081
```

> A API precisa estar rodando localmente ou apontar para o ambiente de staging.
> As credenciais de login são as definidas em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no backend.

## Build para produção (Amplify)

O Amplify executa automaticamente ao fazer push para a branch conectada:

```bash
npx expo export --platform web
# Gera a pasta dist/ com o site estático
```

O arquivo `amplify.yml` na raiz do projeto configura esse processo automaticamente.

## Deploy manual

```bash
npx expo export --platform web
# O conteúdo de dist/ pode ser servido por qualquer CDN ou servidor estático
```

## Rodando os testes

```bash
npm test -- --watchAll=false
```

## Estrutura do projeto

```
cardapio_digital_naninis_staff_frontend/
├── App.js               # Aplicação completa (login, pedidos, cardápio, dashboard)
├── index.js             # Entry point Expo
├── app.json             # Configuração Expo (slug, ícones, web output)
├── amplify.yml          # Build spec do Amplify Hosting
├── .env.example         # Template de variáveis de ambiente
├── src/
│   ├── api.js           # Chamadas HTTP autenticadas para a API
│   └── theme.js         # Paleta de cores e formatador de moeda
├── assets/              # Ícones e splash screen
├── __mocks__/
│   └── expo-image-picker.js   # Mock do image picker para testes
└── __tests__/
    ├── api.test.js
    ├── Btn.test.js
    ├── product-validation.test.js
    └── status.test.js
```
