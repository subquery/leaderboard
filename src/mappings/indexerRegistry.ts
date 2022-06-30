// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';
import { UnregisterIndexerEvent } from '@subql/contract-sdk/typechain/IndexerRegistry';
import assert from 'assert';
import { updateIndexerChallenges } from './utils';

export async function handleUnregisterIndexer(
  event: FrontierEvmEvent<UnregisterIndexerEvent['args']>
): Promise<void> {
  logger.info('handleUnregisterIndexer');
  assert(event.args, 'No event args');

  const { indexer } = event.args;

  await updateIndexerChallenges(
    indexer,
    'UNREGISTER_INDEXER',
    event.blockNumber,
    event.blockTimestamp
  );
}
