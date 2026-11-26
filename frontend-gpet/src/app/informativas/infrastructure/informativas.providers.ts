import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { InformativasPrivateManagerFacade } from '../application/informativas-private-manager.facade';
import { InformativasPublicCatalogFacade } from '../application/informativas-public-catalog.facade';
import { ATIVIDADE_INFORMATIVA_REPOSITORY } from '../domain/atividade-informativa-repository.port';
import { MODALIDADE_REPOSITORY } from '../domain/modalidade-repository.port';
import { InformativasGatewayHttpAdapter } from './informativas-gateway-http.adapter';
import { ModalidadesGatewayHttpAdapter } from './modalidades-gateway-http.adapter';

export function provideInformativasInfrastructure(): EnvironmentProviders {
  return makeEnvironmentProviders([
    InformativasGatewayHttpAdapter,
    ModalidadesGatewayHttpAdapter,
    { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useExisting: InformativasGatewayHttpAdapter },
    { provide: MODALIDADE_REPOSITORY, useExisting: ModalidadesGatewayHttpAdapter },
    InformativasPublicCatalogFacade,
    InformativasPrivateManagerFacade,
  ]);
}
