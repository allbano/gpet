import { MenuItem } from '../domain/menu-item.model';

/** Fonte de dados estática do menu principal (futuramente pode vir de uma API). */
export const MAIN_MENU: readonly MenuItem[] = [
  { label: 'Home', route: '/' },
  {
    label: 'Ensino',
    route: '/ensino',
    children: [
      { label: 'Cursos', route: '/ensino/cursos' },
      { label: 'Materiais', route: '/ensino/materiais' },
    ],
  },
  {
    label: 'Pesquisa',
    route: '/pesquisa',
    children: [
      { label: 'Projetos', route: '/pesquisa/projetos' },
      { label: 'Linhas de pesquisa', route: '/pesquisa/linhas' },
    ],
  },
  {
    label: 'Extensão',
    route: '/extensao',
    children: [
      { label: 'Projetos', route: '/extensao/projetos' },
      { label: 'Eventos', route: '/extensao/eventos' },
    ],
  },
  {
    label: 'Produção',
    route: '/producao',
    children: [
      { label: 'Publicações', route: '/producao/publicacoes' },
      { label: 'Produtos educacionais', route: '/producao/produtos' },
    ],
  },
  { label: 'Contato', route: '/contato' },
];
