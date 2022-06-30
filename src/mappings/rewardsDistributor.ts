// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { ClaimRewardsEvent } from '@subql/contract-sdk/typechain/RewardsDistributer';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';
import { updateDelegatorChallenges, updateIndexerChallenges } from './utils';

export async function handleRewardsClaimed(
  event: FrontierEvmEvent<ClaimRewardsEvent['args']>
): Promise<void> {
  logger.info('handleRewardsClaimed');
  assert(event.args, 'No event args');

  const { indexer, delegator } = event.args;

  if (indexer === delegator) {
    await updateIndexerChallenges(
      event.args.indexer,
      'CLAIM_REWARD',
      event.blockNumber,
      event.blockTimestamp
    );
  } else {
    await updateDelegatorChallenges(
      delegator,
      'CLAIM_REWARD',
      event.blockNumber,
      event.blockTimestamp
    );
  }
}
