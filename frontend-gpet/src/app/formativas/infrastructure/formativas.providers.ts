import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { FormativasPrivateManagerFacade } from '../application/formativas-private-manager.facade';
import { FormativasPublicCatalogFacade } from '../application/formativas-public-catalog.facade';
import { ATIVIDADE_FORMATIVA_REPOSITORY } from '../domain/atividade-formativa-repository.port';
import { TIPO_ATIVIDADE_REPOSITORY } from '../domain/tipo-atividade-repository.port';
import { FormativasGatewayHttpAdapter } from './formativas-gateway-http.adapter';
import { TiposAtividadeGatewayHttpAdapter } from './tipos-atividade-gateway-http.adapter';

export function provideFormativasInfrastructure(): EnvironmentProviders {
  return makeEnvironmentProviders([
    FormativasGatewayHttpAdapter,
    TiposAtividadeGatewayHttpAdapter,
    { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useExisting: FormativasGatewayHttpAdapter },
    { provide: TIPO_ATIVIDADE_REPOSITORY, useExisting: TiposAtividadeGatewayHttpAdapter },
    FormativasPublicCatalogFacade,
    FormativasPrivateManagerFacade,
  ]);
}
