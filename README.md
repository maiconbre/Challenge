# 📅 Calendar App — Teste Junior Full-Stack

Aplicação de calendário dinâmico com visualizações semana/mês, drag-and-drop de eventos e operações CRUD em tempo real.

## Arquitetura

```
Frontend (SvelteKit + TypeScript)  →  Nginx (:5174)  →  Backend (.NET 8.0)  →  MongoDB
```

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Frontend | SvelteKit, TailwindCSS, DaisyUI | SPA estático (adapter-static) |
| Backend | .NET 8.0 ASP.NET Core | API REST |
| Banco de Dados | MongoDB | Armazenamento de eventos |
| DevOps | Docker Compose | Orquestração multi-container |

## Como Executar

```bash
unzip challenge.zip
docker compose up
# → http://localhost:5174
```

## Funcionalidades

- **Visualização Semana & Mês** — Layouts alternáveis com cabeçalhos de dias
- **CRUD de Eventos** — Criar, visualizar, atualizar e excluir via modais
- **Drag & Drop** — Arrastar eventos entre dias/horários na visão semanal
- **Sidebar** — Mini calendário, notas rápidas, botão de criar
- **Notificações Toast** — Feedback visual com códigos HTTP
- **Layout Responsivo** — Otimizado para desktop

## Estrutura do Projeto

```
Challenge/
├── backend/                  API REST .NET 8.0
│   ├── Controllers/          Endpoints da API
│   ├── Models/               Modelo CalendarEvent
│   └── Services/             Lógica CRUD + MongoDB
│
├── frontend/                 Aplicação SvelteKit
│   ├── src/
│   │   ├── routes/+page.svelte    App principal (página única)
│   │   └── lib/
│   │       ├── components/        WeekView, MonthView, Sidebar
│   │       ├── utils/             dateUtils, eventUtils (funções puras)
│   │       ├── api.ts             Cliente HTTP
│   │       ├── stores.ts          Svelte stores (modais, toasts, data)
│   │       └── types.ts           Interfaces TypeScript
│   ├── tests/
│   │   └── browser.spec.ts        12 testes Playwright
│   └── playwright.config.ts
│
├── docker-compose.yml
└── README.md
```

## Endpoints da API

| Método | Endpoint | Descrição | Status |
|--------|----------|-----------|--------|
| GET | `/api/events` | Listar todos os eventos | 200 |
| POST | `/api/events` | Criar evento | 201 |
| PUT | `/api/events/{id}` | Atualizar evento | 200 |
| DELETE | `/api/events/{id}` | Excluir evento | 204 |

## Testes

```bash
cd frontend
npx playwright test browser.spec.ts
```

**12 testes** cobrindo todas as funcionalidades:

| Teste | O que valida |
|-------|-------------|
| Carregar página e visão semanal | Renderização, header, cabeçalhos dos dias |
| Navegar entre semanas | Botões anterior/próximo |
| Botão Hoje | Saltar para data atual |
| Alternar visualização | Semana ↔ Mês |
| Abrir modal de criação | Clique no slot → modal |
| Criar evento | Fluxo completo: formulário → API → toast → render |
| Modal de detalhes | Clique no evento → visão detalhada |
| Excluir evento | Excluir → confirmar → toast |
| Criar via sidebar | Botão do sidebar abre modal |
| Eixo de horários | Labels de hora (08:00, 12:00) |
| Mini calendário | Renderização do calendário na sidebar |
| Notas rápidas | Seção de notas rápidas |

Os testes usam interceptação de rotas do Playwright para simular a API, rodando independente do Docker.

## Regras Atendidas

- ✅ 100% TypeScript 
- ✅ Apenas SvelteKit + TailwindCSS + DaisyUI (sem dependências extras)
- ✅ Estrutura de pastas padrão SvelteKit
- ✅ adapter-static para geração de site estático
- ✅ Todo código escrito em inglês
- ✅ `docker compose up` → app funcionando em localhost:5174
- ✅ `npx playwright test browser.spec.ts` → 12/12 passando

---

Desenvolvido por **Maicon B.** — [Targetweb.tech](https://targetweb.tech)
