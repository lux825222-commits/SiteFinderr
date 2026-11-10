# Sitefinderr

CRIE UM APLICATIVO SAAS CHAMADO SITEFINDER



Desenvolva uma plataforma profissional de prospecção comercial para encontrar empresas que precisam de um site profissional.



OBJETIVO DO APLICATIVO

O SiteFinder deve ajudar agências e profissionais de criação de sites a encontrar empresas cadastradas no Google Maps que:



Não possuem site cadastrado.

Possuem um site que está fora do ar.

Possuem um domínio que não funciona.

Possuem um site que apresenta erros de acesso.

Possuem um site que parece estar desatualizado.

O objetivo é transformar essas empresas em potenciais clientes para serviços de criação e reformulação de sites.



SISTEMA DE BUSCA

Crie um sistema de pesquisa com integração às APIs oficiais do Google Maps Platform (Places API).



O usuário poderá pesquisar por:



Cidade.

Estado.

Bairro.

CEP.

Segmento comercial.

Exemplos de segmentos:



Restaurantes.

Barbearias.

Salões de beleza.

Oficinas mecânicas.

Clínicas.

Dentistas.

Academias.

Lojas de roupas.

Imobiliárias.

Empresas de construção.

IDENTIFICADOR DE SITES

Após encontrar as empresas, o sistema deverá verificar o endereço de site disponibilizado publicamente.



Criar quatro classificações:



🟢 SITE FUNCIONANDO O site respondeu normalmente.



🔴 SITE FORA DO AR O endereço apresentou falha de acesso após novas tentativas de verificação.



🟡 SEM SITE A empresa não possui endereço de site cadastrado.



🟠 VERIFICAR Não foi possível confirmar o estado do site ou houve uma resposta inconclusiva.



IMPORTANTE: Não classificar automaticamente um site como desativado apenas por causa de um erro temporário. Fazer novas verificações e apresentar a data da última análise.



PAINEL DE RESULTADOS

Cada empresa encontrada deverá aparecer em um cartão contendo:



Nome da empresa.

Categoria.

Endereço.

Telefone público, quando disponível.

Link do Google Maps.

Endereço do site.

Situação do site.

Data da última verificação.

Adicionar botão para abrir o perfil da empresa no Google Maps.



FILTROS INTELIGENTES

Criar filtros para:



Todas as empresas.

Empresas sem site.

Sites fora do ar.

Sites funcionando.

Empresas que precisam de verificação.

Permitir ordenar por nome, categoria e data de verificação.



EXPORTAÇÃO DE LEADS

Permitir exportar os resultados em CSV e Excel.



Os dados devem incluir nome, categoria, cidade, telefone público, endereço, site e situação do site.



DESIGN E IDENTIDADE VISUAL

Quero uma interface moderna



Logo e favicon:

É a imagem que anexei nessa mensagem



Cores do site:



Roxo, preto e branco mesma paleta de cores da logo que enviei 





Menu lateral:



Dashboard.

Encontrar empresas.

Leads encontrados.

Favoritos.

Histórico de pesquisas.

Configurações.

DASHBOARD

Mostrar indicadores:



Total de empresas encontradas.

Empresas sem site.

Sites fora do ar.

Sites funcionando.

Leads salvos.

Criar gráficos com os resultados das pesquisas.



FUNCIONALIDADES IMPORTANTES

Busca por localização e segmento.

Paginação dos resultados.

Salvamento de leads.

Pesquisa de múltiplas categorias.

Histórico de pesquisas.

Interface responsiva para celular e computador.

Autenticação de usuários.

Banco de dados Supabase.

Proteção das chaves de API no backend.

TECNOLOGIAS

Utilizar:



React.

TypeScript.

Tailwind CSS.

Supabase.

Google Maps Places API.

Serviço de verificação HTTP de sites.

REGRAS DE DESENVOLVIMENTO

Não criar apenas uma demonstração visual.



Quero um aplicativo funcional, com integração real às APIs, banco de dados e resultados reais.



Não inventar empresas ou contatos.



Respeitar os limites de utilização, políticas de armazenamento e termos de uso do Google Maps Platform.



Se alguma integração depender de uma chave de API, criar uma tela explicando como configurá-la.



Desenvolver primeiro a estrutura completa e depois implementar as integrações.



O resultado deve parecer um SaaS comercial pronto para ser utilizado por uma agência de criação de sites.





SISTEMA DE LOGIN

Esse site deve ser acessado apenas para quem tiver o login e senha



Quero 300 logins acessíveis, dessa forma abaixo:



Login: @Cliente1

Senha: @Cliente1



Login: @Cliente2

Senha: @Cliente2



E por aí vai até chegar no



Login: @Cliente300

Senha: @Cliente300

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sitefinderr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b5397b5b-ce92-4896-8b00-ffb6b8e82cd5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
