// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0


import { Staking__factory } from '@subql/contract-sdk';
import {
  DelegationAddedEvent,
  DelegationRemovedEvent,
  UnbondWithdrawnEvent,
  SetCommissionRateEvent,
} from '@subql/contract-sdk/typechain/Staking';
import assert from 'assert';
import FrontierEthProvider from './ethProvider';
import { updateIndexerChallenges, updateDelegatorChallenges } from './utils';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';
import { STAKING_ADDRESS } from './constants';

export async function handleAddDelegation(
  event: FrontierEvmEvent<DelegationAddedEvent['args']>
): Promise<void> {
  logger.info('handleAddDelegation');
  assert(event.args, 'No event args');

  const { source, indexer } = event.args;
  if (source !== indexer) {
    await updateIndexerChallenges(
      indexer,
      'DELEGATOR_ATTRACTED',
      event.blockNumber,
      event.blockTimestamp
    );
  }
}

export async function handleRemoveDelegation(
  event: FrontierEvmEvent<DelegationRemovedEvent['args']>
): Promise<void> {
  logger.info('handleRemoveDelegation');
  assert(event.args, 'No event args');

  const { source: delegator, indexer } = event.args;

  await updateIndexerChallenges(
    indexer,
    'INDEXER_UNDELEGATED',
    event.blockNumber,
    event.blockTimestamp
  );
  await updateDelegatorChallenges(
    delegator,
    'UNDELEGATE_FROM_INDEXER',
    event.blockNumber,
    event.blockTimestamp
  );
}

export async function handleWithdrawClaimed(
  event: FrontierEvmEvent<UnbondWithdrawnEvent['args']>
): Promise<void> {
  logger.info('handleWithdrawClaimed');
  assert(event.args, 'No event args');

  const { source: delegator } = event.args;

  // FIXME: need to figure out how to get `indexer` address
  // await updateIndexerChallenges(
  //   withdrawl.indexer,
  //   'WITHDRAW_CLAIMED',
  //   event.blockNumber,
  //   event.blockTimestamp
  // );

  await updateDelegatorChallenges(
    delegator,
    'WITHDRAW_DELEGATION',
    event.blockNumber,
    event.blockTimestamp
  );
}

export async function handleSetCommissionRate(
  event: FrontierEvmEvent<SetCommissionRateEvent['args']>
): Promise<void> {
  logger.info('handleSetCommissionRate');
  assert(event.args, 'No event args');

  const { indexer } = event.args;
  const staking = Staking__factory.connect(STAKING_ADDRESS, new FrontierEthProvider());
  const commissionRates = await staking.commissionRates(indexer);
  const { valueAt, valueAfter } = commissionRates;

  if (valueAt !== valueAfter) {
    await updateIndexerChallenges(
      indexer,
      'CHANGE_COMMISSION',
      event.blockNumber,
      event.blockTimestamp
    );
  }
}
