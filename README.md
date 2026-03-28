# xoxoLAB

**Gestão colaborativa de mídias sociais**

xoxoLAB é uma aplicação web para equipes de comunicação e redes sociais organizarem pautas, aprovações, políticas editoriais e muito mais — sem depender de servidores próprios. Todos os dados são armazenados em um repositório GitHub privado no formato YAML.

🔗 **Demo:** [ombudsmanviktor.github.io/xoxolab](https://ombudsmanviktor.github.io/xoxolab/)

---

## Módulos

| Módulo | Descrição |
|---|---|
| **Quadro de Avisos** | Matriz Eisenhower para priorização de avisos por iminência e empenho |
| **Pautas** | Lista de pautas por seções com DnD, tags e datas |
| **Kanban** | Quadro de conteúdo com timeline, plataformas e log de auditoria |
| **Efemérides** | Calendário com recorrências, importação .ics e Google Calendar |
| **Políticas** | Wiki editorial com exportação em PDF, DOCX e Markdown |
| **Recursos** | Links úteis, documentação e templates de arquivos |
| **Equipe** | Visão consolidada de atribuições por colaborador |
| **Senhas** | Cofre de credenciais armazenadas no repositório privado |

---

## Como usar

1. Acesse a aplicação
2. Informe seu **email**, um **GitHub Personal Access Token** (PAT) com permissão `repo`, e o endereço do repositório onde os dados serão salvos (`proprietário/repositório`)
3. Crie ou acesse um projeto e convide colaboradores pelos seus emails

Os dados ficam inteiramente no seu repositório GitHub — a aplicação não tem backend próprio.

---

## Deploy próprio via Fork

Qualquer pessoa pode hospedar sua própria instância do xoxoLAB no GitHub Pages em menos de 5 minutos.

### Passo a passo

1. **Fork este repositório** — clique em *Fork* no canto superior direito desta página

2. **Habilite o GitHub Actions** no fork:
   - Acesse *Settings → Actions → General*
   - Selecione **Allow all actions and reusable workflows**
   - Clique em *Save*

3. **Configure o GitHub Pages**:
   - Acesse *Settings → Pages*
   - Em *Source*, selecione **Deploy from a branch**
   - Branch: `gh-pages` / Folder: `/ (root)`
   - Clique em *Save*

4. **Dispare o primeiro deploy**:
   - Acesse *Actions → Deploy to GitHub Pages*
   - Clique em *Run workflow → Run workflow*

5. Aguarde ~1 minuto. A aplicação estará disponível em:
   ```
   https://SEU_USUARIO.github.io/xoxolab/
   ```

### Domínio customizado (opcional)

Para usar um domínio próprio, crie um **secret** no repositório:
- *Settings → Secrets and variables → Actions → New repository secret*
- Nome: `CNAME`
- Valor: `seu.dominio.com`

Configure o DNS apontando para o GitHub Pages e o próximo deploy incluirá o CNAME automaticamente.

### Atualizações

Para receber atualizações do repositório original:
- *Sync fork → Update branch* (botão disponível na página principal do fork quando há commits novos)

O GitHub Actions fará o deploy automaticamente após cada sincronização.

---

## Stack técnica

- **React 19** + TypeScript + Vite
- **Tailwind CSS v4** + Radix UI + Lucide React
- **React Router v7** (HashRouter — compatível com GitHub Pages)
- **TanStack React Query v5**
- **GitHub REST API** como storage (arquivos YAML)
- **EmailJS** para notificações de @menções (opcional)

---

## Licença

MIT
