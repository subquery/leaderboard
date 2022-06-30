// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { ServiceAgreementCreatedEvent } from '@subql/contract-sdk/typechain/ServiceAgreementRegistry';
import { updateIndexerChallenges } from './utils';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';

export async function handleServiceAgreementCreated(
  event: FrontierEvmEvent<ServiceAgreementCreatedEvent['args']>
): Promise<void> {
  logger.info('handleServiceAgreementCreated');
  assert(event.args, 'No event args');

  await updateIndexerChallenges(
    event.args.indexer,
    'SERVICE_AGREEMENT_CREATED',
    event.blockNumber,
    event.blockTimestamp
  );
}
