# 📅 Calendário Full-Stack — Desafio Técnico

Uma aplicação de calendário robusta e interativa, inspirada no Google Calendar. Desenvolvida com foco em **experiência do usuário (UX)**, **código limpo** e **performance**.

## 🚀 Funcionalidades Principais

*   **Visualização Inteligente**: Alternância fluida entre visualizações de **Semana** e **Mês**.
*   **Drag & Drop**: Arraste e solte eventos para reagendar facilmente (dentro do dia ou entre dias).
*   **Auto-Scroll**: A visualização semanal foca automaticamente no horário atual.
*   **Gestão Completa**: Criação, edição e exclusão de eventos com modais intuitivos.
*   **Sidebar Interativa**: Mini-calendário para navegação rápida e filtros de categorias.
*   **Feedback Visual**: Notificações (toasts) para todas as ações do usuário.
*   **Responsividade**: Layout otimizado para desktop.

---

## 🛠 Tech Stack

Projeto construído utilizando tecnologias modernas e práticas de mercado:

| Camada | Tecnologia | Destaque |
| :--- | :--- | :--- |
| **Frontend** | **SvelteKit** | Framework full-stack de alta performance. |
| **Estilização** | **TailwindCSS** | Design system utilitário para UI consistente. |
| **Backend** | **.NET 8** | API REST robusta e escalável. |
| **Banco de Dados** | **MongoDB** | Flexibilidade para dados de eventos. |
| **Infraestrutura** | **Docker** | Orquestração de containers para ambiente dev/prod. |
| **QA / Testes** | **Playwright** | Testes End-to-End (E2E) automatizados. |

---

## 📦 Como Rodar o Projeto

### Opção 1: Docker (Recomendada)
A maneira mais simples de executar a aplicação completa (Frontend + Backend + Banco).

1.  **Extraia o projeto** (`unzip challenge.zip`).
2.  **Execute via Docker Compose**:
    ```bash
    docker compose up --build
    ```
3.  **Acesse**:
    *   **Frontend**: [http://localhost:5174](http://localhost:5174)
    *   **Swagger API**: [http://localhost:5204/swagger](http://localhost:5204/swagger)

### Opção 2: Execução Manual

<details>
<summary>Clique para ver instruções manuais</summary>

#### Backend
```bash
cd backend
dotnet restore
dotnet run
# API iniciará em http://localhost:5204
```
*Nota: Requer instância local do MongoDB ou ajuste na connection string.*

#### Frontend
```bash
cd frontend
npm install
npm run dev
# App iniciará em http://localhost:5174
```
</details>

---

## 🧪 Testes Automatizados

O projeto conta com uma suíte de testes E2E cobrindo os fluxos críticos.

```bash
cd frontend

# Instalar navegadores do Playwright (apenas primeira vez)
npx playwright install

# Rodar todos os testes
npx playwright test

# Rodar com navegador aberto (visual)
npx playwright test --headed
```

**Cobertura:**
✅ Renderização de Views | ✅ CRUD de Eventos | ✅ Drag & Drop | ✅ Navegação Temporal

---

Desenvolvido por **Maicon B.**
