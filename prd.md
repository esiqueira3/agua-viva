# PRD — Sistema de Gestão de Igrejas e Filiais

**Produto:** Água Viva — Sistema Web de Gestão Eclesiástica  
**Versão:** 1.0  
**Data:** Março de 2026  
**Público-alvo:** Líderes, pastores, secretários e administradores de igrejas e filiais

---

## 1. Visão Geral do Produto

O Água Viva é uma plataforma web responsiva voltada para a gestão administrativa e pastoral de igrejas e suas filiais. O sistema centraliza o controle de membros, departamentos, eventos, tarefas e comunicações internas, oferecendo uma experiência moderna, intuitiva e acessível para líderes e equipes de suporte.

### Objetivos principais
- Digitalizar e centralizar o cadastro de membros e departamentos
- Facilitar o planejamento e acompanhamento de eventos
- Oferecer visão gerencial através de dashboards e calendários
- Suportar múltiplas igrejas (matriz + filiais) em um único sistema

---

## 2. Personas

| Persona | Papel | Necessidades principais |
|---|---|---|
| Pastor / Líder geral | Administrador master | Visão total do sistema, aprovação de cadastros, relatórios |
| Secretário(a) | Usuário operacional | Cadastrar membros, lançar eventos, gerenciar departamentos |
| Líder de departamento | Usuário intermediário | Ver sua equipe, registrar atividades, tarefas |
| Membro comum | Usuário básico | Ver calendário, aniversariantes, eventos |

---

## 3. Requisitos de Design e Experiência

### Identidade Visual
- **Paleta:** Tons de azul profundo (#1A2B5E) como cor principal, branco como fundo, acentos em dourado suave (#C9A84C) para elementos premium. Cores funcionais para status e departamentos.
- **Tipografia:** Display moderna e limpa. Títulos em fonte bold com tracking generoso. Corpo em fonte legível com alto contraste.
- **Tom:** Profissional, acolhedor e organizado. Transmite confiança e cuidado.
- **Layout:** Menu lateral recolhível + área de conteúdo principal. Cards informativos no dashboard.
- **Responsividade:** Desktop-first, compatível com tablet.

### Cores por Departamento (usadas no calendário e cards)
| Departamento | Cor |
|---|---|
| Jovens | Azul (#3B82F6) |
| Infantil | Amarelo (#F59E0B) |
| Louvor | Roxo (#8B5CF6) |
| Intercessão | Rosa (#EC4899) |
| Geral / Outros | Verde (#10B981) |
| Administrativo | Cinza (#6B7280) |

### Cores de Status de Eventos
| Status | Indicador |
|---|---|
| Agendado | Farol azul 🔵 |
| Confirmado | Farol verde 🟢 |
| Cancelado | Farol vermelho 🔴 |
| Concluído | Ícone de check verde ✅ |

---

## 4. Arquitetura de Telas

```
├── Login (OTP / Passwordless)
├── Home (Dashboard)
├── Calendário
├── Cadastros
│   ├── Membros
│   ├── Departamentos
│   ├── Eventos
│   ├── Locais
│   └── Igrejas
└── Menu Lateral (navegação persistente)
```

---

## 5. Especificação Detalhada das Telas

---

### TELA 1 — Login

**Objetivo:** Autenticar o usuário de forma segura e sem senha tradicional.

**Fluxo:**
1. Usuário acessa o sistema e é direcionado à tela de login
2. Informa seu e-mail ou número de telefone cadastrado
3. Recebe um código OTP (6 dígitos) por e-mail ou SMS
4. Insere o código na tela e é redirecionado ao Home

**Componentes visuais:**
- Logo do sistema centralizada no topo
- Título: "Bem-vindo de volta"
- Subtítulo: "Informe seu e-mail ou telefone para receber seu código de acesso"
- Campo de input: E-mail ou telefone
- Botão primário: "Enviar código"
- Segunda etapa (após envio): Campo de 6 dígitos OTP (um campo por dígito)
- Link: "Reenviar código" (com contador regressivo de 60s)
- Botão: "Confirmar acesso"
- Rodapé: Nome do sistema + versão

**Estados:**
- Default (campo vazio)
- Loading (aguardando envio do código)
- OTP recebido (segunda etapa)
- Erro (código inválido ou expirado)
- Sucesso (animação de check + redirect)

---

### TELA 2 — Home (Dashboard)

**Objetivo:** Oferecer visão rápida e centralizada das informações mais relevantes do dia/mês.

**Layout:** Grid de cards responsivos, 2 a 3 colunas em desktop.

**Card 1 — Aniversariantes do Mês**
- Título: "🎂 Aniversariantes do Mês"
- Lista com: foto miniatura, nome do membro, data de aniversário
- Destaque visual para aniversariantes do dia (badge "Hoje")
- Scroll interno se lista for longa
- Botão: "Ver todos"

**Card 2 — Próximos Eventos**
- Título: "📅 Próximos Eventos"
- Lista com: nome do evento, data, hora, departamento responsável (com cor do departamento), status (farol colorido)
- Máximo 5 itens visíveis + "Ver todos"
- Clique no evento → abre modal de detalhes

**Card 3 — Departamentos e Liderados**
- Título: "👥 Departamentos"
- Cards internos por departamento com: nome, cor, nome do líder, quantidade de membros vinculados
- Clique → abre cadastro do departamento

**Card 4 — Calendário (mini)**
- Mini calendário mensal embutido no dashboard
- Dias com eventos marcados com ponto colorido (cor do departamento)
- Clique em um dia → abre modal para criar evento ou ver eventos do dia
- Botão: "Abrir calendário completo"

**Card 5 — Minhas Tarefas**
- Título: "✅ Minhas Tarefas"
- Lista de tarefas do usuário logado com: título, prazo, status (pendente / concluída)
- Checkbox para marcar como concluída inline
- Botão: "+ Nova tarefa"
- Filtros rápidos: Todas | Pendentes | Concluídas

---

### TELA 3 — Menu Lateral (Sidebar)

**Objetivo:** Navegação principal do sistema, presente em todas as telas autenticadas.

**Comportamento:**
- Expandido por padrão (com ícone + texto)
- Botão de recolher (ícone de seta ←) minimiza para apenas ícones
- Estado minimizado: tooltip no hover com o nome da opção
- Fixo na lateral esquerda (sticky)

**Itens do menu:**

| Ícone | Rótulo | Destino |
|---|---|---|
| 🏠 | Home | /home |
| 👤 | Cadastro de Usuários | /usuarios |
| 👥 | Membros | /membros |
| 🏛️ | Departamentos | /departamentos |
| 📅 | Eventos | /eventos |
| 📍 | Locais | /locais |
| ⛪ | Igrejas | /igrejas |
| 🗓️ | Calendário | /calendario |
| ✅ | Tarefas | /tarefas |

**Rodapé do menu:**
- Avatar + nome do usuário logado
- Ícone de configurações
- Botão de logout

---

### TELA 4 — Cadastro de Departamento

**Objetivo:** Registrar e gerenciar departamentos da igreja.

**Layout:** Formulário em abas horizontais.

---

**ABA 1 — Dados Básicos**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome do departamento | Texto | Sim |
| Descrição | Textarea | Não |
| Status | Toggle (Ativo / Inativo) | Sim |

---

**ABA 2 — Liderança**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Líder principal | Select com busca (membros cadastrados) | Sim |
| Vice-líder / auxiliar | Select com busca (membros cadastrados) | Não |
| Responsáveis adicionais | Select múltiplo com busca + lista de chips removíveis | Não |

Nota: O campo "Responsáveis adicionais" deve permitir adicionar múltiplas pessoas. Cada pessoa selecionada aparece como um chip/tag com botão de remoção (×).

---

**ABA 3 — Organização**

| Campo | Tipo | Obrigatório | Opções |
|---|---|---|---|
| Tipo de departamento | Select | Sim | Ministério, Grupo, Célula, Administrativo |
| Público-alvo | Select | Sim | Crianças, Jovens, Casais, Geral |

---

**Botões de ação (fixos no rodapé do formulário):**
- Salvar (primário)
- Cancelar (secundário)
- Excluir (terciário / destrutivo — visível apenas no modo de edição)

---

### TELA 5 — Cadastro de Membros

**Objetivo:** Registrar todas as informações de um membro da igreja.

**Layout:** Formulário em abas verticais ou horizontais. Header com foto do membro, nome e número de matrícula gerado automaticamente.

---

**ABA 1 — Dados Pessoais** *(Obrigatórios)*

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome completo | Texto | Sim |
| Data de nascimento | Date picker | Sim |
| Sexo | Radio (Masculino / Feminino) | Sim |
| Estado civil | Select | Sim |
| CPF | Texto com máscara | Sim |
| RG | Texto | Não |
| Nacionalidade | Texto | Sim |
| Naturalidade (cidade de nascimento) | Texto | Sim |

Estado civil — opções: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União estável

---

**ABA 2 — Contato**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Telefone principal (WhatsApp) | Texto com máscara | Sim |
| E-mail | E-mail | Não |
| Rua | Texto | Não |
| Número | Texto | Não |
| Bairro | Texto | Não |
| Cidade | Texto | Não |
| Estado | Select (UF) | Não |
| CEP | Texto com máscara + busca automática | Não |

Nota: Ao preencher o CEP, o sistema deve buscar automaticamente e preencher Rua, Bairro, Cidade e Estado.

---

**ABA 3 — Dados Eclesiásticos**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Data de conversão | Date picker | Não |
| Data de batismo | Date picker | Não |
| Local do batismo | Texto | Não |
| Tipo de membro | Select | Sim |
| Igreja de origem | Texto | Não |
| Data de entrada na igreja | Date picker | Não |
| Ministério / Departamento | Select (departamentos cadastrados) | Não |
| Cargo ou função | Select | Não |

Tipo de membro — opções: Membro, Congregado, Visitante  
Cargo ou função — opções: Líder, Diácono, Músico, Voluntário, Outro

---

**ABA 4 — Familiar**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome do cônjuge | Texto | Não |
| Filhos | Lista dinâmica: Nome + Idade. Botão "+ Adicionar filho" | Não |
| Responsável (se menor de idade) | Texto | Condicional |

Nota: O campo "Responsável" deve aparecer automaticamente quando a idade calculada pela data de nascimento for menor de 18 anos.

---

**ABA 5 — Informações Administrativas**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Número de matrícula | Texto (gerado automaticamente, read-only) | — |
| Observações gerais | Textarea | Não |
| Foto do membro | Upload de imagem com preview circular | Não |
| Status | Toggle (Ativo / Inativo) | Sim |

Nota: O número de matrícula deve ser gerado automaticamente pelo sistema no formato IGR-XXXXXX (ex: IGR-000142). Não editável pelo usuário.

---

**ABA 6 — Dados Opcionais**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Necessidades especiais | Textarea (descrição livre) | Não |

---

**Botões de ação:**
- Salvar (primário)
- Cancelar (secundário)
- Excluir (destrutivo — apenas no modo de edição)

---

### TELA 6 — Cadastro de Eventos

**Objetivo:** Registrar e gerenciar eventos da igreja.

**Layout:** Formulário com campos principais + abas para organização e participação.

---

**Campos principais (sempre visíveis):**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome | Texto | Sim |
| Data | Date picker | Sim |
| Hora | Time picker | Sim |
| Local | Select (locais cadastrados) | Sim |
| Status | Select com indicador visual (farol) | Sim |

Status — opções com indicadores:
- 🔵 Agendado
- 🟢 Confirmado
- 🔴 Cancelado
- ✅ Concluído

---

**ABA 1 — Organização**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Departamento responsável | Select (departamentos cadastrados) | Sim |
| Líder responsável | Select (preenchido automaticamente com o líder do departamento selecionado, editável) | Sim |
| Equipe envolvida | Select múltiplo com busca + chips removíveis | Não |

Nota: Ao selecionar um departamento, o campo "Líder responsável" deve ser preenchido automaticamente com o líder cadastrado naquele departamento, mas o usuário pode alterar se necessário.

---

**ABA 2 — Participação**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Limite de Participantes? | Toggle Sim / Não (default: Não) | Sim |
| Quantidade máxima | Número (visível apenas quando "Sim") | Condicional |
| Link de inscrição | URL | Não |
| Confirmação de Presença | Toggle (Habilitado / Desabilitado) | Não |

---

**Botões de ação:**
- Salvar (primário)
- Editar (secundário — ativo no modo visualização)
- Excluir (destrutivo — apenas no modo de edição)

---

### TELA 7 — Cadastro de Local

**Objetivo:** Gerenciar os locais utilizados nos eventos.

**Campos:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Código | Texto (gerado ou informado manualmente) | Sim |
| Descrição | Texto | Sim |
| Status | Toggle (Ativo / Inativo) | Sim |

**Botões de ação:**
- Salvar
- Cancelar
- Excluir (apenas no modo de edição)

---

### TELA 8 — Calendário

**Objetivo:** Visualizar todos os eventos da igreja de forma visual e interativa, com possibilidade de criar e gerenciar eventos diretamente no calendário.

**Biblioteca recomendada:** FullCalendar (React ou JS puro)

---

**Modos de visualização:**

| Modo | Descrição |
|---|---|
| 📅 Mês | Visão geral do mês. Eventos como blocos compactos. |
| 📆 Semana | Colunas = dias, linhas = horários. Eventos posicionados por horário. |
| 📍 Dia | Agenda detalhada por hora do dia. |

Seletor de modo: botões de alternância no topo direito da tela.

---

**Interações:**

| Ação | Resultado |
|---|---|
| Clique em dia vazio | Abre modal para criar novo evento |
| Clique em evento | Abre modal de detalhes do evento |
| Arrastar evento | Muda o horário/dia do evento |
| Redimensionar evento | Altera a duração do evento |
| Hover sobre evento | Exibe preview rápido (tooltip) com nome, hora e departamento |

---

**Card de evento (visual):**
Cada evento no calendário deve exibir:
- Nome do evento
- Horário de início
- Cor de fundo baseada no departamento responsável
- Ícone de status (opcional)

---

**Filtros no topo do calendário:**
- Por departamento (checkboxes com cores)
- Por status (Agendado, Confirmado, Cancelado, Concluído)
- Por Igreja / Filial

---

**Cores dos eventos (por departamento):**

| Departamento | Cor |
|---|---|
| Jovens | Azul (#3B82F6) |
| Infantil | Amarelo (#F59E0B) |
| Louvor | Roxo (#8B5CF6) |
| Intercessão | Rosa (#EC4899) |
| Geral | Verde (#10B981) |
| Administrativo | Cinza (#6B7280) |

---

**Modal de detalhes do evento (ao clicar):**
- Nome
- Data e hora
- Local
- Departamento responsável (com cor)
- Líder responsável
- Status (com farol)
- Botões: Editar | Excluir | Fechar

---

### TELA 9 — Cadastro de Igreja

**Objetivo:** Registrar a igreja matriz e suas filiais.

**Campos:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Código | Texto | Sim |
| Descrição | Texto (nome da igreja) | Sim |
| Filial | Toggle ou Select (Sim/Não ou vincular a uma igreja matriz) | Sim |
| Status | Toggle (Ativo / Inativo) | Sim |

Nota: Se "Filial" for marcado como Sim, deve aparecer um campo adicional "Igreja Matriz" (select com as igrejas cadastradas) para vincular a filial à sua sede.

**Botões de ação:**
- Salvar
- Cancelar
- Excluir (apenas no modo de edição)

---

## 6. Componentes Globais e Padrões de UI

### Tabelas de listagem (para todas as telas de cadastro)
Toda tela de cadastro deve ter uma tela de listagem correspondente com:
- Tabela com colunas relevantes
- Coluna de ações: Editar (ícone lápis) | Excluir (ícone lixeira)
- Campo de busca no topo
- Paginação
- Botão "+ Novo cadastro" no topo direito

### Modais de confirmação
Toda ação de exclusão deve exibir um modal de confirmação com:
- Ícone de alerta
- Mensagem: "Tem certeza que deseja excluir [nome]? Esta ação não pode ser desfeita."
- Botões: Cancelar (secundário) | Excluir (vermelho / destrutivo)

### Feedback de ações
- Sucesso: Toast notification verde no canto superior direito ("Salvo com sucesso!")
- Erro: Toast vermelho com descrição do erro
- Loading: Skeleton loading ou spinner centralizado

### Navegação por abas
- Abas horizontais no topo do formulário
- Aba ativa com indicador visual (sublinhado ou fundo colorido)
- Validação por aba: campos obrigatórios sinalizados antes de avançar

---

## 7. Fluxos Principais

### Fluxo 1 — Primeiro Acesso
Login OTP → Tela Home → Menu lateral expandido

### Fluxo 2 — Cadastrar um novo membro
Menu → Membros → "+ Novo membro" → Preencher abas → Salvar → Redirect para listagem com toast de sucesso

### Fluxo 3 — Criar evento pelo calendário
Calendário → Clicar em dia → Modal de criação → Preencher campos → Salvar → Evento aparece no calendário

### Fluxo 4 — Ver aniversariante e contactar
Home → Card de aniversariantes → Clicar no membro → Abre perfil resumido → Botão "Enviar mensagem (WhatsApp)"

---

## 8. Requisitos Não Funcionais

| Requisito | Descrição |
|---|---|
| Responsividade | Desktop e tablet (mínimo 768px) |
| Acessibilidade | Contraste mínimo WCAG AA, navegação por teclado |
| Performance | Carregamento inicial < 3s |
| Segurança | Autenticação OTP, sessão com expiração |
| Multi-igreja | Sistema deve suportar filtragem por igreja/filial em todos os módulos |

---

## 9. Prompt Sugerido para Google Stitch

Use o texto abaixo diretamente no Google Stitch para gerar as telas:

---

> **Prompt para Google Stitch:**
>
> Crie as telas de um sistema web de gestão eclesiástica chamado Água Viva. O sistema gerencia igrejas e suas filiais, com módulos para membros, departamentos, eventos e calendário.
>
> **Identidade visual:**
> - Paleta: azul profundo (#1A2B5E) como cor principal, branco no fundo, dourado (#C9A84C) para destaques
> - Tipografia moderna e profissional
> - Layout com menu lateral recolhível à esquerda
> - Cards no dashboard com informações resumidas
>
> **Telas a gerar:**
> 1. Login com OTP (campo de e-mail + campo de 6 dígitos)
> 2. Home/Dashboard com 5 cards: Aniversariantes do Mês, Próximos Eventos, Departamentos, Mini Calendário, Minhas Tarefas
> 3. Menu lateral com ícones e rótulos, botão de recolher, avatar do usuário no rodapé
> 4. Cadastro de Departamento com 3 abas: Dados Básicos, Liderança, Organização
> 5. Cadastro de Membros com 6 abas: Dados Pessoais, Contato, Dados Eclesiásticos, Familiar, Informações Administrativas, Dados Opcionais
> 6. Cadastro de Eventos com campos principais + 2 abas: Organização e Participação. Status com indicadores coloridos (farol)
> 7. Cadastro de Local (formulário simples: código, descrição, status)
> 8. Calendário interativo com modos Mês/Semana/Dia, eventos coloridos por departamento (Jovens=azul, Infantil=amarelo, Louvor=roxo, Geral=verde)
> 9. Cadastro de Igreja com campo de filial e vínculo com matriz
>
> O sistema deve ter visual profissional, organizado e acolhedor. Use ícones modernos e componentes bem definidos.

---

*Fim do PRD — Agua Viva v1.0*