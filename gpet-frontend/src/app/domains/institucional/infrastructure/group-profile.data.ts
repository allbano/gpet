import { GroupProfile } from '../domain/group-profile.model';

/** Dados estáticos do grupo (substituível por um repositório HTTP futuramente). */
export const GROUP_PROFILE: GroupProfile = {
  name: 'GPET',
  logoSrc: 'images/gpet-logo.jpg',
  logoAlt: 'Logotipo do grupo GPET',
  aboutTitle: 'Quem somos',
  about:
    'O GPET é um grupo de pesquisa vinculado ao Setor de Educação Profissional e Tecnológica (SEPT) da UFPR, ' +
    'que atua de forma integrada em ensino, pesquisa, extensão e produção de conhecimento.',
  photoSrc: null,
  photoAlt: 'Foto dos integrantes do grupo GPET',
};

